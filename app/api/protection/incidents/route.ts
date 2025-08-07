import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const protectionIncidentSchema = z.object({
  dateTime: z.string(), // Will be converted to Date
  incidentType: z.enum(['SGBV', 'PHYSICAL_ASSAULT', 'TRAFFICKING', 'CHILD_ABUSE', 'HARASSMENT', 'THEFT', 'OTHER']),
  location: z.string().min(1),
  description: z.string().min(1),
  victimId: z.string(),
  perpetratorId: z.string().optional(),
  perpetratorDesc: z.string().optional(),
  referralStatus: z.enum(['REFERRED_HEALTH', 'REFERRED_POLICE', 'REFERRED_LEGAL', 'REFERRED_PSYCHOSOCIAL', 'NO_REFERRAL']).optional(),
  actionTaken: z.string().optional(),
  followUpNotes: z.string().optional(),
})

// Generate unique incident code
function generateIncidentCode(date: Date, sequence: number): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `INC-${year}${month}${day}-${String(sequence).padStart(4, '0')}`
}

// GET /api/protection/incidents
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
    const victimId = searchParams.get('victimId')
    const incidentType = searchParams.get('incidentType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const referralStatus = searchParams.get('referralStatus')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (victimId) {
      where.victimId = victimId
    }
    
    if (incidentType) {
      where.incidentType = incidentType
    }
    
    if (referralStatus) {
      where.referralStatus = referralStatus
    }
    
    if (startDate || endDate) {
      where.dateTime = {}
      if (startDate) {
        where.dateTime.gte = new Date(startDate)
      }
      if (endDate) {
        where.dateTime.lte = new Date(endDate)
      }
    }

    // Fetch incidents
    const [incidents, total] = await Promise.all([
      prisma.protectionIncident.findMany({
        where,
        skip,
        take: limit,
        include: {
          victim: {
            select: {
              id: true,
              individualCode: true,
              fullLegalName: true,
              age: true,
              gender: true,
            }
          },
          perpetrator: {
            select: {
              id: true,
              individualCode: true,
              fullLegalName: true,
            }
          }
        },
        orderBy: {
          dateTime: 'desc'
        }
      }),
      prisma.protectionIncident.count({ where })
    ])

    // Get statistics
    const stats = await prisma.protectionIncident.groupBy({
      by: ['incidentType'],
      _count: {
        id: true
      },
      where: {
        dateTime: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: incidents,
      statistics: stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching protection incidents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/protection/incidents
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
    const validation = protectionIncidentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    const incidentDate = new Date(data.dateTime)
    
    // Verify victim exists
    const victim = await prisma.individual.findUnique({
      where: { id: data.victimId }
    })
    
    if (!victim) {
      return NextResponse.json(
        { error: 'Victim not found' },
        { status: 404 }
      )
    }
    
    // Verify perpetrator if provided
    if (data.perpetratorId) {
      const perpetrator = await prisma.individual.findUnique({
        where: { id: data.perpetratorId }
      })
      
      if (!perpetrator) {
        return NextResponse.json(
          { error: 'Perpetrator not found' },
          { status: 404 }
        )
      }
    }
    
    // Generate incident code
    const todayStart = new Date(incidentDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(incidentDate)
    todayEnd.setHours(23, 59, 59, 999)
    
    const todayIncidents = await prisma.protectionIncident.count({
      where: {
        dateTime: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    })
    
    const incidentCode = generateIncidentCode(incidentDate, todayIncidents + 1)
    
    // Create incident
    const incident = await prisma.protectionIncident.create({
      data: {
        incidentCode,
        dateTime: incidentDate,
        incidentType: data.incidentType,
        location: data.location,
        description: data.description,
        victimId: data.victimId,
        perpetratorId: data.perpetratorId,
        perpetratorDesc: data.perpetratorDesc,
        referralStatus: data.referralStatus,
        actionTaken: data.actionTaken,
        followUpNotes: data.followUpNotes,
      },
      include: {
        victim: {
          select: {
            id: true,
            individualCode: true,
            fullLegalName: true,
            age: true,
            gender: true,
          }
        },
        perpetrator: {
          select: {
            id: true,
            individualCode: true,
            fullLegalName: true,
          }
        }
      }
    })
    
    // Create notification for protection team
    await prisma.notification.create({
      data: {
        userId: decoded.userId,
        type: 'PROTECTION_INCIDENT',
        title: 'New Protection Incident Reported',
        message: `Incident ${incidentCode} reported for ${victim.fullLegalName}`,
        data: JSON.stringify({
          incidentId: incident.id,
          incidentCode,
          incidentType: data.incidentType,
          victimName: victim.fullLegalName
        })
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_PROTECTION_INCIDENT',
        entity: 'ProtectionIncident',
        entityId: incident.id,
        metadata: JSON.stringify({
          incidentCode,
          incidentType: data.incidentType,
          victimCode: victim.individualCode,
          referralStatus: data.referralStatus
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: incident,
      message: 'Protection incident reported successfully'
    })
  } catch (error) {
    console.error('Error creating protection incident:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/protection/incidents/[id]
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
        { error: 'Incident ID is required' },
        { status: 400 }
      )
    }

    // Convert date string to Date object if present
    if (updateData.dateTime) {
      updateData.dateTime = new Date(updateData.dateTime)
    }

    const incident = await prisma.protectionIncident.update({
      where: { id },
      data: updateData,
      include: {
        victim: {
          select: {
            id: true,
            individualCode: true,
            fullLegalName: true,
            age: true,
            gender: true,
          }
        },
        perpetrator: {
          select: {
            id: true,
            individualCode: true,
            fullLegalName: true,
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE_PROTECTION_INCIDENT',
        entity: 'ProtectionIncident',
        entityId: incident.id,
        metadata: JSON.stringify({
          incidentCode: incident.incidentCode,
          updatedFields: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: incident,
      message: 'Protection incident updated successfully'
    })
  } catch (error) {
    console.error('Error updating protection incident:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}