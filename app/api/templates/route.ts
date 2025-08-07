import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  structure: z.any(),
  isPublic: z.boolean().optional(),
})

// GET /api/templates - Get all templates
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
    
    // Get templates that are either public or belong to the user's organization
    const templates = await prisma.template.findMany({
      where: {
        OR: [
          { organizationId },
          { isPublic: true }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
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
    
    // Only admins and editors can create templates
    if (userRole === 'VIEWER') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const validation = createTemplateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { name, description, category, structure, isPublic } = validation.data
    
    // Create the template
    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        structure,
        isPublic: isPublic || false,
        organizationId,
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_TEMPLATE',
        entity: 'Template',
        entityId: template.id,
        metadata: { name, category }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}