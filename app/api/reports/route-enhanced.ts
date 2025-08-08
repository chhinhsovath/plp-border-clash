import { prisma } from '@/lib/db/prisma'
import jwt from 'jsonwebtoken'
import { 
  createReportSchema, 
  reportQuerySchema,
  reportSchema
} from '@/lib/schemas'
import { getEnv } from '@/lib/schemas/env.schema'
import { createAPIRoute, apiResponse, paginatedResponse } from '@/lib/errors/api-wrapper'
import { AppError } from '@/lib/errors/error-handler'
import { devLog, measureAsync } from '@/lib/utils/dev-logger'

// GET /api/reports - Get all reports with enhanced error handling
export const GET = createAPIRoute({
  name: 'GET /api/reports',
  requireAuth: true,
  handler: async (request, body, context) => {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(context.searchParams!)
    const query = reportQuerySchema.parse(queryParams)
    
    devLog.info('Fetching reports', { query })
    
    // Verify JWT token
    const env = getEnv()
    const decoded = jwt.verify(context.token!, env.JWT_SECRET) as any
    
    // Get user with error handling
    const user = await measureAsync('Fetch user', async () => {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND')
      }
      
      return user
    })
    
    devLog.debug('User fetched', { userId: user.id, organizationId: user.organizationId })
    
    // Build where clause based on query
    const where: any = {
      organizationId: user.organizationId
    }
    
    if (query.status) where.status = query.status
    if (query.reportType) where.reportType = query.reportType
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    // Execute queries in parallel
    const [reports, total] = await measureAsync('Fetch reports and count', async () => {
      return Promise.all([
        prisma.report.findMany({
          where,
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
            [query.sortBy]: query.sortOrder
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit
        }),
        prisma.report.count({ where })
      ])
    })
    
    devLog.info('Reports fetched', { 
      count: reports.length, 
      total,
      page: query.page,
      limit: query.limit 
    })
    
    return paginatedResponse(reports, {
      page: query.page,
      limit: query.limit,
      total
    })
  }
})

// POST /api/reports - Create report with enhanced error handling
export const POST = createAPIRoute({
  name: 'POST /api/reports',
  schema: createReportSchema,
  requireAuth: true,
  handler: async (request, body, context) => {
    devLog.info('Creating new report', { title: body?.title })
    
    // Verify JWT token
    const env = getEnv()
    const decoded = jwt.verify(context.token!, env.JWT_SECRET) as any
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }
    
    const { id: userId, organizationId } = user
    
    // Generate slug from title
    const baseSlug = body!.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const slug = `${baseSlug}-${Date.now()}`
    
    // Fetch template if specified
    let templateStructure = null
    if (body!.templateId) {
      const template = await prisma.template.findUnique({
        where: { id: body!.templateId }
      })
      
      if (!template) {
        throw new AppError(
          'Template not found',
          404,
          'TEMPLATE_NOT_FOUND',
          { templateId: body!.templateId }
        )
      }
      
      templateStructure = template.structure
      devLog.debug('Template loaded', { templateId: body!.templateId })
    }
    
    // Build metadata
    const metadata = {
      ...(templateStructure || {}),
      reportType: body!.reportType,
      location: body!.location,
      coordinates: body!.coordinates,
      startDate: body!.startDate,
      endDate: body!.endDate,
      sectors: body!.sectors,
      teamMembers: body!.teamMembers,
      affectedPeople: body!.affectedPeople,
      households: body!.households,
      methodology: body!.methodology
    }
    
    // Create report with transaction
    const report = await measureAsync('Create report with sections', async () => {
      return prisma.$transaction(async (tx) => {
        // Create the report
        const report = await tx.report.create({
          data: {
            title: body!.title,
            slug,
            description: body!.description,
            status: body!.status || 'DRAFT',
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
        if (body!.sections && body!.sections.length > 0) {
          await tx.section.createMany({
            data: body!.sections.map((section: any) => ({
              reportId: report.id,
              title: section.title,
              type: section.type,
              content: section.content ? { text: section.content } : {},
              order: section.order,
              metadata: {},
            }))
          })
          
          devLog.debug('Sections created', { count: body!.sections.length })
        }
        
        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'CREATE_REPORT',
            entity: 'Report',
            entityId: report.id,
            metadata: { title: body!.title, templateId: body!.templateId }
          }
        })
        
        return report
      })
    })
    
    devLog.info('Report created successfully', { 
      reportId: report.id, 
      slug: report.slug 
    })
    
    return apiResponse(report, {
      status: 201,
      message: 'Report created successfully'
    })
  }
})