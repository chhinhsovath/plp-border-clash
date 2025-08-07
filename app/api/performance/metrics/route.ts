import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

// GET /api/performance/metrics - Get performance metrics
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
    const timeRange = searchParams.get('timeRange') as '1h' | '6h' | '24h' || '1h'
    const metricType = searchParams.get('type') as 'api' | 'database' | 'cache' | 'custom' || undefined

    const metrics = await PerformanceMonitor.getMetrics(timeRange, metricType)

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.VIEW_ORG_ANALYTICS],
  rateLimit: { limit: 100, window: 60 * 1000 }
})

export { GET_SECURED as GET }