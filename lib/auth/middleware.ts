import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'
import { RBACService, Permission, UserRole } from './rbac'
import { ratelimit } from '@/lib/security/ratelimit'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: UserRole
    organizationId: string
  }
}

export class SecurityMiddleware {
  /**
   * JWT Authentication middleware
   */
  static async authenticate(request: NextRequest): Promise<{
    success: boolean
    user?: any
    error?: string
  }> {
    try {
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Missing or invalid authorization header' }
      }

      const token = authHeader.substring(7)
      
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured')
      }

      const decoded = verify(token, process.env.JWT_SECRET) as any
      
      // Get fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          isActive: true,
          lastLoginAt: true
        }
      })

      if (!user || !user.isActive) {
        return { success: false, error: 'User not found or inactive' }
      }

      // Update last activity
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      return { success: true, user }
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: 'Invalid token' }
    }
  }

  /**
   * Role-based authorization middleware
   */
  static requirePermissions(...permissions: Permission[]) {
    return async (request: NextRequest, user: any) => {
      const rbacContext = RBACService.createContext(user)
      
      if (!RBACService.hasAllPermissions(rbacContext, permissions)) {
        throw new Error(`Insufficient permissions. Required: ${permissions.join(', ')}`)
      }
      
      return true
    }
  }

  /**
   * Rate limiting middleware
   */
  static async rateLimit(
    request: NextRequest,
    identifier: string,
    limit: number = 100,
    window: number = 60 * 1000 // 1 minute
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { success, limit: currentLimit, remaining, reset } = await ratelimit.limit(identifier)
      
      if (!success) {
        return {
          success: false,
          error: `Rate limit exceeded. Try again in ${Math.round((reset - Date.now()) / 1000)} seconds.`
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Don't block requests if rate limiting fails
      return { success: true }
    }
  }

  /**
   * Input validation and sanitization
   */
  static validateAndSanitizeInput(data: any, schema: any) {
    // This would use a validation library like Zod
    // For now, basic sanitization
    if (typeof data === 'string') {
      // Remove potential XSS
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.validateAndSanitizeInput(value, schema)
      }
      return sanitized
    }
    
    return data
  }

  /**
   * CSRF protection
   */
  static validateCSRFToken(request: NextRequest): boolean {
    // Skip CSRF validation for GET requests
    if (request.method === 'GET') return true

    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.cookies.get('csrf-token')?.value

    const sessionToken = request.cookies.get('session-token')?.value

    // Implement CSRF token validation logic
    // This is a simplified version
    return csrfToken === sessionToken
  }

  /**
   * IP allowlist/blocklist check
   */
  static async checkIPAccess(request: NextRequest): Promise<boolean> {
    const ip = this.getClientIP(request)
    
    // Check if IP is in blocklist
    const blockedIP = await prisma.blockedIP.findFirst({
      where: { 
        ipAddress: ip,
        isActive: true
      }
    })

    if (blockedIP) return false

    // Check if organization has IP restrictions
    const forwardedFor = request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent')

    // Log suspicious activity
    if (this.isSuspiciousActivity(ip, userAgent)) {
      await this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
        ip,
        userAgent,
        path: request.nextUrl.pathname
      })
    }

    return true
  }

  /**
   * Get client IP address
   */
  static getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfIP = request.headers.get('cf-connecting-ip')

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    if (cfIP) {
      return cfIP
    }

    return 'unknown'
  }

  /**
   * Check for suspicious activity patterns
   */
  static isSuspiciousActivity(ip: string, userAgent?: string | null): boolean {
    // Check for common bot patterns
    if (userAgent) {
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i
      ]
      
      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        return true
      }
    }

    // Check for suspicious IP patterns (this would be more sophisticated in production)
    const suspiciousIPs = [
      '127.0.0.1', // localhost attempts from non-local contexts
      '0.0.0.0'
    ]

    return suspiciousIPs.includes(ip)
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    eventType: string,
    metadata: Record<string, any>,
    userId?: string
  ) {
    try {
      await prisma.securityEvent.create({
        data: {
          eventType,
          metadata,
          userId,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Combined security middleware
   */
  static async securityCheck(
    request: NextRequest,
    options: {
      requireAuth?: boolean
      permissions?: Permission[]
      rateLimit?: { limit: number; window: number }
      skipCSRF?: boolean
      skipIPCheck?: boolean
    } = {}
  ) {
    const {
      requireAuth = true,
      permissions = [],
      rateLimit,
      skipCSRF = false,
      skipIPCheck = false
    } = options

    let user = null

    // IP Access Check
    if (!skipIPCheck) {
      const ipAllowed = await this.checkIPAccess(request)
      if (!ipAllowed) {
        return NextResponse.json(
          { error: 'Access denied from this IP address' },
          { status: 403 }
        )
      }
    }

    // Rate Limiting
    if (rateLimit) {
      const identifier = this.getClientIP(request)
      const rateLimitResult = await this.rateLimit(
        request,
        identifier,
        rateLimit.limit,
        rateLimit.window
      )
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: rateLimitResult.error },
          { status: 429 }
        )
      }
    }

    // CSRF Protection
    if (!skipCSRF && !this.validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    // Authentication
    if (requireAuth) {
      const authResult = await this.authenticate(request)
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error },
          { status: 401 }
        )
      }
      user = authResult.user
    }

    // Authorization
    if (permissions.length > 0 && user) {
      try {
        await this.requirePermissions(...permissions)(request, user)
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: 403 }
        )
      }
    }

    return { success: true, user }
  }
}

/**
 * API route wrapper with security middleware
 */
export function withSecurity(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  options?: Parameters<typeof SecurityMiddleware.securityCheck>[1]
) {
  return async (request: NextRequest, context: any) => {
    const securityResult = await SecurityMiddleware.securityCheck(request, options)
    
    if (securityResult instanceof NextResponse) {
      return securityResult
    }

    // Add user to request headers for downstream handlers
    if (securityResult.user) {
      const headers = new Headers(request.headers)
      headers.set('x-user-id', securityResult.user.id)
      headers.set('x-user-role', securityResult.user.role)
      headers.set('x-organization-id', securityResult.user.organizationId)
      
      const newRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body
      })

      return handler(newRequest, context)
    }

    return handler(request, context)
  }
}

export default SecurityMiddleware