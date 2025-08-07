import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

// GET /api/performance/health - Get system health metrics
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

    const health = await PerformanceMonitor.getSystemHealth()

    return NextResponse.json({
      success: true,
      data: health
    })
  } catch (error) {
    console.error('Error fetching system health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    )
  }
}

export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.VIEW_ORG_ANALYTICS],
  rateLimit: { limit: 120, window: 60 * 1000 }
})

export { GET_SECURED as GET }