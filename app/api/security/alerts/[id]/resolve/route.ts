import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { prisma } from '@/lib/db/prisma'
import { AuditLogger, AuditAction } from '@/lib/audit/audit-logger'

// POST /api/security/alerts/[id]/resolve - Resolve security alert
async function POST(
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

    const alertId = params.id
    const body = await request.json()
    const { resolution, notes } = body

    // Check if alert exists
    const alert = await prisma.securityAlert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    if (alert.resolved) {
      return NextResponse.json(
        { error: 'Alert already resolved' },
        { status: 400 }
      )
    }

    // Update alert as resolved
    const updatedAlert = await prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution: resolution || 'Manual resolution',
        resolutionNotes: notes
      }
    })

    // Log the resolution
    await AuditLogger.logSuccess(
      AuditAction.UPDATE_USER, // Using generic update action
      'SecurityAlert',
      userId,
      alertId,
      {
        action: 'resolve',
        alertType: alert.type,
        severity: alert.severity,
        resolution,
        notes
      },
      request
    )

    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: 'Alert resolved successfully'
    })
  } catch (error) {
    console.error('Error resolving security alert:', error)
    return NextResponse.json(
      { error: 'Failed to resolve security alert' },
      { status: 500 }
    )
  }
}

export const POST_SECURED = withSecurity(POST, {
  permissions: [Permission.MANAGE_SECURITY],
  rateLimit: { limit: 50, window: 60 * 1000 }
})

export { POST_SECURED as POST }