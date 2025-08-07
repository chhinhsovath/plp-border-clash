import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const nutritionAssessmentSchema = z.object({
  individualId: z.string(),
  assessmentDate: z.string(),
  ageAtAssessment: z.number(),
  weight: z.number(),
  height: z.number(),
  muac: z.number(),
  edema: z.boolean().optional(),
  nutritionStatus: z.enum(['NORMAL', 'MAM', 'SAM', 'AT_RISK']),
  zScores: z.object({
    weightForAge: z.string().optional(),
    heightForAge: z.string().optional(),
    weightForHeight: z.string().optional()
  }).optional(),
  appetiteTest: z.string().optional(),
  medicalComplications: z.boolean().optional(),
  complicationDetails: z.string().optional(),
  referralNeeded: z.boolean().optional(),
  referralType: z.string().optional(),
  assessorName: z.string(),
  notes: z.string().optional()
})

// GET /api/nutrition/assessments
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
    const nutritionStatus = searchParams.get('nutritionStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (individualId) {
      where.individualId = individualId
    }
    
    if (nutritionStatus) {
      where.nutritionStatus = nutritionStatus
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

    // Fetch assessments
    const [assessments, total] = await Promise.all([
      prisma.nutritionAssessment.findMany({
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
              householdId: true
            }
          }
        },
        orderBy: {
          assessmentDate: 'desc'
        }
      }),
      prisma.nutritionAssessment.count({ where })
    ])

    // Get statistics
    const stats = await prisma.nutritionAssessment.groupBy({
      by: ['nutritionStatus'],
      _count: {
        id: true
      },
      where: {
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      }
    })

    // Calculate trends
    const samCases = await prisma.nutritionAssessment.count({
      where: {
        nutritionStatus: 'SAM',
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      }
    })

    const mamCases = await prisma.nutritionAssessment.count({
      where: {
        nutritionStatus: 'MAM',
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: assessments,
      statistics: {
        byStatus: stats,
        samCasesLastMonth: samCases,
        mamCasesLastMonth: mamCases,
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
    console.error('Error fetching nutrition assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/nutrition/assessments
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
    const validation = nutritionAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify individual exists and is a child
    const individual = await prisma.individual.findUnique({
      where: { id: data.individualId }
    })
    
    if (!individual) {
      return NextResponse.json(
        { error: 'Individual not found' },
        { status: 404 }
      )
    }
    
    if (individual.age > 5 && data.nutritionStatus !== 'NORMAL') {
      // Log warning for malnutrition in children over 5
      console.warn(`Malnutrition detected in child over 5: ${individual.individualCode}`)
    }
    
    // Create assessment
    const assessment = await prisma.nutritionAssessment.create({
      data: {
        individualId: data.individualId,
        assessmentDate: new Date(data.assessmentDate),
        ageAtAssessment: data.ageAtAssessment,
        weight: data.weight,
        height: data.height,
        muacScore: data.muac,
        nutritionStatus: data.nutritionStatus
      },
      include: {
        individual: true
      }
    })
    
    // Update individual's nutrition status if SAM or MAM
    if (data.nutritionStatus === 'SAM' || data.nutritionStatus === 'MAM') {
      // Create alert/notification
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'NUTRITION_ALERT',
          title: `${data.nutritionStatus} Case Detected`,
          message: `${individual.fullLegalName} (${individual.individualCode}) diagnosed with ${data.nutritionStatus}`,
          data: JSON.stringify({
            assessmentId: assessment.id,
            individualId: individual.id,
            nutritionStatus: data.nutritionStatus,
            referralNeeded: data.referralNeeded,
            referralType: data.referralType
          })
        }
      })
      
      // If referral needed, create referral record
      if (data.referralNeeded && data.referralType) {
        await prisma.nutritionReferral.create({
          data: {
            assessmentId: assessment.id,
            individualId: data.individualId,
            referralType: data.referralType,
            referralDate: new Date(),
            status: 'PENDING',
            notes: data.complicationDetails
          }
        })
      }
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_NUTRITION_ASSESSMENT',
        entity: 'NutritionAssessment',
        entityId: assessment.id,
        metadata: JSON.stringify({
          individualCode: individual.individualCode,
          nutritionStatus: data.nutritionStatus,
          muac: data.muac,
          weight: data.weight,
          height: data.height
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: assessment,
      message: `Nutrition assessment completed. Status: ${data.nutritionStatus}`
    })
  } catch (error) {
    console.error('Error creating nutrition assessment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/nutrition/assessments/statistics
export async function getStatistics(request: NextRequest) {
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

    // Get comprehensive nutrition statistics
    const [
      totalScreened,
      samCases,
      mamCases,
      atRiskCases,
      recoveredCases,
      ageDistribution,
      genderDistribution,
      trendsLastSixMonths
    ] = await Promise.all([
      // Total children screened
      prisma.nutritionAssessment.groupBy({
        by: ['individualId'],
        _count: true
      }).then(groups => groups.length),
      
      // Current SAM cases
      prisma.nutritionAssessment.findMany({
        where: {
          nutritionStatus: 'SAM',
          assessmentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        distinct: ['individualId']
      }).then(cases => cases.length),
      
      // Current MAM cases
      prisma.nutritionAssessment.findMany({
        where: {
          nutritionStatus: 'MAM',
          assessmentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        distinct: ['individualId']
      }).then(cases => cases.length),
      
      // At risk cases
      prisma.nutritionAssessment.findMany({
        where: {
          nutritionStatus: 'AT_RISK',
          assessmentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        distinct: ['individualId']
      }).then(cases => cases.length),
      
      // Recovered cases (improved from SAM/MAM to better status)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT n1.individualId) as recovered
        FROM NutritionAssessment n1
        JOIN NutritionAssessment n2 ON n1.individualId = n2.individualId
        WHERE n1.nutritionStatus IN ('SAM', 'MAM')
        AND n2.nutritionStatus IN ('NORMAL', 'AT_RISK')
        AND n2.assessmentDate > n1.assessmentDate
        AND n2.assessmentDate >= datetime('now', '-30 days')
      `.then((result: any) => result[0]?.recovered || 0),
      
      // Age distribution of malnourished children
      prisma.nutritionAssessment.groupBy({
        by: ['ageAtAssessment'],
        where: {
          nutritionStatus: {
            in: ['SAM', 'MAM']
          },
          assessmentDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
          }
        },
        _count: true
      }),
      
      // Gender distribution
      prisma.$queryRaw`
        SELECT i.gender, COUNT(DISTINCT n.individualId) as count
        FROM NutritionAssessment n
        JOIN Individual i ON n.individualId = i.id
        WHERE n.nutritionStatus IN ('SAM', 'MAM')
        AND n.assessmentDate >= datetime('now', '-30 days')
        GROUP BY i.gender
      `,
      
      // Trends over last 6 months
      prisma.$queryRaw`
        SELECT 
          strftime('%Y-%m', assessmentDate) as month,
          nutritionStatus,
          COUNT(*) as count
        FROM NutritionAssessment
        WHERE assessmentDate >= datetime('now', '-6 months')
        GROUP BY month, nutritionStatus
        ORDER BY month DESC
      `
    ])

    // Calculate key indicators
    const cureRate = recoveredCases > 0 && (samCases + mamCases) > 0 
      ? Math.round((recoveredCases / (samCases + mamCases + recoveredCases)) * 100)
      : 0

    const defaulterRate = 0 // Would need follow-up tracking to calculate
    
    const statistics = {
      overview: {
        totalScreened,
        activeCases: {
          sam: samCases,
          mam: mamCases,
          atRisk: atRiskCases,
          total: samCases + mamCases
        },
        recovered: recoveredCases,
        cureRate: `${cureRate}%`
      },
      demographics: {
        ageDistribution,
        genderDistribution
      },
      trends: trendsLastSixMonths,
      alerts: []
    }
    
    // Add alerts if thresholds exceeded
    if (samCases > 5) {
      statistics.alerts.push({
        type: 'CRITICAL',
        message: `High SAM prevalence: ${samCases} active cases`,
        action: 'Immediate therapeutic feeding program scale-up required'
      })
    }
    
    if (mamCases > 10) {
      statistics.alerts.push({
        type: 'WARNING',
        message: `Elevated MAM cases: ${mamCases} active cases`,
        action: 'Expand supplementary feeding program'
      })
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching nutrition statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}