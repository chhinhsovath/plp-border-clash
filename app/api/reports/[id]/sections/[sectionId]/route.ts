import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const updateSectionSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  order: z.number().optional(),
  isVisible: z.boolean().optional(),
  metadata: z.any().optional(),
})

// GET /api/reports/[id]/sections/[sectionId] - Get a specific section
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, sectionId: string } }
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
    
    const section = await prisma.section.findUnique({
      where: {
        id: params.sectionId
      },
      include: {
        media: true
      }
    })
    
    if (!section || section.reportId !== params.id) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: section
    })
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/[id]/sections/[sectionId] - Update a section
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string, sectionId: string } }
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
    const validation = updateSectionSchema.safeParse(body)
    
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
    
    // Verify section exists
    const section = await prisma.section.findUnique({
      where: {
        id: params.sectionId
      }
    })
    
    if (!section || section.reportId !== params.id) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }
    
    const { title, content, order, isVisible, metadata } = validation.data
    
    // Update the section
    const updatedSection = await prisma.section.update({
      where: { id: params.sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(order !== undefined && { order }),
        ...(isVisible !== undefined && { isVisible }),
        ...(metadata !== undefined && { metadata }),
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
        action: 'UPDATE_SECTION',
        entity: 'Section',
        entityId: params.sectionId,
        metadata: { reportId: params.id, ...validation.data }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: updatedSection
    })
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id]/sections/[sectionId] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, sectionId: string } }
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
    
    // Verify section exists
    const section = await prisma.section.findUnique({
      where: {
        id: params.sectionId
      }
    })
    
    if (!section || section.reportId !== params.id) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }
    
    // Delete the section
    await prisma.section.delete({
      where: { id: params.sectionId }
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
        action: 'DELETE_SECTION',
        entity: 'Section',
        entityId: params.sectionId,
        metadata: { reportId: params.id, title: section.title }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}