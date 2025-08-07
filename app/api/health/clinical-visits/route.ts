import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const clinicalVisitSchema = z.object({
  individualId: z.string(),
  visitDate: z.string(), // Will be converted to Date
  symptoms: z.string().min(1),
  diagnosis: z.string().min(1), // ICD-10 code
  diagnosisDesc: z.string().optional(),
  treatmentPlan: z.string().min(1),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string()
  })).optional(),
  clinicianName: z.string().min(1),
  followUpDate: z.string().optional(),
})

// GET /api/health/clinical-visits
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    try {
      jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const individualId = searchParams.get('individualId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const diagnosis = searchParams.get('diagnosis')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (individualId) {
      where.individualId = individualId
    }
    
    if (diagnosis) {
      where.diagnosis = {
        contains: diagnosis
      }
    }
    
    if (startDate || endDate) {
      where.visitDate = {}
      if (startDate) {
        where.visitDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.visitDate.lte = new Date(endDate)
      }
    }

    // Fetch clinical visits
    const [visits, total] = await Promise.all([
      prisma.clinicalVisit.findMany({
        where,
        skip,
        take: limit,
        include: {
          individual: {
            select: {
              id: true,
              individualCode: true,
              fullLegalName: true,
              age: true,
              gender: true,
              chronicallyIll: true,
              illnessDetails: true
            }
          }
        },
        orderBy: {
          visitDate: 'desc'
        }
      }),
      prisma.clinicalVisit.count({ where })
    ])

    // Get common diagnoses statistics
    const commonDiagnoses = await prisma.clinicalVisit.groupBy({
      by: ['diagnosis', 'diagnosisDesc'],
      _count: {
        id: true
      },
      where: {
        visitDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      data: visits,
      statistics: {
        commonDiagnoses,
        totalVisitsLastMonth: await prisma.clinicalVisit.count({
          where: {
            visitDate: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
            }
          }
        })
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching clinical visits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/health/clinical-visits
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: any
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const validation = clinicalVisitSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify individual exists
    const individual = await prisma.individual.findUnique({
      where: { id: data.individualId },
      include: {
        medicalRecords: true
      }
    })
    
    if (!individual) {
      return NextResponse.json(
        { error: 'Individual not found' },
        { status: 404 }
      )
    }
    
    // Create or get medical record
    let medicalRecord = individual.medicalRecords[0]
    
    if (!medicalRecord) {
      medicalRecord = await prisma.medicalRecord.create({
        data: {
          individualId: data.individualId,
          chronicConditions: JSON.stringify([]),
          knownAllergies: JSON.stringify([])
        }
      })
    }
    
    // Create clinical visit
    const visit = await prisma.clinicalVisit.create({
      data: {
        individualId: data.individualId,
        visitDate: new Date(data.visitDate),
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        diagnosisDesc: data.diagnosisDesc,
        treatmentPlan: data.treatmentPlan,
        medications: data.medications ? JSON.stringify(data.medications) : null,
        clinicianName: data.clinicianName,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
      include: {
        individual: {
          select: {
            id: true,
            individualCode: true,
            fullLegalName: true,
            age: true,
            gender: true
          }
        }
      }
    })
    
    // Check if this is a chronic condition and update individual record
    const chronicDiagnoses = ['E11', 'I10', 'J44', 'J45'] // Common chronic ICD-10 codes
    if (chronicDiagnoses.some(code => data.diagnosis.startsWith(code))) {
      await prisma.individual.update({
        where: { id: data.individualId },
        data: {
          chronicallyIll: true,
          illnessDetails: data.diagnosisDesc || data.diagnosis
        }
      })
      
      // Update medical record with chronic condition
      const currentConditions = JSON.parse(medicalRecord.chronicConditions || '[]')
      if (!currentConditions.includes(data.diagnosisDesc || data.diagnosis)) {
        currentConditions.push(data.diagnosisDesc || data.diagnosis)
        await prisma.medicalRecord.update({
          where: { id: medicalRecord.id },
          data: {
            chronicConditions: JSON.stringify(currentConditions)
          }
        })
      }
    }
    
    // Create notification for follow-up if scheduled
    if (data.followUpDate) {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'HEALTH_FOLLOWUP',
          title: 'Clinical Follow-up Scheduled',
          message: `Follow-up scheduled for ${individual.fullLegalName} on ${new Date(data.followUpDate).toLocaleDateString()}`,
          data: JSON.stringify({
            visitId: visit.id,
            individualId: individual.id,
            followUpDate: data.followUpDate
          })
        }
      })
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_CLINICAL_VISIT',
        entity: 'ClinicalVisit',
        entityId: visit.id,
        metadata: JSON.stringify({
          individualCode: individual.individualCode,
          diagnosis: data.diagnosis,
          clinician: data.clinicianName
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: visit,
      message: 'Clinical visit recorded successfully'
    })
  } catch (error) {
    console.error('Error creating clinical visit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}