import { cache, CacheOptions, CacheStrategy } from '@/lib/cache/redis-cache'
import { prisma } from '@/lib/db/prisma'

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIGS = {
  // User data - frequent access, medium volatility
  users: {
    ttl: 1800, // 30 minutes
    strategy: CacheStrategy.WRITE_THROUGH,
    tags: ['users'],
    compress: false
  },
  
  // Reports - high read, low write
  reports: {
    ttl: 3600, // 1 hour
    strategy: CacheStrategy.CACHE_ASIDE,
    tags: ['reports'],
    compress: true
  },
  
  // Report lists - frequently accessed, paginated
  reportLists: {
    ttl: 600, // 10 minutes
    strategy: CacheStrategy.READ_THROUGH,
    tags: ['reports', 'lists'],
    compress: true
  },
  
  // Assessments - similar to reports but more stable
  assessments: {
    ttl: 7200, // 2 hours
    strategy: CacheStrategy.CACHE_ASIDE,
    tags: ['assessments'],
    compress: true
  },
  
  // Analytics data - expensive to compute, relatively stable
  analytics: {
    ttl: 14400, // 4 hours
    strategy: CacheStrategy.READ_THROUGH,
    tags: ['analytics'],
    compress: true
  },
  
  // Audit logs - write-heavy, read occasionally
  auditLogs: {
    ttl: 1800, // 30 minutes
    strategy: CacheStrategy.WRITE_BEHIND,
    tags: ['audit'],
    compress: true
  },
  
  // Search results - temporary, user-specific
  search: {
    ttl: 300, // 5 minutes
    strategy: CacheStrategy.TTL,
    tags: ['search'],
    compress: false
  },
  
  // Static configurations - rarely change
  config: {
    ttl: 86400, // 24 hours
    strategy: CacheStrategy.WRITE_THROUGH,
    tags: ['config'],
    compress: false
  },
  
  // Session data - user-specific, temporary
  sessions: {
    ttl: 3600, // 1 hour
    strategy: CacheStrategy.WRITE_THROUGH,
    tags: ['sessions'],
    compress: false
  },
  
  // API responses - short-lived, high frequency
  api: {
    ttl: 180, // 3 minutes
    strategy: CacheStrategy.TTL,
    tags: ['api'],
    compress: true
  }
} as const

/**
 * Cache service with strategy-based operations
 */
