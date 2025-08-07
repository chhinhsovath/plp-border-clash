import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { prisma } from '@/lib/db/prisma'

// GET /api/security/alerts - Get security alerts
async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const severity = searchParams.get('severity')
    const resolved = searchParams.get('resolved')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    
    if (severity && severity !== 'ALL') {
      where.severity = severity
    }
    
    if (resolved !== null && resolved !== 'ALL') {
      where.resolved = resolved === 'true'
    }

    const alerts = await prisma.securityAlert.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Transform alerts to match frontend interface
    const transformedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.createdAt.toISOString(),
      resolved: alert.resolved,
      userId: alert.userId,
      metadata: alert.metadata || {}
    }))

    return NextResponse.json({
      success: true,
      data: transformedAlerts
    })
  } catch (error) {
    console.error('Error fetching security alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    )
  }
}

// POST /api/security/alerts - Create security alert
async function POST(request: NextRequest) {
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
    const { type, severity, message, metadata } = body

    const alert = await prisma.securityAlert.create({
      data: {
        type,
        severity,
        message,
        metadata: metadata || {},
        userId,
        resolved: false
      }
    })

    return NextResponse.json({
      success: true,
      data: alert
    })
  } catch (error) {
    console.error('Error creating security alert:', error)
    return NextResponse.json(
      { error: 'Failed to create security alert' },
      { status: 500 }
    )
  }
}

export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.MANAGE_SECURITY],
  rateLimit: { limit: 100, window: 60 * 1000 }
})

export const POST_SECURED = withSecurity(POST, {
  permissions: [Permission.MANAGE_SECURITY],
  rateLimit: { limit: 20, window: 60 * 1000 }
})

export { GET_SECURED as GET, POST_SECURED as POST }