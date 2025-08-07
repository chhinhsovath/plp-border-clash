import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import jwt from 'jsonwebtoken'

// GET /api/audit/recent
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
    const limit = parseInt(searchParams.get('limit') || '10')
    const hours = parseInt(searchParams.get('hours') || '24')

    // Fetch recent activities
    const activities = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform activities for display
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      entity: activity.entity,
      entityId: activity.entityId,
      user: activity.user,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      createdAt: activity.createdAt,
      description: getActivityDescription(activity.action, activity.entity, activity.metadata)
    }))

    return NextResponse.json({
      success: true,
      data: transformedActivities
    })
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getActivityDescription(action: string, entity: string, metadata?: string): string {
  const data = metadata ? JSON.parse(metadata) : {}
  
  switch (action) {
    case 'REGISTER_INDIVIDUAL':
      return `Registered individual ${data.individualCode || 'unknown'}`
    case 'CREATE_PROTECTION_INCIDENT':
      return `Reported ${data.severity || ''} protection incident`
    case 'CREATE_CLINICAL_VISIT':
      return `Recorded clinical visit for ${data.individualCode || 'patient'}`
    case 'CREATE_NUTRITION_ASSESSMENT':
      return `Nutrition assessment: ${data.nutritionStatus || 'status unknown'}`
    case 'ENROLL_CHILD':
      return `Enrolled child in ${data.grade || 'school'}`
    case 'RECORD_NON_ENROLLMENT':
      return `Recorded non-enrollment: ${data.reason || 'reason unspecified'}`
    case 'CREATE_DISTRIBUTION':
      return `${data.distributionType || 'Distribution'} to ${data.individualCode || 'beneficiary'}`
    case 'CREATE_WASH_ASSESSMENT':
      return `WASH assessment at ${data.siteName || 'site'}`
    case 'CREATE_SHELTER_ASSESSMENT':
      return `Shelter assessment for ${data.householdCode || 'household'}`
    default:
      return `${action.replace(/_/g, ' ').toLowerCase()} - ${entity}`
  }
}