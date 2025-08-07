import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const siteSchema = z.object({
  siteCode: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  capacity: z.number().min(0),
})

// GET /api/sites - Get all IDP/refugee sites
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

    // Fetch all sites
    const sites = await prisma.iDPSite.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            individuals: true
          }
        }
      }
    })

    // Calculate utilization rates
    const sitesWithStats = sites.map(site => ({
      id: site.id,
      siteCode: site.siteCode,
      name: site.name,
      location: site.location,
      coordinates: site.coordinates ? JSON.parse(site.coordinates as string) : null,
      capacity: site.capacity,
      population: site.population,
      individuals: site._count.individuals,
      utilizationRate: site.capacity > 0 ? Math.round((site.population / site.capacity) * 100) : 0,
      available: site.capacity - site.population
    }))

    return NextResponse.json({
      success: true,
      data: sitesWithStats
    })
  } catch (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sites - Create a new site
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
    const validation = siteSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Check if site code already exists
    const existing = await prisma.iDPSite.findUnique({
      where: { siteCode: data.siteCode }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Site code already exists' },
        { status: 400 }
      )
    }
    
    // Create site
    const site = await prisma.iDPSite.create({
      data: {
        siteCode: data.siteCode,
        name: data.name,
        location: data.location,
        coordinates: data.coordinates ? JSON.stringify(data.coordinates) : null,
        capacity: data.capacity,
        population: 0
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_SITE',
        entity: 'IDPSite',
        entityId: site.id,
        metadata: JSON.stringify({
          siteCode: data.siteCode,
          name: data.name,
          capacity: data.capacity
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: site
    })
  } catch (error) {
    console.error('Error creating site:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sites/[id] - Update site
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
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Update coordinates if provided
    if (updateData.coordinates) {
      updateData.coordinates = JSON.stringify(updateData.coordinates)
    }

    const site = await prisma.iDPSite.update({
      where: { id },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'UPDATE_SITE',
        entity: 'IDPSite',
        entityId: site.id,
        metadata: JSON.stringify({
          siteCode: site.siteCode,
          updatedFields: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: site
    })
  } catch (error) {
    console.error('Error updating site:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}