import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { CacheService } from '@/lib/performance/cache-strategies'

// GET /api/performance/cache - Get cache performance metrics
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

    const cacheMetrics = await CacheService.getCacheMetrics()

    return NextResponse.json({
      success: true,
      data: cacheMetrics
    })
  } catch (error) {
    console.error('Error fetching cache metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cache metrics' },
      { status: 500 }
    )
  }
}

export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.VIEW_ORG_ANALYTICS],
  rateLimit: { limit: 100, window: 60 * 1000 }
})

export { GET_SECURED as GET }