export class CacheService {
  /**
   * Get user data with caching
   */
  static async getUser(userId: string): Promise<any> {
    return cache.setWithRefresh(
      'users',
      userId,
      async () => {
        return await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            isActive: true,
            lastLoginAt: true
          }
        })
      },
      CACHE_CONFIGS.users,
      userId
    )
  }

  /**
   * Get report with caching and related data
   */
  static async getReport(reportId: string, userId: string): Promise<any> {
    const cacheKey = `${reportId}:${userId}`
    
    return cache.setWithRefresh(
      'reports',
      cacheKey,
      async () => {
        return await prisma.report.findFirst({
          where: { id: reportId },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                files: true
              }
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            comments: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        })
      },
      CACHE_CONFIGS.reports,
      userId
    )
  }

  /**
   * Get paginated reports list with caching
   */
  static async getReportsList(
    organizationId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    const cacheKey = `list:${organizationId}:${JSON.stringify(filters)}:${page}:${limit}`
    
    return cache.setWithRefresh(
      'reportLists',
      cacheKey,
      async () => {
        const where: any = { organizationId }
        
        if (filters.status) where.status = filters.status
        if (filters.search) {
          where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        }

        const [reports, total] = await Promise.all([
          prisma.report.findMany({
            where,
            include: {
              author: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              _count: {
                select: {
                  sections: true,
                  collaborators: true,
                  comments: true
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: (page - 1) * limit
          }),
          prisma.report.count({ where })
        ])

        return {
          reports,
          total,
          page,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      },
      CACHE_CONFIGS.reportLists
    )
  }

  /**
   * Get analytics data with heavy caching
   */
  static async getAnalytics(
    organizationId: string,
    timeRange: string = '30d'
  ): Promise<any> {
    const cacheKey = `${organizationId}:${timeRange}`
    
    return cache.setWithRefresh(
      'analytics',
      cacheKey,
      async () => {
        const days = parseInt(timeRange.replace('d', ''))
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const [
          totalReports,
          publishedReports,
          activeUsers,
          recentActivity
        ] = await Promise.all([
          prisma.report.count({ where: { organizationId } }),
          prisma.report.count({ 
            where: { organizationId, status: 'PUBLISHED' } 
          }),
          prisma.user.count({ 
            where: { 
              organizationId, 
              lastLoginAt: { gte: startDate } 
            } 
          }),
          prisma.auditLog.count({
            where: {
              organizationId,
              timestamp: { gte: startDate }
            }
          })
        ])

        // Calculate trends (simplified)
        const trends = {
          reports: { value: totalReports, change: 5.2 },
          published: { value: publishedReports, change: 12.1 },
          users: { value: activeUsers, change: -2.1 },
          activity: { value: recentActivity, change: 8.7 }
        }

        return {
          summary: {
            totalReports,
            publishedReports,
            activeUsers,
            recentActivity
          },
          trends,
          period: { days, startDate }
        }
      },
      CACHE_CONFIGS.analytics
    )
  }

  /**
   * Cache search results with user-specific keys
   */
  static async cacheSearchResults(
    query: string,
    results: any[],
    userId: string
  ): Promise<void> {
    const cacheKey = `${userId}:${Buffer.from(query).toString('base64')}`
    await cache.set('search', cacheKey, results, CACHE_CONFIGS.search, userId)
  }

  /**
   * Get cached search results
   */
  static async getCachedSearch(
    query: string,
    userId: string
  ): Promise<any[] | null> {
    const cacheKey = `${userId}:${Buffer.from(query).toString('base64')}`
    return cache.get('search', cacheKey, userId)
  }

  /**
   * Cache API response with automatic key generation
   */
  static async cacheApiResponse(
    endpoint: string,
    params: any,
    response: any,
    userId?: string
  ): Promise<void> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`
    await cache.set('api', cacheKey, response, CACHE_CONFIGS.api, userId)
  }

  /**
   * Get cached API response
   */
  static async getCachedApiResponse<T = any>(
    endpoint: string,
    params: any,
    userId?: string
  ): Promise<T | null> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`
    return cache.get<T>('api', cacheKey, userId)
  }

  /**
   * Invalidate related caches when data changes
   */
  static async invalidateRelated(
    entityType: 'report' | 'assessment' | 'user',
    entityId: string,
    organizationId: string
  ): Promise<void> {
    const tags: string[] = []

    switch (entityType) {
      case 'report':
        tags.push('reports', 'lists', 'analytics')
        // Also clear specific report cache
        await cache.del('reports', entityId)
        break
      
      case 'assessment':
        tags.push('assessments', 'analytics')
        await cache.del('assessments', entityId)
        break
      
      case 'user':
        tags.push('users', 'analytics')
        await cache.del('users', entityId)
        break
    }

    // Invalidate by tags
    await cache.invalidateByTags(tags)
    
    // Clear organization-specific caches
    await cache.clearNamespace(`reportLists:list:${organizationId}`)
    await cache.clearNamespace(`analytics:${organizationId}`)
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmupCache(organizationId: string): Promise<void> {
    try {
      // Pre-load recent reports
      const recentReports = await prisma.report.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          author: true,
          sections: true
        }
      })

      // Cache each report
      const cachePromises = recentReports.map(report =>
        cache.set('reports', report.id, report, CACHE_CONFIGS.reports)
      )

      // Pre-load analytics
      cachePromises.push(
        this.getAnalytics(organizationId, '30d'),
        this.getAnalytics(organizationId, '7d')
      )

      await Promise.all(cachePromises)
    } catch (error) {
      console.error('Cache warmup error:', error)
    }
  }

  /**
   * Get cache performance metrics
   */
  static async getCacheMetrics(): Promise<{
    stats: any
    hitRates: Record<string, number>
    recommendations: string[]
  }> {
    const stats = await cache.getStats()
    
    // Mock hit rates per namespace (would come from monitoring)
    const hitRates = {
      users: 0.92,
      reports: 0.85,
      reportLists: 0.78,
      assessments: 0.88,
      analytics: 0.95,
      search: 0.45,
      api: 0.72
    }

    const recommendations: string[] = []
    
    // Generate recommendations based on metrics
    if (hitRates.search < 0.5) {
      recommendations.push('Search hit rate is low - consider longer TTL or better key strategy')
    }
    
    if (stats.totalKeys > 10000) {
      recommendations.push('High key count - consider implementing key eviction policies')
    }

    return {
      stats,
      hitRates,
      recommendations
    }
  }

  /**
   * Batch cache operations for efficiency
   */
  static async batchGet<T>(
    namespace: string,
    keys: string[],
    fallbackFetcher?: (missingKeys: string[]) => Promise<Record<string, T>>,
    userId?: string
  ): Promise<Record<string, T | null>> {
    // Get all values at once
    const values = await cache.mget<T>(namespace, keys, userId)
    const result: Record<string, T | null> = {}
    const missingKeys: string[] = []

    keys.forEach((key, index) => {
      const value = values[index]
      result[key] = value
      if (value === null && fallbackFetcher) {
        missingKeys.push(key)
      }
    })

    // Fetch missing values if fallback provided
    if (missingKeys.length > 0 && fallbackFetcher) {
      try {
        const fetchedData = await fallbackFetcher(missingKeys)
        
        // Cache the fetched data
        const cacheData: Record<string, any> = {}
        for (const [key, value] of Object.entries(fetchedData)) {
          result[key] = value
          cacheData[key] = value
        }

        // Batch cache the missing data
        const config = CACHE_CONFIGS[namespace as keyof typeof CACHE_CONFIGS] || CACHE_CONFIGS.api
        await cache.mset(namespace, cacheData, config, userId)
      } catch (error) {
        console.error('Batch fallback fetch error:', error)
      }
    }

    return result
  }
}

export default CacheService