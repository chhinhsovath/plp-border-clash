import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { prisma } from '@/lib/db/prisma'

// GET /api/security/metrics - Get security metrics
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

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get security metrics
    const [
      totalEvents,
      criticalAlerts,
      failedLogins,
      activeUsers,
      encryptedFieldsCount,
      totalFieldsCount
    ] = await Promise.all([
      // Total audit events in last 30 days
      prisma.auditLog.count({
        where: {
          organizationId,
          timestamp: { gte: thirtyDaysAgo }
        }
      }),
      
      // Critical unresolved alerts
      prisma.securityAlert.count({
        where: {
          severity: 'CRITICAL',
          resolved: false
        }
      }),
      
      // Failed login attempts in last 24 hours
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: oneDayAgo }
        }
      }),
      
      // Active users (logged in within last hour)
      prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) }
        }
      }),
      
      // Encrypted fields count (this would be based on your schema)
      // For demo purposes, assuming certain percentage
      50, // Mock: number of encrypted fields
      
      // Total sensitive fields
      100 // Mock: total number of sensitive fields
    ])

    const dataEncrypted = Math.round((encryptedFieldsCount / totalFieldsCount) * 100)
    
    // Calculate compliance score based on various factors
    const complianceScore = Math.min(100, Math.round(
      (dataEncrypted * 0.3) + // 30% for encryption
      (criticalAlerts === 0 ? 30 : Math.max(0, 30 - criticalAlerts * 10)) + // 30% for no critical alerts
      (failedLogins < 10 ? 20 : Math.max(0, 20 - failedLogins)) + // 20% for low failed logins
      (activeUsers > 0 ? 20 : 0) // 20% for active monitoring
    ))

    const metrics = {
      totalEvents,
      criticalAlerts,
      failedLogins,
      activeUsers,
      dataEncrypted,
      complianceScore
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Error fetching security metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security metrics' },
      { status: 500 }
    )
  }
}

export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.MANAGE_SECURITY],
  rateLimit: { limit: 60, window: 60 * 1000 }
})

export { GET_SECURED as GET }