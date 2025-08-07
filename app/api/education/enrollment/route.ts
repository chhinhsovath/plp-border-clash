import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const educationEnrollmentSchema = z.object({
  individualId: z.string(),
  academicYear: z.string(),
  enrollmentStatus: z.enum(['ENROLLED', 'NOT_ENROLLED', 'DROPPED_OUT', 'GRADUATED']),
  learningSpaceId: z.string().nullable().optional(),
  grade: z.string().optional(),
  lastGradeCompleted: z.string().optional(),
  previousSchool: z.string().optional(),
  nonEnrollmentReason: z.enum([
    'CHILD_LABOR',
    'CARETAKER_DUTIES', 
    'FEAR_SAFETY',
    'NO_SPACE',
    'DISABILITY',
    'PARENT_RELUCTANCE',
    'DISTANCE',
    'NO_DOCUMENTATION',
    'LANGUAGE_BARRIER',
    'ECONOMIC_HARDSHIP',
    'HEALTH_ISSUES',
    'EARLY_MARRIAGE'
  ]).nullable().optional(),
  additionalReasons: z.string().optional(),
  supportNeeded: z.array(z.string()).optional(),
  transportProvided: z.boolean().optional(),
  mealsProvided: z.boolean().optional(),
  uniformProvided: z.boolean().optional(),
  suppliesProvided: z.boolean().optional(),
  guardianConsent: z.boolean().optional(),
  enrollmentDate: z.string().optional(),
  notes: z.string().optional()
})

