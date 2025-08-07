import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  templateId: z.string().optional(),
})

// GET /api/reports - Get all reports for the user's organization
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const reports = await prisma.report.findMany({
      where: {
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
          select: {
            id: true,
            type: true,
            order: true,
          }
        },
        _count: {
          select: {
            collaborators: true,
            comments: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: reports
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
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
    const validation = createReportSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { title, description, templateId } = validation.data
    
    // Generate slug from title
    const baseSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const slug = `${baseSlug}-${Date.now()}`
    
    // If template is specified, fetch its structure
    let templateStructure = null
    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId }
      })
      if (template) {
        templateStructure = template.structure
      }
    }
    
    // Create the report
    const report = await prisma.report.create({
      data: {
        title,
        slug,
        description,
        authorId: userId,
        organizationId,
        metadata: templateStructure || {},
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
    
    // If template structure exists, create default sections
    if (templateStructure && typeof templateStructure === 'object') {
      const sections = (templateStructure as any).sections || []
      
      if (sections.length > 0) {
        await prisma.section.createMany({
          data: sections.map((section: any, index: number) => ({
            reportId: report.id,
            title: section.title || `Section ${index + 1}`,
            type: section.type || 'TEXT',
            content: section.defaultContent || {},
            order: index,
            metadata: section.metadata || {},
          }))
        })
      }
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_REPORT',
        entity: 'Report',
        entityId: report.id,
        metadata: { title, templateId }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}