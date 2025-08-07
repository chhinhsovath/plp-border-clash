import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const updateReportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
  metadata: z.any().optional(),
  settings: z.any().optional(),
})

// GET /api/reports/[id] - Get a specific report
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
    
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        sections: {
          orderBy: {
            order: 'asc'
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        assessments: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/[id] - Update a report
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    const userRole = request.headers.get('x-user-role')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const validation = updateReportSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    // Check if user has permission to edit
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
    
    // Check permissions
    const canEdit = 
      report.authorId === userId ||
      userRole === 'ADMIN' ||
      userRole === 'SUPER_ADMIN'
    
    if (!canEdit) {
      // Check if user is a collaborator with edit permission
      const collaborator = await prisma.reportCollaborator.findFirst({
        where: {
          reportId: params.id,
          userId,
          permission: {
            in: ['EDIT', 'ADMIN']
          }
        }
      })
      
      if (!collaborator) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    }
    
    const { title, description, status, metadata, settings } = validation.data
    
    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(metadata !== undefined && { metadata }),
        ...(settings !== undefined && { settings }),
        ...(status === 'PUBLISHED' && { publishedAt: new Date() }),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_REPORT',
        entity: 'Report',
        entityId: params.id,
        metadata: validation.data
      }
    })
    
    return NextResponse.json({
      success: true,
      data: updatedReport
    })
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    const userRole = request.headers.get('x-user-role')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if report exists and user has permission
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
    
    // Only author or admin can delete
    const canDelete = 
      report.authorId === userId ||
      userRole === 'ADMIN' ||
      userRole === 'SUPER_ADMIN'
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    
    // Delete the report (cascades to related records)
    await prisma.report.delete({
      where: { id: params.id }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_REPORT',
        entity: 'Report',
        entityId: params.id,
        metadata: { title: report.title }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}