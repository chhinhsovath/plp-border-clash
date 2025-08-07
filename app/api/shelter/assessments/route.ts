import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const shelterAssessmentSchema = z.object({
  householdId: z.string(),
  assessmentDate: z.string(),
  shelterType: z.enum(['TENT', 'PREFAB', 'SHARED_BUILDING', 'OPEN_AIR', 'OTHER']),
  shelterCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNINHABITABLE']),
  structuralSafety: z.object({
    foundation: z.enum(['STABLE', 'NEEDS_REPAIR', 'UNSAFE']),
    walls: z.enum(['STABLE', 'NEEDS_REPAIR', 'UNSAFE']),
    roof: z.enum(['STABLE', 'NEEDS_REPAIR', 'UNSAFE']),
    doors: z.enum(['FUNCTIONAL', 'NEEDS_REPAIR', 'MISSING']),
    windows: z.enum(['FUNCTIONAL', 'NEEDS_REPAIR', 'MISSING'])
  }),
  livingConditions: z.object({
    overcrowding: z.boolean(),
    privacy: z.enum(['ADEQUATE', 'LIMITED', 'NONE']),
    ventilation: z.enum(['GOOD', 'ADEQUATE', 'POOR']),
    lighting: z.enum(['ADEQUATE', 'INSUFFICIENT', 'NONE']),
    flooring: z.enum(['CONCRETE', 'WOOD', 'DIRT', 'OTHER'])
  }),
  nfiNeeds: z.array(z.object({
    itemType: z.string(),
    itemName: z.string(),
    quantityNeeded: z.number(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    reason: z.string()
  })),
  hazards: z.array(z.object({
    hazardType: z.enum(['STRUCTURAL', 'FIRE', 'FLOOD', 'ELECTRICAL', 'OTHER']),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  accessibility: z.object({
    wheelchairAccessible: z.boolean(),
    elderlyFriendly: z.boolean(),
    childSafe: z.boolean(),
    disabilityAccommodations: z.array(z.string())
  }),
  recommendations: z.array(z.string()),
  assessorName: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  notes: z.string().optional()
})

// GET /api/shelter/assessments
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
    const householdId = searchParams.get('householdId')
    const priority = searchParams.get('priority')
    const shelterCondition = searchParams.get('shelterCondition')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (householdId) {
      where.householdId = householdId
    }
    
    if (priority) {
      where.priority = priority
    }
    
    if (shelterCondition) {
      where.shelterCondition = shelterCondition
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
      prisma.shelterAssessment.findMany({
        where,
        skip,
        take: limit,
        include: {
          household: {
            select: {
              id: true,
              householdCode: true,
              familySize: true,
              headOfHousehold: true
            }
          }
        },
        orderBy: {
          assessmentDate: 'desc'
        }
      }),
      prisma.shelterAssessment.count({ where })
    ])

    // Calculate statistics
    const stats = await prisma.shelterAssessment.groupBy({
      by: ['shelterCondition'],
      where: {
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      _count: {
        id: true
      }
    })

    const nfiNeeds = await prisma.shelterAssessment.findMany({
      where: {
        priority: { in: ['HIGH', 'URGENT'] },
        assessmentDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      select: {
        id: true,
        nfiNeeds: true,
        priority: true
      }
    })

    return NextResponse.json({
      success: true,
      data: assessments,
      statistics: {
        byCondition: stats,
        urgentNFINeeds: nfiNeeds.length,
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
    console.error('Error fetching shelter assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/shelter/assessments
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
    const validation = shelterAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify household exists
    const household = await prisma.household.findUnique({
      where: { id: data.householdId }
    })
    
    if (!household) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    // Create assessment
    const assessment = await prisma.shelterAssessment.create({
      data: {
        householdId: data.householdId,
        assessmentDate: new Date(data.assessmentDate),
        shelterType: data.shelterType,
        shelterCondition: data.shelterCondition,
        assessorName: data.assessorName,
        priority: data.priority,
        notes: data.notes,
        structuralSafety: JSON.stringify(data.structuralSafety),
        livingConditions: JSON.stringify(data.livingConditions),
        nfiNeeds: JSON.stringify(data.nfiNeeds),
        hazards: JSON.stringify(data.hazards),
        accessibility: JSON.stringify(data.accessibility),
        recommendations: JSON.stringify(data.recommendations)
      },
      include: {
        household: true
      }
    })

    // Create alerts for urgent/critical conditions
    if (data.priority === 'URGENT' || data.shelterCondition === 'UNINHABITABLE') {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'SHELTER_URGENT',
          title: 'Urgent Shelter Assessment',
          message: `Urgent shelter issues for household ${household.householdCode} - ${data.shelterCondition}`,
          data: JSON.stringify({
            assessmentId: assessment.id,
            householdId: household.id,
            condition: data.shelterCondition,
            priority: data.priority
          })
        }
      })
    }

    // Check for safety hazards
    const criticalHazards = data.hazards.filter(h => h.severity === 'CRITICAL')
    if (criticalHazards.length > 0) {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'SHELTER_SAFETY_ALERT',
          title: 'Critical Safety Hazards',
          message: `Critical safety hazards identified for household ${household.householdCode}`,
          data: JSON.stringify({
            assessmentId: assessment.id,
            householdId: household.id,
            hazards: criticalHazards.map(h => h.description)
          })
        }
      })
    }

    // Create NFI requests for urgent needs
    const urgentNFIs = data.nfiNeeds.filter(item => item.priority === 'URGENT')
    for (const nfi of urgentNFIs) {
      await prisma.nfiRequest.create({
        data: {
          householdId: data.householdId,
          itemType: nfi.itemType,
          itemName: nfi.itemName,
          quantityRequested: nfi.quantityNeeded,
          priority: nfi.priority,
          reason: nfi.reason,
          requestDate: new Date(),
          status: 'PENDING',
          relatedAssessmentId: assessment.id
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_SHELTER_ASSESSMENT',
        entity: 'ShelterAssessment',
        entityId: assessment.id,
        metadata: JSON.stringify({
          householdCode: household.householdCode,
          shelterType: data.shelterType,
          condition: data.shelterCondition,
          priority: data.priority,
          hazardCount: data.hazards.length,
          nfiCount: data.nfiNeeds.length
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: assessment,
      message: `Shelter assessment completed for household ${household.householdCode}`
    })
  } catch (error) {
    console.error('Error creating shelter assessment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}