import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createSectionSchema = z.object({
  title: z.string().min(1),
  type: z.enum([
    'TEXT', 'CHART', 'TABLE', 'MAP', 
    'IMAGE_GALLERY', 'ASSESSMENT_DATA', 
    'STATISTICS', 'RECOMMENDATIONS'
  ]),
  content: z.any().optional(),
  order: z.number().optional(),
})

const updateSectionSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  order: z.number().optional(),
  isVisible: z.boolean().optional(),
  metadata: z.any().optional(),
})

// GET /api/reports/[id]/sections - Get all sections of a report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify report access
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    const sections = await prisma.section.findMany({
      where: {
        reportId: params.id
      },
      include: {
        media: true
      },
      orderBy: {
        order: 'asc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: sections
    })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/reports/[id]/sections - Create a new section
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const validation = createSectionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    // Verify report access and permission
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    const { title, type, content, order } = validation.data
    
    // Determine order if not provided
    let sectionOrder = order
    if (sectionOrder === undefined) {
      const lastSection = await prisma.section.findFirst({
        where: { reportId: params.id },
        orderBy: { order: 'desc' }
      })
      sectionOrder = lastSection ? lastSection.order + 1 : 0
    }
    
    // Create the section
    const section = await prisma.section.create({
      data: {
        reportId: params.id,
        title,
        type,
        content: content || {},
        order: sectionOrder,
      }
    })
    
    // Update report's updatedAt
    await prisma.report.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_SECTION',
        entity: 'Section',
        entityId: section.id,
        metadata: { reportId: params.id, title, type }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: section
    })
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/[id]/sections/reorder - Reorder sections
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { sections } = body // Array of { id, order }
    
    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Invalid input: sections must be an array' },
        { status: 400 }
      )
    }
    
    // Verify report access
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    // Update sections order
    const updates = sections.map((section: { id: string, order: number }) =>
      prisma.section.update({
        where: { id: section.id },
        data: { order: section.order }
      })
    )
    
    await prisma.$transaction(updates)
    
    // Update report's updatedAt
    await prisma.report.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Sections reordered successfully'
    })
  } catch (error) {
    console.error('Error reordering sections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}