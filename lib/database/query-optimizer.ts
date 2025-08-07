import { PrismaClient } from '@prisma/client'

/**
 * Database optimization strategies and utilities
 */
export class QueryOptimizer {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Optimized report queries with selective includes
   */
  async getOptimizedReport(
    reportId: string,
    includeOptions: {
      sections?: boolean
      collaborators?: boolean
      comments?: boolean
      files?: boolean
      author?: boolean
      versions?: boolean
    } = {}
  ) {
    const include: any = {}

    if (includeOptions.author) {
      include.author = {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }

    if (includeOptions.sections) {
      include.sections = {
        where: { isVisible: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          order: true,
          isVisible: true,
          ...(includeOptions.files && {
            files: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                createdAt: true
              }
            }
          })
        }
      }
    }

    if (includeOptions.collaborators) {
      include.collaborators = {
        where: { isActive: true },
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
      }
    }

    if (includeOptions.comments) {
      include.comments = {
        where: { isDeleted: false },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit recent comments
      }
    }

    if (includeOptions.versions) {
      include.versions = {
        orderBy: { version: 'desc' },
        take: 10, // Last 10 versions
        select: {
          id: true,
          version: true,
          createdAt: true,
          createdBy: true,
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }

    return await this.prisma.report.findUnique({
      where: { id: reportId },
      include
    })
  }

  /**
   * Efficient paginated queries with counting optimization
   */
  async getPaginatedReports(
    organizationId: string,
    filters: {
      status?: string
      search?: string
      authorId?: string
      startDate?: Date
      endDate?: Date
    } = {},
    pagination: {
      page: number
      limit: number
      orderBy?: string
      orderDir?: 'asc' | 'desc'
    }
  ) {
    const { page, limit, orderBy = 'updatedAt', orderDir = 'desc' } = pagination
    const where: any = { organizationId }

    // Build efficient where clause
    if (filters.status) {
      where.status = filters.status
    }

    if (filters.authorId) {
      where.authorId = filters.authorId
    }

    if (filters.startDate || filters.endDate) {
      where.updatedAt = {}
      if (filters.startDate) where.updatedAt.gte = filters.startDate
      if (filters.endDate) where.updatedAt.lte = filters.endDate
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    // Use parallel queries for better performance
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              sections: true,
              collaborators: true,
              comments: { where: { isDeleted: false } }
            }
          }
        },
        orderBy: { [orderBy]: orderDir },
        take: limit,
        skip: (page - 1) * limit
      }),
      this.prisma.report.count({ where })
    ])

    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Optimized assessment queries with aggregations
   */
  async getAssessmentsWithStats(organizationId: string) {
    // Use raw query for complex aggregations
    const stats = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN type = 'RAPID' THEN 1 END) as rapid_assessments,
        COUNT(CASE WHEN type = 'DETAILED' THEN 1 END) as detailed_assessments,
        SUM("affectedPeople") as total_affected_people,
        AVG("affectedPeople") as avg_affected_people,
        MAX("createdAt") as latest_assessment
      FROM "Assessment" 
      WHERE "organizationId" = ${organizationId}
    `

    const recentAssessments = await this.prisma.assessment.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        type: true,
        location: true,
        affectedPeople: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return {
      stats: stats[0],
      recentAssessments
    }
  }

  /**
   * Efficient user activity queries
   */
  async getUserActivitySummary(
    organizationId: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ) {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Use aggregation pipeline for better performance
    const activity = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', timestamp) as day,
        COUNT(*) as event_count,
        COUNT(DISTINCT "userId") as active_users,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_events,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_events
      FROM "AuditLog" 
      WHERE "organizationId" = ${organizationId}
        AND timestamp >= ${startDate}
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day DESC
    `

    const topUsers = await this.prisma.$queryRaw`
      SELECT 
        u."firstName",
        u."lastName",
        COUNT(*) as event_count,
        MAX(al.timestamp) as last_activity
      FROM "AuditLog" al
      JOIN "User" u ON al."userId" = u.id
      WHERE al."organizationId" = ${organizationId}
        AND al.timestamp >= ${startDate}
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY event_count DESC
      LIMIT 10
    `

    return {
      timeline: activity,
      topUsers,
      period: { days, startDate }
    }
  }

  /**
   * Bulk operations with transaction optimization
   */
  async bulkUpdateReports(
    updates: Array<{ id: string; data: any }>,
    userId: string
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const results = []
      
      // Batch updates in chunks for better performance
      const chunkSize = 100
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize)
        
        const chunkPromises = chunk.map(({ id, data }) =>
          tx.report.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date()
            }
          })
        )
        
        const chunkResults = await Promise.all(chunkPromises)
        results.push(...chunkResults)
      }

      // Log bulk operation
      await tx.auditLog.create({
        data: {
          userId,
          action: 'BULK_UPDATE_REPORTS',
          entity: 'Report',
          metadata: {
            count: updates.length,
            operation: 'bulk_update'
          },
          success: true,
          timestamp: new Date()
        }
      })

      return results
    })
  }

  /**
   * Search optimization with full-text search
   */
  async searchWithRanking(
    organizationId: string,
    query: string,
    entityTypes: ('report' | 'assessment')[] = ['report', 'assessment'],
    limit: number = 50
  ) {
    const results: any[] = []

    // Search reports if requested
    if (entityTypes.includes('report')) {
      const reportResults = await this.prisma.$queryRaw`
        SELECT 
          id,
          title,
          description,
          'report' as entity_type,
          ts_rank(
            to_tsvector('english', title || ' ' || COALESCE(description, '')),
            plainto_tsquery('english', ${query})
          ) as rank
        FROM "Report"
        WHERE "organizationId" = ${organizationId}
          AND (
            to_tsvector('english', title || ' ' || COALESCE(description, ''))
            @@ plainto_tsquery('english', ${query})
          )
        ORDER BY rank DESC
        LIMIT ${Math.floor(limit / entityTypes.length)}
      `
      
      results.push(...reportResults)
    }

    // Search assessments if requested
    if (entityTypes.includes('assessment')) {
      const assessmentResults = await this.prisma.$queryRaw`
        SELECT 
          id,
          title,
          location,
          'assessment' as entity_type,
          ts_rank(
            to_tsvector('english', title || ' ' || location),
            plainto_tsquery('english', ${query})
          ) as rank
        FROM "Assessment"
        WHERE "organizationId" = ${organizationId}
          AND (
            to_tsvector('english', title || ' ' || location)
            @@ plainto_tsquery('english', ${query})
          )
        ORDER BY rank DESC
        LIMIT ${Math.floor(limit / entityTypes.length)}
      `
      
      results.push(...assessmentResults)
    }

    // Sort all results by rank
    return results.sort((a, b) => b.rank - a.rank)
  }

  /**
   * Database health and performance monitoring
   */
  async getDatabaseMetrics() {
    const metrics = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `

    const indexUsage = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan > 0
      ORDER BY idx_scan DESC
      LIMIT 20
    `

    const slowQueries = await this.prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `

    return {
      tableStats: metrics,
      indexUsage,
      slowQueries,
      generatedAt: new Date()
    }
  }

  /**
   * Connection pool optimization
   */
  getConnectionPoolStats() {
    // This would access Prisma's connection pool stats
    // For now, return mock data
    return {
      totalConnections: 10,
      activeConnections: 3,
      idleConnections: 7,
      waitingConnections: 0,
      maxConnections: 20,
      connectionPoolHealth: 'healthy'
    }
  }
}

/**
 * Query execution time tracker
 */
export class QueryTracker {
  private static queries: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map()

  static track<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    return queryFn().then(result => {
      const executionTime = Date.now() - startTime
      this.recordQuery(queryName, executionTime)
      return result
    }).catch(error => {
      const executionTime = Date.now() - startTime
      this.recordQuery(`${queryName}_ERROR`, executionTime)
      throw error
    })
  }

  private static recordQuery(queryName: string, executionTime: number) {
    const existing = this.queries.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 }
    const newCount = existing.count + 1
    const newTotalTime = existing.totalTime + executionTime
    
    this.queries.set(queryName, {
      count: newCount,
      totalTime: newTotalTime,
      avgTime: newTotalTime / newCount
    })
  }

  static getStats() {
    const stats = Array.from(this.queries.entries()).map(([name, data]) => ({
      queryName: name,
      ...data
    }))

    return stats.sort((a, b) => b.avgTime - a.avgTime)
  }

  static reset() {
    this.queries.clear()
  }
}

/**
 * Database indexing recommendations
 */
export const RECOMMENDED_INDEXES = {
  // Core performance indexes
  reports: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_org_status ON "Report"("organizationId", "status")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_updated_at ON "Report"("updatedAt" DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_author_updated ON "Report"("authorId", "updatedAt" DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_fulltext ON "Report" USING gin(to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\')))'
  ],
  
  assessments: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_org_type ON "Assessment"("organizationId", "type")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_location ON "Assessment"("location")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_affected_people ON "Assessment"("affectedPeople" DESC)'
  ],
  
  auditLogs: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_timestamp ON "AuditLog"("organizationId", "timestamp" DESC)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action ON "AuditLog"("userId", "action")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity ON "AuditLog"("entity", "entityId")'
  ],
  
  users: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_active ON "User"("organizationId", "isActive")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON "User"("lastLoginAt" DESC NULLS LAST)'
  ],
  
  sections: [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_report_order ON "ReportSection"("reportId", "order")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_visible ON "ReportSection"("isVisible") WHERE "isVisible" = true'
  ]
}

export default QueryOptimizer