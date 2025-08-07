import { NextRequest } from 'next/server'
import { jest } from '@jest/globals'

/**
 * Test data factories for creating consistent test objects
 */
export class TestDataFactory {
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'COORDINATOR',
      organizationId: 'org-123',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-15'),
      ...overrides
    }
  }

  static createOrganization(overrides: Partial<any> = {}) {
    return {
      id: 'org-123',
      name: 'Test Humanitarian Org',
      description: 'Test organization for humanitarian work',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      ...overrides
    }
  }

  static createReport(overrides: Partial<any> = {}) {
    return {
      id: 'report-123',
      title: 'Test Humanitarian Report',
      description: 'A test report for crisis response',
      status: 'DRAFT',
      version: 1,
      slug: 'test-humanitarian-report',
      authorId: 'user-123',
      organizationId: 'org-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      publishedAt: null,
      author: TestDataFactory.createUser(),
      sections: [],
      collaborators: [],
      comments: [],
      ...overrides
    }
  }

  static createReportSection(overrides: Partial<any> = {}) {
    return {
      id: 'section-123',
      reportId: 'report-123',
      title: 'Executive Summary',
      type: 'TEXT',
      content: { text: 'This is a test section content' },
      order: 1,
      isVisible: true,
      createdAt: new Date('2024-01-01'),
      files: [],
      ...overrides
    }
  }

  static createAssessment(overrides: Partial<any> = {}) {
    return {
      id: 'assessment-123',
      title: 'Crisis Assessment - Test Region',
      type: 'RAPID',
      location: 'Test Location',
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      affectedPeople: 10000,
      households: 2000,
      organizationId: 'org-123',
      createdById: 'user-123',
      createdAt: new Date('2024-01-01'),
      data: {
        leadAgency: 'Test Relief Agency',
        totalPopulation: 50000,
        affectedPopulation: 10000,
        demographics: {
          children0to5: 1000,
          children6to17: 2000,
          adults18to59: 5000,
          elderly60plus: 2000
        }
      },
      createdBy: TestDataFactory.createUser(),
      ...overrides
    }
  }

  static createAuditLog(overrides: Partial<any> = {}) {
    return {
      id: 'audit-123',
      userId: 'user-123',
      action: 'CREATE_REPORT',
      entity: 'Report',
      entityId: 'report-123',
      organizationId: 'org-123',
      success: true,
      timestamp: new Date('2024-01-01'),
      metadata: {},
      severity: 'LOW',
      ...overrides
    }
  }

  static createNotification(overrides: Partial<any> = {}) {
    return {
      id: 'notif-123',
      userId: 'user-123',
      type: 'SYSTEM',
      title: 'Test Notification',
      message: 'This is a test notification',
      isRead: false,
      createdAt: new Date('2024-01-01'),
      data: {},
      ...overrides
    }
  }
}

/**
 * Mock request helper
 */
export class MockRequest {
  static create(options: {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  } = {}) {
    const {
      url = 'http://localhost:3000/api/test',
      method = 'GET',
      headers = {},
      body,
      searchParams = {}
    } = options

    const urlObj = new URL(url)
    Object.entries(searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value)
    })

    const request = {
      url: urlObj.toString(),
      method,
      headers: new Headers({
        'content-type': 'application/json',
        'x-user-id': 'user-123',
        'x-organization-id': 'org-123',
        ...headers
      }),
      json: jest.fn().mockResolvedValue(body),
      nextUrl: urlObj
    } as unknown as NextRequest

    return request
  }
}

/**
 * Database mock helpers
 */
