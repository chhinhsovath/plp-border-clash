import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const individualSchema = z.object({
  householdId: z.string().optional(),
  isHeadOfHousehold: z.boolean().optional(),
  fullLegalName: z.string().min(1),
  commonlyUsedName: z.string().optional(),
  dateOfBirth: z.string(), // Will be converted to Date
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  nationality: z.string(),
  ethnicGroup: z.string().optional(),
  motherTongue: z.string().optional(),
  preDisplacementAddress: z.string().optional(),
  villageOfOrigin: z.string().optional(),
  contactNumber: z.string().optional(),
  currentSiteId: z.string(),
  zoneBlock: z.string().optional(),
  shelterNumber: z.string().optional(),
  // Vulnerability flags
  unaccompaniedMinor: z.boolean().optional(),
  separatedChild: z.boolean().optional(),
  singleHeadedHH: z.boolean().optional(),
  pregnant: z.boolean().optional(),
  pregnancyDueDate: z.string().optional(),
  lactatingMother: z.boolean().optional(),
  hasDisability: z.boolean().optional(),
  disabilityDetails: z.string().optional(),
  elderly: z.boolean().optional(),
  chronicallyIll: z.boolean().optional(),
  illnessDetails: z.string().optional(),
})

// Generate unique individual code
function generateIndividualCode(siteCode: string, sequence: number): string {
  return `${siteCode}-IDP-${String(sequence).padStart(7, '0')}`
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// GET /api/registration/individuals
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
    const siteId = searchParams.get('siteId')
    const householdId = searchParams.get('householdId')
    const vulnerableOnly = searchParams.get('vulnerableOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (siteId) {
      where.currentSiteId = siteId
    }
    
    if (householdId) {
      where.householdId = householdId
    }
    
    if (vulnerableOnly) {
      where.OR = [
        { unaccompaniedMinor: true },
        { separatedChild: true },
        { singleHeadedHH: true },
        { pregnant: true },
        { lactatingMother: true },
        { hasDisability: true },
        { elderly: true },
        { chronicallyIll: true }
      ]
    }

    // Fetch individuals
    const [individuals, total] = await Promise.all([
      prisma.individual.findMany({
        where,
        skip,
        take: limit,
        include: {
          household: true,
          site: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.individual.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: individuals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching individuals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/registration/individuals
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
    const validation = individualSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Generate individual code
    const lastIndividual = await prisma.individual.findFirst({
      where: { currentSiteId: data.currentSiteId },
      orderBy: { createdAt: 'desc' }
    })
    
    const site = await prisma.iDPSite.findUnique({
      where: { id: data.currentSiteId }
    })
    
    if (!site) {
      return NextResponse.json(
        { error: 'Invalid site ID' },
        { status: 400 }
      )
    }
    
    const sequence = lastIndividual 
      ? parseInt(lastIndividual.individualCode.split('-').pop() || '0') + 1
      : 1
    
    const individualCode = generateIndividualCode(site.siteCode, sequence)
    
    // Calculate age
    const dateOfBirth = new Date(data.dateOfBirth)
    const age = calculateAge(dateOfBirth)
    
    // Auto-set elderly flag if age >= 60
    const elderly = data.elderly ?? (age >= 60)
    
    // Create household if not provided
    let householdId = data.householdId
    
    if (!householdId) {
      const householdCode = `HH-${individualCode}`
      const household = await prisma.household.create({
        data: {
          householdCode,
          size: 1
        }
      })
      householdId = household.id
    }
    
    // Create individual
    const individual = await prisma.individual.create({
      data: {
        individualCode,
        householdId,
        isHeadOfHousehold: data.isHeadOfHousehold ?? false,
        fullLegalName: data.fullLegalName,
        commonlyUsedName: data.commonlyUsedName,
        dateOfBirth,
        age,
        gender: data.gender,
        nationality: data.nationality,
        ethnicGroup: data.ethnicGroup,
        motherTongue: data.motherTongue,
        preDisplacementAddress: data.preDisplacementAddress,
        villageOfOrigin: data.villageOfOrigin,
        contactNumber: data.contactNumber,
        currentSiteId: data.currentSiteId,
        zoneBlock: data.zoneBlock,
        shelterNumber: data.shelterNumber,
        unaccompaniedMinor: data.unaccompaniedMinor ?? false,
        separatedChild: data.separatedChild ?? false,
        singleHeadedHH: data.singleHeadedHH ?? false,
        pregnant: data.pregnant ?? false,
        pregnancyDueDate: data.pregnancyDueDate ? new Date(data.pregnancyDueDate) : null,
        lactatingMother: data.lactatingMother ?? false,
        hasDisability: data.hasDisability ?? false,
        disabilityDetails: data.disabilityDetails,
        elderly,
        chronicallyIll: data.chronicallyIll ?? false,
        illnessDetails: data.illnessDetails,
      },
      include: {
        household: true,
        site: true
      }
    })
    
    // Update household size
    if (householdId) {
      const memberCount = await prisma.individual.count({
        where: { householdId }
      })
      
      await prisma.household.update({
        where: { id: householdId },
        data: { size: memberCount }
      })
    }
    
    // Update site population
    const sitePopulation = await prisma.individual.count({
      where: { currentSiteId: data.currentSiteId }
    })
    
    await prisma.iDPSite.update({
      where: { id: data.currentSiteId },
      data: { population: sitePopulation }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'REGISTER_INDIVIDUAL',
        entity: 'Individual',
        entityId: individual.id,
        metadata: JSON.stringify({
          individualCode,
          name: data.fullLegalName,
          site: site.name
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: individual
    })
  } catch (error) {
    console.error('Error creating individual:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/registration/individuals/[id]
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
        { error: 'Individual ID is required' },
        { status: 400 }
      )
    }

    // Calculate age if date of birth is being updated
    if (updateData.dateOfBirth) {
      const dateOfBirth = new Date(updateData.dateOfBirth)
      updateData.age = calculateAge(dateOfBirth)
      updateData.dateOfBirth = dateOfBirth
      
      // Auto-update elderly flag
      if (updateData.age >= 60) {
        updateData.elderly = true
      }
    }

    // Convert date strings to Date objects
    if (updateData.pregnancyDueDate) {
      updateData.pregnancyDueDate = new Date(updateData.pregnancyDueDate)
    }

    const individual = await prisma.individual.update({
      where: { id },
      data: updateData,
      include: {
        household: true,
        site: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE_INDIVIDUAL',
        entity: 'Individual',
        entityId: individual.id,
        metadata: JSON.stringify({
          individualCode: individual.individualCode,
          updatedFields: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: individual
    })
  } catch (error) {
    console.error('Error updating individual:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}