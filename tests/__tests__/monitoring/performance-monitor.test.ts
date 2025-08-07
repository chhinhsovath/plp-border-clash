import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'
import { MockRequest, TestDataFactory, PerformanceHelpers, AsyncHelpers } from '../../setup/test-helpers'

// Mock Redis cache
jest.mock('@/lib/cache/redis-cache')

describe('Performance Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset performance monitor state
    PerformanceMonitor['metrics'] = []
    PerformanceMonitor['healthChecks'] = new Map()
  })

  describe('API Call Tracking', () => {
    it('should track successful API calls', async () => {
      const request = MockRequest.create({
        url: 'http://localhost:3000/api/reports',
        method: 'GET'
      })

      const mockOperation = jest.fn().mockResolvedValue({ success: true })
      
      const result = await PerformanceMonitor.trackApiCall(
        '/api/reports',
        'GET',
        mockOperation,
        request
      )

      expect(result).toEqual({ success: true })
      expect(mockOperation).toHaveBeenCalled()
      
      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        endpoint: '/api/reports',
        method: 'GET',
        success: true,
        responseSize: expect.any(Number),
        duration: expect.any(Number)
      })
    })

    it('should track failed API calls', async () => {
      const request = MockRequest.create()
      const error = new Error('Database error')
      const mockOperation = jest.fn().mockRejectedValue(error)
      
      await expect(PerformanceMonitor.trackApiCall(
        '/api/reports',
        'POST',
        mockOperation,
        request
      )).rejects.toThrow('Database error')

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        endpoint: '/api/reports',
        method: 'POST',
        success: false,
        error: 'Database error'
      })
    })

    it('should track response times accurately', async () => {
      const request = MockRequest.create()
      const mockOperation = jest.fn().mockImplementation(async () => {
        await AsyncHelpers.delay(100) // Simulate 100ms operation
        return { data: 'test' }
      })

      await PerformanceMonitor.trackApiCall(
        '/api/test',
        'GET',
        mockOperation,
        request
      )

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0].duration).toBeGreaterThanOrEqual(100)
      expect(metrics[0].duration).toBeLessThan(200) // Allow some margin
    })

    it('should capture user and organization context', async () => {
      const request = MockRequest.create({
        headers: {
          'x-user-id': 'user-456',
          'x-organization-id': 'org-789'
        }
      })

      const mockOperation = jest.fn().mockResolvedValue({ success: true })

      await PerformanceMonitor.trackApiCall(
        '/api/reports',
        'GET',
        mockOperation,
        request
      )

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        userId: 'user-456',
        organizationId: 'org-789'
      })
    })
  })

  describe('Database Query Tracking', () => {
    it('should track database query performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])

      const result = await PerformanceMonitor.trackDatabaseQuery(
        'users',
        'findMany',
        mockQuery,
        'user-123'
      )

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      expect(mockQuery).toHaveBeenCalled()

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0]).toMatchObject({
        type: 'database',
        operation: 'users.findMany',
        success: true,
        recordCount: 2,
        userId: 'user-123'
      })
    })

    it('should track failed database queries', async () => {
      const error = new Error('Connection timeout')
      const mockQuery = jest.fn().mockRejectedValue(error)

      await expect(PerformanceMonitor.trackDatabaseQuery(
        'reports',
        'create',
        mockQuery
      )).rejects.toThrow('Connection timeout')

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        type: 'database',
        operation: 'reports.create',
        success: false,
        error: 'Connection timeout'
      })
    })

    it('should handle null/undefined query results', async () => {
      const mockQuery = jest.fn().mockResolvedValue(null)

      const result = await PerformanceMonitor.trackDatabaseQuery(
        'users',
        'findUnique',
        mockQuery
      )

      expect(result).toBeNull()
      
      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        recordCount: 0,
        success: true
      })
    })
  })

  describe('Cache Operation Tracking', () => {
    it('should track cache hits and misses', async () => {
      const mockCacheGet = jest.fn().mockResolvedValue({ cached: true })

      const result = await PerformanceMonitor.trackCacheOperation(
        'get',
        'users:user-123',
        mockCacheGet
      )

      expect(result).toEqual({ cached: true })

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        type: 'cache',
        operation: 'get',
        key: 'users:user-123',
        hit: true,
        success: true
      })
    })

    it('should track cache misses', async () => {
      const mockCacheGet = jest.fn().mockResolvedValue(null)

      const result = await PerformanceMonitor.trackCacheOperation(
        'get',
        'users:missing',
        mockCacheGet
      )

      expect(result).toBeNull()

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        hit: false,
        success: true
      })
    })

    it('should track cache set operations', async () => {
      const mockCacheSet = jest.fn().mockResolvedValue(true)

      await PerformanceMonitor.trackCacheOperation(
        'set',
        'users:user-123',
        mockCacheSet
      )

      const metrics = PerformanceMonitor.getMetrics()
      expect(metrics[0]).toMatchObject({
        operation: 'set',
        success: true
      })
    })
  })

  describe('Performance Statistics', () => {
    beforeEach(async () => {
      // Add sample metrics
      const request = MockRequest.create()
      
      // Add successful API calls
      await PerformanceMonitor.trackApiCall('/api/reports', 'GET', 
        async () => ({ data: 'test' }), request)
      await PerformanceMonitor.trackApiCall('/api/users', 'POST', 
        async () => ({ data: 'test' }), request)
      
      // Add a failed API call
      await PerformanceMonitor.trackApiCall('/api/error', 'GET', 
        async () => { throw new Error('Test error') }, request).catch(() => {})
    })

    it('should calculate performance statistics correctly', async () => {
      const stats = await PerformanceMonitor.getPerformanceStats()

      expect(stats).toMatchObject({
        totalRequests: 3,
        successRate: expect.any(Number),
        averageResponseTime: expect.any(Number),
        p50ResponseTime: expect.any(Number),
        p95ResponseTime: expect.any(Number),
        p99ResponseTime: expect.any(Number),
        requestsPerMinute: expect.any(Number),
        errorRate: expect.any(Number)
      })

      expect(stats.successRate).toBeCloseTo(66.67, 1) // 2/3 success rate
    })

    it('should provide endpoint-specific statistics', async () => {
      const stats = await PerformanceMonitor.getEndpointStats('/api/reports')

      expect(stats).toMatchObject({
        endpoint: '/api/reports',
        totalRequests: 1,
        successRate: 100,
        averageResponseTime: expect.any(Number)
      })
    })

    it('should return empty stats when no metrics exist', async () => {
      PerformanceMonitor['metrics'] = []
      
      const stats = await PerformanceMonitor.getPerformanceStats()

      expect(stats).toMatchObject({
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0
      })
    })
  })

  describe('Health Checks', () => {
    it('should register and run health checks', async () => {
      const healthCheck = jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 50,
        details: { connected: true }
      })

      PerformanceMonitor.registerHealthCheck('database', healthCheck)
      
      const health = await PerformanceMonitor.getSystemHealth()

      expect(health).toMatchObject({
        overall: 'healthy',
        checks: {
          database: {
            status: 'healthy',
            responseTime: 50,
            details: { connected: true }
          }
        }
      })
    })

    it('should handle failing health checks', async () => {
      const failingCheck = jest.fn().mockRejectedValue(new Error('Service unavailable'))

      PerformanceMonitor.registerHealthCheck('redis', failingCheck)
      
      const health = await PerformanceMonitor.getSystemHealth()

      expect(health).toMatchObject({
        overall: 'unhealthy',
        checks: {
          redis: {
            status: 'unhealthy',
            error: 'Service unavailable'
          }
        }
      })
    })

    it('should determine overall health status', async () => {
      const healthyCheck = jest.fn().mockResolvedValue({ status: 'healthy' })
      const degradedCheck = jest.fn().mockResolvedValue({ status: 'degraded' })

      PerformanceMonitor.registerHealthCheck('service1', healthyCheck)
      PerformanceMonitor.registerHealthCheck('service2', degradedCheck)
      
      const health = await PerformanceMonitor.getSystemHealth()

      expect(health.overall).toBe('degraded') // Worst status wins
    })
  })

  describe('Alerting', () => {
    it('should trigger alerts for high error rates', async () => {
      const alertSpy = jest.spyOn(PerformanceMonitor as any, 'triggerAlert')
      
      // Simulate high error rate
      const request = MockRequest.create()
      const errorOp = async () => { throw new Error('Simulated error') }
      
      // Add multiple failed requests
      for (let i = 0; i < 10; i++) {
        await PerformanceMonitor.trackApiCall(
          '/api/test', 'GET', errorOp, request
        ).catch(() => {})
      }

      await PerformanceMonitor.checkAlertConditions()

      expect(alertSpy).toHaveBeenCalledWith(
        'HIGH_ERROR_RATE',
        expect.objectContaining({
          errorRate: 100,
          threshold: expect.any(Number)
        })
      )
    })

    it('should trigger alerts for high response times', async () => {
      const alertSpy = jest.spyOn(PerformanceMonitor as any, 'triggerAlert')
      
      const request = MockRequest.create()
      const slowOp = async () => {
        await AsyncHelpers.delay(2000) // 2 second delay
        return { data: 'slow' }
      }
      
      await PerformanceMonitor.trackApiCall('/api/slow', 'GET', slowOp, request)
      await PerformanceMonitor.checkAlertConditions()

      expect(alertSpy).toHaveBeenCalledWith(
        'HIGH_RESPONSE_TIME',
        expect.objectContaining({
          averageResponseTime: expect.any(Number),
          threshold: expect.any(Number)
        })
      )
    })
  })

  describe('Metrics Cleanup', () => {
    it('should clean up old metrics', () => {
      // Add old metrics
      const oldMetric = {
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        type: 'api',
        endpoint: '/api/old'
      }
      
      PerformanceMonitor['metrics'].push(oldMetric as any)
      
      PerformanceMonitor.cleanupOldMetrics()
      
      const remainingMetrics = PerformanceMonitor.getMetrics()
      expect(remainingMetrics).not.toContain(oldMetric)
    })

    it('should keep recent metrics', () => {
      const recentMetric = {
        timestamp: new Date(),
        type: 'api',
        endpoint: '/api/recent'
      }
      
      PerformanceMonitor['metrics'].push(recentMetric as any)
      
      PerformanceMonitor.cleanupOldMetrics()
      
      const remainingMetrics = PerformanceMonitor.getMetrics()
      expect(remainingMetrics).toContain(recentMetric)
    })
  })

  describe('Performance Optimization Detection', () => {
    it('should detect slow database queries', async () => {
      const slowQuery = jest.fn().mockImplementation(async () => {
        await AsyncHelpers.delay(500) // 500ms query
        return [{ id: 1 }]
      })

      await PerformanceMonitor.trackDatabaseQuery(
        'reports',
        'findMany',
        slowQuery
      )

      const metrics = PerformanceMonitor.getMetrics()
      const queryMetric = metrics[0]
      
      expect(queryMetric.duration).toBeGreaterThan(400)
      // In a real system, this would trigger optimization alerts
    })

    it('should track memory usage patterns', () => {
      const beforeMemory = process.memoryUsage()
      
      // Simulate some work
      const largeArray = new Array(10000).fill('test data')
      
      const afterMemory = process.memoryUsage()
      
      expect(afterMemory.heapUsed).toBeGreaterThan(beforeMemory.heapUsed)
      
      // Clean up
      largeArray.length = 0
    })
  })
})