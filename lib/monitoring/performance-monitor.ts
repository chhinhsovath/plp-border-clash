import { NextRequest } from 'next/server'
import { cache } from '@/lib/cache/redis-cache'
import { AuditLogger, AuditAction } from '@/lib/audit/audit-logger'

/**
 * Performance monitoring and metrics collection
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private static metrics: Map<string, PerformanceMetric> = new Map()
  private static readonly RETENTION_HOURS = 24

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Track API endpoint performance
   */
  static async trackApiCall<T>(
    endpoint: string,
    method: string,
    operation: () => Promise<T>,
    request?: NextRequest
  ): Promise<T> {
    const startTime = Date.now()
    const metricKey = `api:${method}:${endpoint}`
    
    let success = true
    let error: string | undefined
    let responseSize = 0
    
    try {
      const result = await operation()
      
      // Estimate response size
      if (typeof result === 'string') {
        responseSize = Buffer.byteLength(result, 'utf8')
      } else if (result) {
        responseSize = Buffer.byteLength(JSON.stringify(result), 'utf8')
      }
      
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime
      
      await this.recordMetric(metricKey, {
        duration,
        success,
        error,
        responseSize,
        endpoint,
        method,
        timestamp: new Date(),
        userAgent: request?.headers.get('user-agent') || undefined,
        ipAddress: this.getClientIP(request)
      })
    }
  }

  /**
   * Track database query performance
   */
  static async trackDbQuery<T>(
    operation: string,
    query: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    const metricKey = `db:${operation}`
    
    let success = true
    let error: string | undefined
    let recordCount = 0
    
    try {
      const result = await query()
      
      // Estimate record count
      if (Array.isArray(result)) {
        recordCount = result.length
      } else if (result && typeof result === 'object' && 'length' in result) {
        recordCount = (result as any).length
      }
      
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime
      
      await this.recordMetric(metricKey, {
        duration,
        success,
        error,
        recordCount,
        operation,
        timestamp: new Date(),
        type: 'database'
      })
    }
  }

  /**
   * Track cache operations
   */
  static async trackCacheOperation(
    operation: 'get' | 'set' | 'del' | 'mget' | 'mset',
    namespace: string,
    keyCount: number = 1,
    hit: boolean = false
  ): Promise<void> {
    const metricKey = `cache:${operation}:${namespace}`
    
    await this.recordMetric(metricKey, {
      duration: 0, // Cache operations are typically very fast
      success: true,
      keyCount,
      hit,
      operation,
      namespace,
      timestamp: new Date(),
      type: 'cache'
    })
  }

  /**
   * Record custom performance metric
   */
  static async recordCustomMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percent' = 'ms',
    tags: Record<string, string> = {}
  ): Promise<void> {
    await this.recordMetric(`custom:${name}`, {
      duration: unit === 'ms' ? value : 0,
      customValue: unit !== 'ms' ? value : undefined,
      unit,
      tags,
      success: true,
      timestamp: new Date(),
      type: 'custom'
    })
  }

  /**
   * Get performance metrics for analysis
   */
  static async getMetrics(
    timeRange: '1h' | '6h' | '24h' = '1h',
    metricType?: 'api' | 'database' | 'cache' | 'custom'
  ): Promise<PerformanceReport> {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    // Get cached metrics
    const cacheKey = `metrics:${timeRange}:${metricType || 'all'}`
    const cached = await cache.get<PerformanceReport>('monitoring', cacheKey)
    
    if (cached && new Date(cached.generatedAt) > new Date(Date.now() - 5 * 60 * 1000)) {
      return cached // Return if cached within last 5 minutes
    }

    const allMetrics = Array.from(this.metrics.values())
      .filter(m => m.timestamp >= startTime)
      .filter(m => !metricType || m.type === metricType)

    const report = this.analyzeMetrics(allMetrics, timeRange)
    
    // Cache the report
    await cache.set('monitoring', cacheKey, report, { ttl: 300 }) // 5 minutes
    
    return report
  }

  /**
   * Get real-time system health
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000
    
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.timestamp.getTime() >= fiveMinutesAgo)

    const apiMetrics = recentMetrics.filter(m => m.type === 'api' || m.endpoint)
    const dbMetrics = recentMetrics.filter(m => m.type === 'database')
    const cacheMetrics = recentMetrics.filter(m => m.type === 'cache')

    // Calculate health scores
    const apiHealth = this.calculateHealthScore(apiMetrics)
    const dbHealth = this.calculateHealthScore(dbMetrics)
    const cacheHitRate = this.calculateCacheHitRate(cacheMetrics)
    
    // Overall health (weighted average)
    const overallHealth = Math.round(
      (apiHealth * 0.4) + (dbHealth * 0.4) + (cacheHitRate * 0.2)
    )

    // Error rate
    const totalRequests = apiMetrics.length
    const errorCount = apiMetrics.filter(m => !m.success).length
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

    // Average response time
    const avgResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0

    return {
      overall: overallHealth,
      api: {
        health: apiHealth,
        avgResponseTime,
        errorRate,
        requestsPerMinute: Math.round(totalRequests / 5)
      },
      database: {
        health: dbHealth,
        avgQueryTime: dbMetrics.length > 0
          ? dbMetrics.reduce((sum, m) => sum + m.duration, 0) / dbMetrics.length
          : 0,
        activeConnections: 5 // Would come from actual connection pool
      },
      cache: {
        hitRate: cacheHitRate,
        operations: cacheMetrics.length,
        avgLatency: cacheMetrics.length > 0
          ? cacheMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / cacheMetrics.length
          : 0
      },
      timestamp: new Date()
    }
  }

  /**
   * Get top slowest operations
   */
  static getSlowestOperations(limit: number = 10): SlowOperation[] {
    return Array.from(this.metrics.values())
      .filter(m => m.success) // Only successful operations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(m => ({
        operation: m.endpoint || m.operation || 'unknown',
        type: m.type || 'unknown',
        duration: m.duration,
        timestamp: m.timestamp
      }))
  }

  /**
   * Get error summary
   */
  static getErrorSummary(timeRange: '1h' | '24h' = '1h'): ErrorSummary {
    const hours = timeRange === '1h' ? 1 : 24
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const errorMetrics = Array.from(this.metrics.values())
      .filter(m => !m.success && m.timestamp >= startTime)

    // Group by error type
    const errorsByType: Record<string, number> = {}
    const errorsByEndpoint: Record<string, number> = {}

    errorMetrics.forEach(m => {
      const errorType = m.error || 'Unknown Error'
      const endpoint = m.endpoint || m.operation || 'Unknown'
      
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
      errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1
    })

    return {
      totalErrors: errorMetrics.length,
      errorsByType,
      errorsByEndpoint,
      timeRange
    }
  }

  /**
   * Start continuous monitoring
   */
  static startMonitoring(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.RETENTION_HOURS * 60 * 60 * 1000)
      const currentSize = this.metrics.size
      
      for (const [key, metric] of this.metrics.entries()) {
        if (metric.timestamp < cutoff) {
          this.metrics.delete(key)
        }
      }
      
      const cleaned = currentSize - this.metrics.size
      if (cleaned > 0) {
        console.log(`Performance Monitor: Cleaned ${cleaned} old metrics`)
      }
    }, 60 * 60 * 1000) // Every hour

    // Log system health every 10 minutes
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth()
        console.log('System Health:', {
          overall: health.overall,
          api: health.api.health,
          database: health.database.health,
          cacheHitRate: health.cache.hitRate
        })

        // Log critical issues
        if (health.overall < 70) {
          console.warn('PERFORMANCE ALERT: System health below 70%', health)
        }
        
        if (health.api.errorRate > 5) {
          console.warn('API ERROR ALERT: Error rate above 5%', health.api)
        }
      } catch (error) {
        console.error('Health check error:', error)
      }
    }, 10 * 60 * 1000) // Every 10 minutes
  }

  // Private helper methods
  private static async recordMetric(
    key: string, 
    metric: Partial<PerformanceMetric>
  ): Promise<void> {
    const fullMetric: PerformanceMetric = {
      id: `${key}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      key,
      duration: 0,
      success: true,
      timestamp: new Date(),
      ...metric
    }

    this.metrics.set(fullMetric.id, fullMetric)

    // Also cache recent metrics for distributed systems
    await cache.set('metrics', fullMetric.id, fullMetric, { ttl: 3600 })
  }

  private static analyzeMetrics(
    metrics: PerformanceMetric[], 
    timeRange: string
  ): PerformanceReport {
    const totalMetrics = metrics.length
    const successfulMetrics = metrics.filter(m => m.success)
    const errorMetrics = metrics.filter(m => !m.success)

    // Calculate percentiles
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b)
    const p50 = this.percentile(durations, 0.5)
    const p95 = this.percentile(durations, 0.95)
    const p99 = this.percentile(durations, 0.99)

    // Group by endpoint/operation
    const endpointStats: Record<string, EndpointStats> = {}
    
    metrics.forEach(m => {
      const endpoint = m.endpoint || m.operation || 'unknown'
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = {
          name: endpoint,
          requests: 0,
          avgDuration: 0,
          p95Duration: 0,
          errors: 0,
          errorRate: 0
        }
      }
      
      const stats = endpointStats[endpoint]
      stats.requests++
      if (!m.success) stats.errors++
    })

    // Calculate endpoint averages
    Object.values(endpointStats).forEach(stats => {
      const endpointMetrics = metrics.filter(m => 
        (m.endpoint || m.operation) === stats.name
      )
      
      const successfulDurations = endpointMetrics
        .filter(m => m.success)
        .map(m => m.duration)
      
      stats.avgDuration = successfulDurations.length > 0
        ? successfulDurations.reduce((a, b) => a + b, 0) / successfulDurations.length
        : 0
      
      stats.p95Duration = this.percentile(successfulDurations.sort((a, b) => a - b), 0.95)
      stats.errorRate = (stats.errors / stats.requests) * 100
    })

    return {
      timeRange,
      totalRequests: totalMetrics,
      successfulRequests: successfulMetrics.length,
      errorRate: totalMetrics > 0 ? (errorMetrics.length / totalMetrics) * 100 : 0,
      avgDuration: successfulMetrics.length > 0
        ? successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length
        : 0,
      percentiles: { p50, p95, p99 },
      endpointStats: Object.values(endpointStats),
      topErrors: this.getTopErrors(errorMetrics),
      generatedAt: new Date()
    }
  }

  private static percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const index = Math.ceil(arr.length * p) - 1
    return arr[Math.max(0, index)] || 0
  }

  private static calculateHealthScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 100

    const errorRate = (metrics.filter(m => !m.success).length / metrics.length) * 100
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
    
    // Health score based on error rate and performance
    let score = 100
    score -= errorRate * 10 // -10 points per 1% error rate
    score -= Math.min(50, avgDuration / 100) // Penalty for slow responses
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  private static calculateCacheHitRate(metrics: PerformanceMetric[]): number {
    const cacheGets = metrics.filter(m => m.operation === 'get')
    if (cacheGets.length === 0) return 0
    
    const hits = cacheGets.filter(m => m.hit).length
    return Math.round((hits / cacheGets.length) * 100)
  }

  private static getTopErrors(errorMetrics: PerformanceMetric[]): Array<{
    error: string
    count: number
    percentage: number
  }> {
    const errorCounts: Record<string, number> = {}
    
    errorMetrics.forEach(m => {
      const error = m.error || 'Unknown Error'
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })

    const total = errorMetrics.length
    
    return Object.entries(errorCounts)
      .map(([error, count]) => ({
        error,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private static getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined
    
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           undefined
  }
}

// Type definitions
interface PerformanceMetric {
  id: string
  key: string
  duration: number
  success: boolean
  timestamp: Date
  error?: string
  responseSize?: number
  endpoint?: string
  method?: string
  operation?: string
  userAgent?: string
  ipAddress?: string
  recordCount?: number
  keyCount?: number
  hit?: boolean
  type?: 'api' | 'database' | 'cache' | 'custom'
  customValue?: number
  unit?: string
  tags?: Record<string, string>
  namespace?: string
}

interface PerformanceReport {
  timeRange: string
  totalRequests: number
  successfulRequests: number
  errorRate: number
  avgDuration: number
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  endpointStats: EndpointStats[]
  topErrors: Array<{
    error: string
    count: number
    percentage: number
  }>
  generatedAt: Date
}

interface EndpointStats {
  name: string
  requests: number
  avgDuration: number
  p95Duration: number
  errors: number
  errorRate: number
}

interface SystemHealth {
  overall: number
  api: {
    health: number
    avgResponseTime: number
    errorRate: number
    requestsPerMinute: number
  }
  database: {
    health: number
    avgQueryTime: number
    activeConnections: number
  }
  cache: {
    hitRate: number
    operations: number
    avgLatency: number
  }
  timestamp: Date
}

interface SlowOperation {
  operation: string
  type: string
  duration: number
  timestamp: Date
}

interface ErrorSummary {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByEndpoint: Record<string, number>
  timeRange: string
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Decorator for automatic performance tracking
export function trackPerformance(metricName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const name = metricName || `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      return PerformanceMonitor.trackApiCall(
        name,
        'FUNCTION',
        () => method.apply(this, args)
      )
    }

    return descriptor
  }
}

export default PerformanceMonitor