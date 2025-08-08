import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import jwt from 'jsonwebtoken'
import { 
  createReportSchema, 
  reportQuerySchema,
  apiSuccessSchema,
  paginatedApiResponseSchema,
  reportSchema,
  apiErrorSchema
} from '@/lib/schemas'
import { getEnv } from '@/lib/schemas/env.schema'

// GET /api/reports - Get all reports for the user's organization
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    let decoded: any
    try {
      const env = getEnv()
      decoded = jwt.verify(token, env.JWT_SECRET) as any
    } catch (jwtError: any) {
      console.error('JWT verification failed:', jwtError.message)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const { organizationId } = user
    
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
    
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const query = reportQuerySchema.parse(queryParams)
    
    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    const total = await prisma.report.count({ where: { organizationId } })
    
    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: skip + query.limit < total,
        hasPrev: query.page > 1
      }
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
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid auth header')
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('Token extracted:', token.substring(0, 20) + '...')
    
    let decoded: any
    try {
      const env = getEnv()
      decoded = jwt.verify(token, env.JWT_SECRET) as any
      console.log('Token decoded successfully:', decoded)
    } catch (jwtError: any) {
      console.error('JWT verification failed:', jwtError.message)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const { id: userId, organizationId } = user
    
    const body = await request.json()
    const validation = createReportSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { 
      title, 
      description, 
      templateId,
      status,
      reportType,
      location,
      coordinates,
      startDate,
      endDate,
      affectedPeople,
      households,
      methodology,
      teamMembers,
      sectors,
      findings,
      recommendations,
      sections
    } = validation.data
    
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
    
    // Build metadata object
    const metadata = {
      ...(templateStructure || {}),
      reportType,
      location,
      coordinates,
      startDate,
      endDate,
      sectors,
      teamMembers,
      affectedPeople,
      households,
      methodology
    }
    
    // Create the report
    const report = await prisma.report.create({
      data: {
        title,
        slug,
        description,
        status: status || 'DRAFT',
        authorId: userId,
        organizationId,
        metadata,
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
    
    // Create sections if provided
    if (sections && sections.length > 0) {
      await prisma.section.createMany({
        data: sections.map((section: any) => ({
          reportId: report.id,
          title: section.title,
          type: section.type,
          content: section.content ? { text: section.content } : {},
          order: section.order,
          metadata: {},
        }))
      })
    } else if (templateStructure && typeof templateStructure === 'object') {
      // If no sections provided but template exists, use template sections
      const templateSections = (templateStructure as any).sections || []
      
      if (templateSections.length > 0) {
        await prisma.section.createMany({
          data: templateSections.map((section: any, index: number) => ({
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
    
    // Create assessment if assessment data is provided
    if (reportType && location) {
      await prisma.assessment.create({
        data: {
          reportId: report.id,
          type: reportType as any,
          location,
          coordinates: coordinates && (coordinates.lat || coordinates.lng) ? coordinates : null,
          affectedPeople: affectedPeople ? parseInt(affectedPeople) : null,
          households: households ? parseInt(households) : null,
          methodology,
          teamMembers: teamMembers && teamMembers.length > 0 ? { members: teamMembers } : null,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : new Date(),
          findings: findings ? { text: findings } : null,
          recommendations: recommendations ? { text: recommendations } : null,
          sectorData: sectors && sectors.length > 0 ? { sectors } : null
        }
      })
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