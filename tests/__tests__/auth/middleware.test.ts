import { SecurityMiddleware } from '@/lib/auth/middleware'
import { MockRequest, TestDataFactory, ErrorHelpers } from '../../setup/test-helpers'
import { Permission } from '@/lib/auth/rbac'
import { NextResponse } from 'next/server'

// Mock the modules
jest.mock('@/lib/auth/jwt-service')
jest.mock('@/lib/cache/redis-cache')
jest.mock('@upstash/ratelimit')

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should pass for valid JWT token', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true
      })

      expect(result.success).toBe(true)
    })

    it('should fail for missing authorization header', async () => {
      const request = MockRequest.create()

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Missing authorization header')
    })

    it('should fail for invalid JWT format', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'InvalidToken'
        }
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid authorization format')
    })

    it('should fail for expired JWT token', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'Bearer expired-jwt-token'
        }
      })

      // Mock JWT service to return expired token error
      const { JWTService } = require('@/lib/auth/jwt-service')
      JWTService.verifyToken.mockRejectedValue(new Error('Token expired'))

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token expired')
    })
  })

  describe('Authorization', () => {
    it('should pass for users with required permissions', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'Bearer valid-jwt-token',
          'x-user-id': 'user-123'
        }
      })

      // Mock user with MANAGER role
      const { JWTService } = require('@/lib/auth/jwt-service')
      JWTService.verifyToken.mockResolvedValue({
        userId: 'user-123',
        role: 'MANAGER'
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true,
        permissions: [Permission.VIEW_REPORTS]
      })

      expect(result.success).toBe(true)
    })

    it('should fail for users without required permissions', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'Bearer valid-jwt-token',
          'x-user-id': 'user-123'
        }
      })

      // Mock user with VIEWER role
      const { JWTService } = require('@/lib/auth/jwt-service')
      JWTService.verifyToken.mockResolvedValue({
        userId: 'user-123',
        role: 'VIEWER'
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true,
        permissions: [Permission.MANAGE_USERS]
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient permissions')
    })
  })

  describe('Rate Limiting', () => {
    it('should pass when under rate limit', async () => {
      const request = MockRequest.create()

      // Mock rate limiter to allow request
      const { Ratelimit } = require('@upstash/ratelimit')
      const mockLimit = jest.fn().mockResolvedValue({
        success: true,
        remaining: 99,
        reset: Date.now() + 60000
      })
      Ratelimit.mockImplementation(() => ({ limit: mockLimit }))

      const result = await SecurityMiddleware.securityCheck(request, {
        rateLimit: { limit: 100, window: 60 }
      })

      expect(result.success).toBe(true)
    })

    it('should fail when rate limit exceeded', async () => {
      const request = MockRequest.create()

      // Mock rate limiter to deny request
      const { Ratelimit } = require('@upstash/ratelimit')
      const mockLimit = jest.fn().mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000
      })
      Ratelimit.mockImplementation(() => ({ limit: mockLimit }))

      const result = await SecurityMiddleware.securityCheck(request, {
        rateLimit: { limit: 100, window: 60 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
    })
  })

  describe('CSRF Protection', () => {
    it('should pass for GET requests without CSRF check', async () => {
      const request = MockRequest.create({ method: 'GET' })

      const result = await SecurityMiddleware.securityCheck(request, {
        skipCSRF: false
      })

      expect(result.success).toBe(true)
    })

    it('should require CSRF token for POST requests', async () => {
      const request = MockRequest.create({
        method: 'POST',
        headers: {}
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        skipCSRF: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('CSRF token required')
    })

    it('should pass with valid CSRF token', async () => {
      const request = MockRequest.create({
        method: 'POST',
        headers: {
          'x-csrf-token': 'valid-csrf-token'
        }
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        skipCSRF: false
      })

      expect(result.success).toBe(true)
    })

    it('should skip CSRF when explicitly disabled', async () => {
      const request = MockRequest.create({ method: 'POST' })

      const result = await SecurityMiddleware.securityCheck(request, {
        skipCSRF: true
      })

      expect(result.success).toBe(true)
    })
  })

  describe('IP Access Control', () => {
    it('should pass for whitelisted IPs', async () => {
      const request = MockRequest.create({
        headers: {
          'x-forwarded-for': '192.168.1.100'
        }
      })

      process.env.IP_WHITELIST = '192.168.1.0/24,10.0.0.0/8'

      const result = await SecurityMiddleware.securityCheck(request, {
        skipIPCheck: false
      })

      expect(result.success).toBe(true)
      delete process.env.IP_WHITELIST
    })

    it('should fail for non-whitelisted IPs when whitelist is active', async () => {
      const request = MockRequest.create({
        headers: {
          'x-forwarded-for': '203.0.113.100'
        }
      })

      process.env.IP_WHITELIST = '192.168.1.0/24'

      const result = await SecurityMiddleware.securityCheck(request, {
        skipIPCheck: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('IP not allowed')
      delete process.env.IP_WHITELIST
    })

    it('should pass when IP check is disabled', async () => {
      const request = MockRequest.create({
        headers: {
          'x-forwarded-for': '203.0.113.100'
        }
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        skipIPCheck: true
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Combined Security Checks', () => {
    it('should pass all security checks for valid request', async () => {
      const request = MockRequest.create({
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-jwt-token',
          'x-csrf-token': 'valid-csrf-token',
          'x-user-id': 'user-123'
        }
      })

      // Mock all services
      const { JWTService } = require('@/lib/auth/jwt-service')
      JWTService.verifyToken.mockResolvedValue({
        userId: 'user-123',
        role: 'MANAGER'
      })

      const { Ratelimit } = require('@upstash/ratelimit')
      const mockLimit = jest.fn().mockResolvedValue({
        success: true,
        remaining: 99,
        reset: Date.now() + 60000
      })
      Ratelimit.mockImplementation(() => ({ limit: mockLimit }))

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true,
        permissions: [Permission.VIEW_REPORTS],
        rateLimit: { limit: 100, window: 60 },
        skipCSRF: false,
        skipIPCheck: true
      })

      expect(result.success).toBe(true)
    })

    it('should fail if any security check fails', async () => {
      const request = MockRequest.create({
        method: 'POST',
        headers: {
          'authorization': 'Bearer invalid-jwt-token'
        }
      })

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true,
        permissions: [Permission.VIEW_REPORTS],
        rateLimit: { limit: 100, window: 60 }
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle JWT service errors gracefully', async () => {
      const request = MockRequest.create({
        headers: {
          'authorization': 'Bearer valid-jwt-token'
        }
      })

      const { JWTService } = require('@/lib/auth/jwt-service')
      JWTService.verifyToken.mockRejectedValue(ErrorHelpers.networkError())

      const result = await SecurityMiddleware.securityCheck(request, {
        requireAuth: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication service unavailable')
    })

    it('should handle rate limiter errors gracefully', async () => {
      const request = MockRequest.create()

      const { Ratelimit } = require('@upstash/ratelimit')
      const mockLimit = jest.fn().mockRejectedValue(ErrorHelpers.networkError())
      Ratelimit.mockImplementation(() => ({ limit: mockLimit }))

      const result = await SecurityMiddleware.securityCheck(request, {
        rateLimit: { limit: 100, window: 60 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limiting service unavailable')
    })
  })
})