export class DatabaseMocks {
  static mockPrisma() {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      report: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      assessment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
      },
      notification: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn()
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      $disconnect: jest.fn()
    }

    return mockPrisma
  }

  static setupUserMocks(mockPrisma: any) {
    mockPrisma.user.findUnique.mockResolvedValue(TestDataFactory.createUser())
    mockPrisma.user.findMany.mockResolvedValue([TestDataFactory.createUser()])
    mockPrisma.user.create.mockResolvedValue(TestDataFactory.createUser())
    mockPrisma.user.update.mockResolvedValue(TestDataFactory.createUser())
    mockPrisma.user.count.mockResolvedValue(1)
  }

  static setupReportMocks(mockPrisma: any) {
    mockPrisma.report.findUnique.mockResolvedValue(TestDataFactory.createReport())
    mockPrisma.report.findFirst.mockResolvedValue(TestDataFactory.createReport())
    mockPrisma.report.findMany.mockResolvedValue([TestDataFactory.createReport()])
    mockPrisma.report.create.mockResolvedValue(TestDataFactory.createReport())
    mockPrisma.report.update.mockResolvedValue(TestDataFactory.createReport())
    mockPrisma.report.count.mockResolvedValue(1)
  }

  static setupAssessmentMocks(mockPrisma: any) {
    mockPrisma.assessment.findUnique.mockResolvedValue(TestDataFactory.createAssessment())
    mockPrisma.assessment.findFirst.mockResolvedValue(TestDataFactory.createAssessment())
    mockPrisma.assessment.findMany.mockResolvedValue([TestDataFactory.createAssessment()])
    mockPrisma.assessment.create.mockResolvedValue(TestDataFactory.createAssessment())
    mockPrisma.assessment.update.mockResolvedValue(TestDataFactory.createAssessment())
    mockPrisma.assessment.count.mockResolvedValue(1)
  }
}

/**
 * Cache mock helpers
 */
export class CacheMocks {
  static mockRedisCache() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      setWithRefresh: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      invalidateByTags: jest.fn(),
      clearNamespace: jest.fn(),
      getStats: jest.fn()
    }
  }

  static setupCacheMocks(mockCache: any) {
    mockCache.get.mockResolvedValue(null) // Cache miss by default
    mockCache.set.mockResolvedValue(true)
    mockCache.del.mockResolvedValue(true)
    mockCache.exists.mockResolvedValue(false)
    mockCache.setWithRefresh.mockImplementation((ns, key, fetchFn) => fetchFn())
    mockCache.getStats.mockResolvedValue({
      totalKeys: 100,
      memoryUsage: '1MB',
      hitRate: 0.85,
      namespaces: { users: 20, reports: 50, api: 30 }
    })
  }
}

/**
 * Authentication helpers
 */
export class AuthHelpers {
  static mockJWT() {
    return {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn().mockReturnValue({ userId: 'user-123', role: 'COORDINATOR' })
    }
  }

  static createAuthHeaders(userId = 'user-123', orgId = 'org-123') {
    return {
      'authorization': 'Bearer mock-jwt-token',
      'x-user-id': userId,
      'x-organization-id': orgId
    }
  }
}

/**
 * Performance testing helpers
 */
export class PerformanceHelpers {
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  }

  static expectPerformance<T>(
    fn: () => Promise<T>,
    maxDuration: number
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const { result, duration } = await this.measureTime(fn)
      
      if (duration > maxDuration) {
        reject(new Error(`Performance test failed: ${duration}ms > ${maxDuration}ms`))
      } else {
        resolve(result)
      }
    })
  }
}

/**
 * Error simulation helpers
 */
export class ErrorHelpers {
  static networkError() {
    return new Error('Network error')
  }

  static databaseError() {
    const error = new Error('Database connection failed')
    error.name = 'DatabaseError'
    return error
  }

  static authenticationError() {
    const error = new Error('Authentication failed')
    error.name = 'AuthenticationError'
    return error
  }

  static validationError(field: string) {
    const error = new Error(`Validation failed for field: ${field}`)
    error.name = 'ValidationError'
    return error
  }
}

/**
 * Async testing utilities
 */
export class AsyncHelpers {
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000
  ): Promise<void> {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      await this.delay(100)
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  }

  static createTimeoutPromise<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ])
  }
}

export {
  TestDataFactory,
  MockRequest,
  DatabaseMocks,
  CacheMocks,
  AuthHelpers,
  PerformanceHelpers,
  ErrorHelpers,
  AsyncHelpers
}