import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const washAssessmentSchema = z.object({
  siteId: z.string(),
  assessmentDate: z.string(),
  waterSources: z.array(z.object({
    sourceType: z.enum(['BOREHOLE', 'WELL', 'SPRING', 'SURFACE_WATER', 'TRUCKED_WATER']),
    capacity: z.number(),
    quality: z.enum(['SAFE', 'NEEDS_TREATMENT', 'UNSAFE']),
    distance: z.number(),
    functional: z.boolean()
  })),
  sanitationFacilities: z.array(z.object({
    facilityType: z.enum(['LATRINE', 'TOILET', 'SHOWER', 'WASTE_DISPOSAL']),
    quantity: z.number(),
    condition: z.enum(['GOOD', 'NEEDS_REPAIR', 'NON_FUNCTIONAL']),
    genderSeparated: z.boolean(),
    accessible: z.boolean()
  })),
  hygieneSupplies: z.array(z.object({
    itemType: z.string(),
    quantityAvailable: z.number(),
    quantityNeeded: z.number(),
    lastDistribution: z.string().optional()
  })),
  waterTestResults: z.object({
    ecoli: z.number().optional(),
    ph: z.number().optional(),
    turbidity: z.number().optional(),
    chlorine: z.number().optional(),
    testDate: z.string().optional()
  }).optional(),
  recommendations: z.array(z.string()),
  assessorName: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  notes: z.string().optional()
})

// GET /api/wash/assessments
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const priority = searchParams.get('priority')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (siteId) {
      where.siteId = siteId
    }
    
    if (priority) {
      where.priority = priority
    }
    
    if (startDate || endDate) {
      where.assessmentDate = {}
      if (startDate) {
        where.assessmentDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.assessmentDate.lte = new Date(endDate)
      }
    }

    const [assessments, total] = await Promise.all([
      prisma.washAssessment.findMany({
        where,
        skip,
        take: limit,
        include: {
          site: {
            select: {
              id: true,
              siteName: true,
              siteType: true,
              population: true
            }
          }
        },
        orderBy: {
          assessmentDate: 'desc'
        }
      }),
      prisma.washAssessment.count({ where })
    ])

    // Calculate statistics
    const stats = await prisma.washAssessment.groupBy({
      by: ['priority'],
      where: {
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      data: assessments,
      statistics: {
        byPriority: stats,
        totalAssessments: total
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching WASH assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/wash/assessments
export async function POST(request: NextRequest) {
  try {
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
    const validation = washAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify site exists
    const site = await prisma.idpSite.findUnique({
      where: { id: data.siteId }
    })
    
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Create assessment
    const assessment = await prisma.washAssessment.create({
      data: {
        siteId: data.siteId,
        assessmentDate: new Date(data.assessmentDate),
        assessorName: data.assessorName,
        priority: data.priority,
        notes: data.notes,
        waterSources: JSON.stringify(data.waterSources),
        sanitationFacilities: JSON.stringify(data.sanitationFacilities),
        hygieneSupplies: JSON.stringify(data.hygieneSupplies),
        waterTestResults: data.waterTestResults ? JSON.stringify(data.waterTestResults) : null,
        recommendations: JSON.stringify(data.recommendations)
      },
      include: {
        site: true
      }
    })

    // Create alerts for critical issues
    if (data.priority === 'CRITICAL') {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'WASH_CRITICAL',
          title: 'Critical WASH Assessment',
          message: `Critical WASH issues identified at ${site.siteName}`,
          data: JSON.stringify({
            assessmentId: assessment.id,
            siteId: site.id,
            priority: data.priority
          })
        }
      })
    }

    // Check water quality issues
    if (data.waterTestResults) {
      const issues = []
      if (data.waterTestResults.ecoli && data.waterTestResults.ecoli > 0) {
        issues.push('E.coli contamination detected')
      }
      if (data.waterTestResults.ph && (data.waterTestResults.ph < 6.5 || data.waterTestResults.ph > 8.5)) {
        issues.push('pH levels outside safe range')
      }
      if (data.waterTestResults.turbidity && data.waterTestResults.turbidity > 5) {
        issues.push('High turbidity levels')
      }

      if (issues.length > 0) {
        await prisma.notification.create({
          data: {
            userId: decoded.userId,
            type: 'WATER_QUALITY_ALERT',
            title: 'Water Quality Issues',
            message: `Water quality issues at ${site.siteName}: ${issues.join(', ')}`,
            data: JSON.stringify({
              assessmentId: assessment.id,
              siteId: site.id,
              issues
            })
          }
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_WASH_ASSESSMENT',
        entity: 'WashAssessment',
        entityId: assessment.id,
        metadata: JSON.stringify({
          siteCode: site.siteCode,
          siteName: site.siteName,
          priority: data.priority,
          waterSources: data.waterSources.length,
          sanitationFacilities: data.sanitationFacilities.length
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: assessment,
      message: `WASH assessment completed for ${site.siteName}`
    })
  } catch (error) {
    console.error('Error creating WASH assessment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}