import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const foodDistributionSchema = z.object({
  householdId: z.string(),
  distributionDate: z.string(),
  distributionPoint: z.string(),
  items: z.array(z.object({
    item: z.string(),
    quantity: z.number(),
    unit: z.string()
  })),
  distributedBy: z.string(),
  collectorName: z.string(),
  collectorRelation: z.string(),
  verificationMethod: z.enum(['SIGNATURE', 'FINGERPRINT', 'QR_CODE']),
  verificationCode: z.string().optional(),
  notes: z.string().optional()
})

// GET /api/distribution/food - Get food distributions
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
    const householdId = searchParams.get('householdId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (householdId) {
      where.householdId = householdId
    }
    
    if (startDate || endDate) {
      where.distributionDate = {}
      if (startDate) {
        where.distributionDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.distributionDate.lte = new Date(endDate)
      }
    }

    // Fetch distributions
    const [distributions, total] = await Promise.all([
      prisma.foodDistribution.findMany({
        where,
        skip,
        take: limit,
        include: {
          household: {
            include: {
              members: {
                where: { isHeadOfHousehold: true },
                select: {
                  fullLegalName: true,
                  individualCode: true
                }
              }
            }
          }
        },
        orderBy: {
          distributionDate: 'desc'
        }
      }),
      prisma.foodDistribution.count({ where })
    ])

    // Calculate statistics
    const stats = {
      totalDistributions: total,
      householdsServed: await prisma.foodDistribution.groupBy({
        by: ['householdId'],
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        },
        _count: true
      }).then(groups => groups.length),
      totalWeight: distributions.reduce((sum, dist) => {
        const items = JSON.parse(dist.items as string)
        return sum + items.reduce((itemSum: number, item: any) => {
          if (item.unit === 'kg') return itemSum + item.quantity
          return itemSum
        }, 0)
      }, 0)
    }

    return NextResponse.json({
      success: true,
      data: distributions,
      statistics: stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching food distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/distribution/food - Record food distribution
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
    const validation = foodDistributionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify household exists
    const household = await prisma.household.findUnique({
      where: { id: data.householdId },
      include: {
        members: true
      }
    })
    
    if (!household) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }
    
    // Check for duplicate distribution (prevent double distribution on same day)
    const existingDistribution = await prisma.foodDistribution.findFirst({
      where: {
        householdId: data.householdId,
        distributionDate: {
          gte: new Date(new Date(data.distributionDate).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(data.distributionDate).setHours(23, 59, 59, 999))
        }
      }
    })
    
    if (existingDistribution) {
      return NextResponse.json(
        { error: 'This household has already received food distribution today' },
        { status: 400 }
      )
    }
    
    // Calculate ration type based on items
    const totalWeight = data.items.reduce((sum, item) => {
      if (item.unit === 'kg') return sum + item.quantity
      return sum
    }, 0)
    
    const rationType = totalWeight > 20 ? 'GENERAL_FOOD_RATION' : 
                      totalWeight > 10 ? 'SUPPLEMENTARY_FEEDING' : 
                      'HIGH_ENERGY_BISCUITS'
    
    // Create distribution record
    const distribution = await prisma.foodDistribution.create({
      data: {
        householdId: data.householdId,
        distributionDate: new Date(data.distributionDate),
        rationType,
        items: JSON.stringify(data.items),
        distributedBy: data.distributedBy
      }
    })
    
    // Create verification record
    await prisma.distributionVerification.create({
      data: {
        distributionId: distribution.id,
        distributionType: 'FOOD',
        collectorName: data.collectorName,
        collectorRelation: data.collectorRelation,
        verificationMethod: data.verificationMethod,
        verificationCode: data.verificationCode,
        verifiedAt: new Date()
      }
    })
    
    // Create notification for successful distribution
    await prisma.notification.create({
      data: {
        userId: decoded.userId,
        type: 'DISTRIBUTION_COMPLETED',
        title: 'Food Distribution Completed',
        message: `Food distribution completed for household ${household.householdCode}`,
        data: JSON.stringify({
          distributionId: distribution.id,
          householdCode: household.householdCode,
          totalWeight,
          itemCount: data.items.length
        })
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_FOOD_DISTRIBUTION',
        entity: 'FoodDistribution',
        entityId: distribution.id,
        metadata: JSON.stringify({
          householdCode: household.householdCode,
          rationType,
          totalWeight,
          distributionPoint: data.distributionPoint
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: distribution,
      message: `Food distribution recorded for ${household.householdCode}`
    })
  } catch (error) {
    console.error('Error creating food distribution:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}