// GET /api/education/enrollment
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
    const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString()
    const enrollmentStatus = searchParams.get('enrollmentStatus')
    const learningSpaceId = searchParams.get('learningSpaceId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      academicYear
    }
    
    if (individualId) {
      where.individualId = individualId
    }
    
    if (enrollmentStatus) {
      where.enrollmentStatus = enrollmentStatus
    }
    
    if (learningSpaceId) {
      where.learningSpaceId = learningSpaceId
    }

    // Fetch enrollments
    const [enrollments, total] = await Promise.all([
      prisma.educationStatus.findMany({
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
          createdAt: 'desc'
        }
      }),
      prisma.educationStatus.count({ where })
    ])

    // Get enrollment statistics
    const stats = await prisma.educationStatus.groupBy({
      by: ['enrollmentStatus'],
      where: {
        academicYear
      },
      _count: {
        id: true
      }
    })

    // Get non-enrollment reasons breakdown
    const nonEnrollmentReasons = await prisma.educationStatus.groupBy({
      by: ['nonEnrollmentReason'],
      where: {
        academicYear,
        enrollmentStatus: 'NOT_ENROLLED',
        nonEnrollmentReason: {
          not: null
        }
      },
      _count: {
        id: true
      }
    })

    // Calculate enrollment rate
    const schoolAgeChildren = await prisma.individual.count({
      where: {
        age: {
          gte: 5,
          lte: 17
        }
      }
    })

    const enrolledChildren = await prisma.educationStatus.count({
      where: {
        academicYear,
        enrollmentStatus: 'ENROLLED'
      }
    })

    const enrollmentRate = schoolAgeChildren > 0 
      ? Math.round((enrolledChildren / schoolAgeChildren) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: enrollments,
      statistics: {
        byStatus: stats,
        nonEnrollmentReasons,
        enrollmentRate: `${enrollmentRate}%`,
        totalSchoolAge: schoolAgeChildren,
        totalEnrolled: enrolledChildren
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching education enrollments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/education/enrollment
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
    const validation = educationEnrollmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify individual exists and is school age
    const individual = await prisma.individual.findUnique({
      where: { id: data.individualId }
    })
    
    if (!individual) {
      return NextResponse.json(
        { error: 'Individual not found' },
        { status: 404 }
      )
    }
    
    if (individual.age < 5 || individual.age > 17) {
      console.warn(`Enrollment for non-school age individual: ${individual.individualCode}, age: ${individual.age}`)
    }
    
    // Check for existing enrollment in same academic year
    const existingEnrollment = await prisma.educationStatus.findFirst({
      where: {
        individualId: data.individualId,
        academicYear: data.academicYear
      }
    })
    
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Individual already has enrollment record for this academic year' },
        { status: 400 }
      )
    }
    
    // Verify learning space if enrolled
    if (data.enrollmentStatus === 'ENROLLED' && data.learningSpaceId) {
      const learningSpace = await prisma.learningSpace.findUnique({
        where: { id: data.learningSpaceId }
      })
      
      if (!learningSpace) {
        return NextResponse.json(
          { error: 'Learning space not found' },
          { status: 404 }
        )
      }
      
      // Check capacity
      const currentEnrollment = await prisma.educationStatus.count({
        where: {
          learningSpaceId: data.learningSpaceId,
          academicYear: data.academicYear,
          enrollmentStatus: 'ENROLLED'
        }
      })
      
      if (currentEnrollment >= learningSpace.capacity) {
        console.warn(`Learning space ${learningSpace.name} at or over capacity`)
      }
    }
    
    // Create enrollment record
    const enrollment = await prisma.educationStatus.create({
      data: {
        individualId: data.individualId,
        academicYear: data.academicYear,
        enrollmentStatus: data.enrollmentStatus,
        learningSpaceId: data.learningSpaceId,
        lastGradeCompleted: data.lastGradeCompleted,
        nonEnrollmentReason: data.nonEnrollmentReason
      },
      include: {
        individual: true
      }
    })
    
    // Create education details record if enrolled
    if (data.enrollmentStatus === 'ENROLLED') {
      await prisma.educationDetails.create({
        data: {
          enrollmentId: enrollment.id,
          grade: data.grade || '',
          previousSchool: data.previousSchool,
          transportProvided: data.transportProvided || false,
          mealsProvided: data.mealsProvided || false,
          uniformProvided: data.uniformProvided || false,
          suppliesProvided: data.suppliesProvided || false,
          guardianConsent: data.guardianConsent || false,
          supportNeeded: data.supportNeeded ? JSON.stringify(data.supportNeeded) : null,
          enrollmentDate: data.enrollmentDate ? new Date(data.enrollmentDate) : new Date(),
          notes: data.notes
        }
      })
      
      // Create learning progress record
      await prisma.learningProgress.create({
        data: {
          individualId: data.individualId,
          academicYear: data.academicYear,
          currentGrade: data.grade,
          enrollmentStatus: 'ACTIVE',
          attendanceRate: 0,
          lastActiveDate: new Date()
        }
      })
    }
    
    // Handle non-enrollment alerts
    if (data.enrollmentStatus === 'NOT_ENROLLED' && data.nonEnrollmentReason) {
      const highPriorityReasons = [
        'CHILD_LABOR',
        'CARETAKER_DUTIES',
        'FEAR_SAFETY',
        'DISABILITY',
        'HEALTH_ISSUES',
        'EARLY_MARRIAGE'
      ]
      
      if (highPriorityReasons.includes(data.nonEnrollmentReason)) {
        // Create alert for protection/education teams
        await prisma.notification.create({
          data: {
            userId: decoded.userId,
            type: 'EDUCATION_ALERT',
            title: 'High Priority Non-Enrollment Case',
            message: `${individual.fullLegalName} (${individual.individualCode}) not enrolled due to ${data.nonEnrollmentReason}`,
            data: JSON.stringify({
              enrollmentId: enrollment.id,
              individualId: individual.id,
              reason: data.nonEnrollmentReason,
              additionalReasons: data.additionalReasons
            })
          }
        })
        
        // Create protection referral if needed
        if (['CHILD_LABOR', 'EARLY_MARRIAGE', 'FEAR_SAFETY'].includes(data.nonEnrollmentReason)) {
          await prisma.protectionReferral.create({
            data: {
              individualId: data.individualId,
              referralType: 'CHILD_PROTECTION',
              reason: `Education: ${data.nonEnrollmentReason}`,
              referralDate: new Date(),
              status: 'PENDING',
              priority: 'HIGH'
            }
          })
        }
      }
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: data.enrollmentStatus === 'ENROLLED' ? 'ENROLL_CHILD' : 'RECORD_NON_ENROLLMENT',
        entity: 'EducationStatus',
        entityId: enrollment.id,
        metadata: JSON.stringify({
          individualCode: individual.individualCode,
          academicYear: data.academicYear,
          enrollmentStatus: data.enrollmentStatus,
          grade: data.grade,
          reason: data.nonEnrollmentReason
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: enrollment,
      message: data.enrollmentStatus === 'ENROLLED' 
        ? `${individual.fullLegalName} successfully enrolled`
        : `Non-enrollment recorded for ${individual.fullLegalName}`
    })
  } catch (error) {
    console.error('Error creating education enrollment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/education/enrollment/statistics
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

    const academicYear = new Date().getFullYear().toString()

    // Get comprehensive education statistics
    const [
      totalSchoolAge,
      enrolledByGender,
      enrolledByAge,
      enrollmentByGrade,
      nonEnrollmentReasons,
      dropoutRate,
      attendanceRate,
      learningSpaceUtilization
    ] = await Promise.all([
      // Total school-age children (5-17)
      prisma.individual.count({
        where: {
          age: {
            gte: 5,
            lte: 17
          }
        }
      }),
      
      // Enrolled by gender
      prisma.$queryRaw`
        SELECT i.gender, COUNT(*) as count
        FROM EducationStatus e
        JOIN Individual i ON e.individualId = i.id
        WHERE e.academicYear = ${academicYear}
        AND e.enrollmentStatus = 'ENROLLED'
        GROUP BY i.gender
      `,
      
      // Enrolled by age group
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN i.age BETWEEN 5 AND 6 THEN '5-6 (Early Childhood)'
            WHEN i.age BETWEEN 7 AND 11 THEN '7-11 (Primary)'
            WHEN i.age BETWEEN 12 AND 14 THEN '12-14 (Lower Secondary)'
            WHEN i.age BETWEEN 15 AND 17 THEN '15-17 (Upper Secondary)'
            ELSE 'Other'
          END as ageGroup,
          COUNT(*) as count
        FROM EducationStatus e
        JOIN Individual i ON e.individualId = i.id
        WHERE e.academicYear = ${academicYear}
        AND e.enrollmentStatus = 'ENROLLED'
        GROUP BY ageGroup
      `,
      
      // Enrollment by grade
      prisma.$queryRaw`
        SELECT ed.grade, COUNT(*) as count
        FROM EducationStatus e
        JOIN EducationDetails ed ON e.id = ed.enrollmentId
        WHERE e.academicYear = ${academicYear}
        AND e.enrollmentStatus = 'ENROLLED'
        GROUP BY ed.grade
        ORDER BY ed.grade
      `,
      
      // Non-enrollment reasons breakdown
      prisma.educationStatus.groupBy({
        by: ['nonEnrollmentReason'],
        where: {
          academicYear,
          enrollmentStatus: 'NOT_ENROLLED',
          nonEnrollmentReason: {
            not: null
          }
        },
        _count: true
      }),
      
      // Dropout rate (enrolled last year but not this year)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT e1.individualId) as dropouts
        FROM EducationStatus e1
        WHERE e1.academicYear = ${(parseInt(academicYear) - 1).toString()}
        AND e1.enrollmentStatus = 'ENROLLED'
        AND NOT EXISTS (
          SELECT 1 FROM EducationStatus e2
          WHERE e2.individualId = e1.individualId
          AND e2.academicYear = ${academicYear}
          AND e2.enrollmentStatus = 'ENROLLED'
        )
      `.then((result: any) => result[0]?.dropouts || 0),
      
      // Average attendance rate
      prisma.learningProgress.aggregate({
        where: {
          academicYear,
          enrollmentStatus: 'ACTIVE'
        },
        _avg: {
          attendanceRate: true
        }
      }),
      
      // Learning space utilization
      prisma.$queryRaw`
        SELECT 
          ls.id,
          ls.name,
          ls.type,
          ls.capacity,
          COUNT(e.id) as enrolled,
          ROUND(CAST(COUNT(e.id) AS FLOAT) / ls.capacity * 100, 1) as utilizationRate
        FROM LearningSpace ls
        LEFT JOIN EducationStatus e ON ls.id = e.learningSpaceId
          AND e.academicYear = ${academicYear}
          AND e.enrollmentStatus = 'ENROLLED'
        GROUP BY ls.id, ls.name, ls.type, ls.capacity
      `
    ])

    // Calculate key indicators
    const enrolled = await prisma.educationStatus.count({
      where: {
        academicYear,
        enrollmentStatus: 'ENROLLED'
      }
    })

    const notEnrolled = await prisma.educationStatus.count({
      where: {
        academicYear,
        enrollmentStatus: 'NOT_ENROLLED'
      }
    })

    const enrollmentRate = totalSchoolAge > 0 
      ? Math.round((enrolled / totalSchoolAge) * 100)
      : 0

    const outOfSchool = totalSchoolAge - enrolled

    const statistics = {
      overview: {
        totalSchoolAge,
        enrolled,
        notEnrolled,
        outOfSchool,
        enrollmentRate: `${enrollmentRate}%`,
        dropoutCount: dropoutRate,
        averageAttendance: `${Math.round(attendanceRate._avg?.attendanceRate || 0)}%`
      },
      demographics: {
        byGender: enrolledByGender,
        byAgeGroup: enrolledByAge,
        byGrade: enrollmentByGrade
      },
      barriers: {
        nonEnrollmentReasons: nonEnrollmentReasons.map(r => ({
          reason: r.nonEnrollmentReason,
          count: r._count,
          percentage: notEnrolled > 0 
            ? `${Math.round((r._count / notEnrolled) * 100)}%`
            : '0%'
        }))
      },
      infrastructure: {
        learningSpaces: learningSpaceUtilization
      },
      alerts: []
    }
    
    // Add alerts
    if (enrollmentRate < 70) {
      statistics.alerts.push({
        type: 'WARNING',
        message: `Low enrollment rate: ${enrollmentRate}%`,
        action: 'Conduct enrollment drive and address barriers'
      })
    }
    
    if (dropoutRate > enrolled * 0.1) {
      statistics.alerts.push({
        type: 'WARNING', 
        message: `High dropout rate: ${dropoutRate} children`,
        action: 'Investigate causes and implement retention strategies'
      })
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching education statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}