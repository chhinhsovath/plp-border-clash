import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const householdSchema = z.object({
  householdCode: z.string().optional(),
  size: z.number().min(1).optional(),
})

// GET /api/households - Get households with search
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
    const search = searchParams.get('search')
    const siteId = searchParams.get('siteId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { householdCode: { contains: search } },
        {
          members: {
            some: {
              fullLegalName: { contains: search }
            }
          }
        }
      ]
    }
    
    if (siteId) {
      where.members = {
        some: {
          currentSiteId: siteId
        }
      }
    }

    // Fetch households
    const [households, total] = await Promise.all([
      prisma.household.findMany({
        where,
        skip,
        take: limit,
        include: {
          members: {
            select: {
              id: true,
              individualCode: true,
              fullLegalName: true,
              isHeadOfHousehold: true,
              age: true,
              gender: true
            }
          },
          _count: {
            select: {
              nfiDistributions: true,
              foodDistributions: true,
              hygieneDistributions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.household.count({ where })
    ])

    // Format response with household details
    const formattedHouseholds = households.map(household => ({
      id: household.id,
      householdCode: household.householdCode,
      size: household.size,
      headOfHousehold: household.members.find(m => m.isHeadOfHousehold),
      members: household.members,
      distributions: {
        nfi: household._count.nfiDistributions,
        food: household._count.foodDistributions,
        hygiene: household._count.hygieneDistributions
      },
      lastDistribution: null // Could be calculated from distribution dates
    }))

    return NextResponse.json({
      success: true,
      data: formattedHouseholds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching households:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/households - Create a new household
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
    const validation = householdSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Generate household code if not provided
    let householdCode = data.householdCode
    
    if (!householdCode) {
      const lastHousehold = await prisma.household.findFirst({
        orderBy: { createdAt: 'desc' }
      })
      
      const sequence = lastHousehold 
        ? parseInt(lastHousehold.householdCode.split('-').pop() || '0') + 1
        : 1
      
      householdCode = `HH-${String(sequence).padStart(6, '0')}`
    }
    
    // Check if household code already exists
    const existing = await prisma.household.findUnique({
      where: { householdCode }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Household code already exists' },
        { status: 400 }
      )
    }
    
    // Create household
    const household = await prisma.household.create({
      data: {
        householdCode,
        size: data.size || 0
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_HOUSEHOLD',
        entity: 'Household',
        entityId: household.id,
        metadata: JSON.stringify({
          householdCode,
          size: data.size || 0
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: household
    })
  } catch (error) {
    console.error('Error creating household:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/households/[id] - Update household
export async function PUT(request: NextRequest) {
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
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Household ID is required' },
        { status: 400 }
      )
    }

    const household = await prisma.household.update({
      where: { id },
      data: updateData,
      include: {
        members: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE_HOUSEHOLD',
        entity: 'Household',
        entityId: household.id,
        metadata: JSON.stringify({
          householdCode: household.householdCode,
          updatedFields: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: household
    })
  } catch (error) {
    console.error('Error updating household:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/households/[id]/members - Get household members
export async function getHouseholdMembers(request: NextRequest, { params }: { params: { id: string } }) {
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

    const household = await prisma.household.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            site: true
          }
        },
        shelterAssessments: {
          orderBy: { assessmentDate: 'desc' },
          take: 1
        },
        washProfile: true
      }
    })

    if (!household) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    // Calculate vulnerability statistics
    const vulnerableMembers = household.members.filter(member => 
      member.unaccompaniedMinor ||
      member.separatedChild ||
      member.pregnant ||
      member.lactatingMother ||
      member.hasDisability ||
      member.elderly ||
      member.chronicallyIll
    )

    const response = {
      ...household,
      statistics: {
        totalMembers: household.members.length,
        vulnerableMembers: vulnerableMembers.length,
        children: household.members.filter(m => m.age < 18).length,
        adults: household.members.filter(m => m.age >= 18 && m.age < 60).length,
        elderly: household.members.filter(m => m.age >= 60).length
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching household members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}