import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Redis instance for rate limiting
const redis = Redis.fromEnv()

// Create different rate limiters for different use cases
export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
})

// Strict rate limiter for authentication endpoints
export const authRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 login attempts per minute
  analytics: true,
})

// API rate limiter for general API usage
export const apiRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, "1 h"), // 1000 API calls per hour
  analytics: true,
})

// Export rate limiter for heavy operations
export const exportRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 exports per hour
  analytics: true,
})

// Upload rate limiter for file uploads
export const uploadRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(50, "1 h"), // 50 uploads per hour
  analytics: true,
})

// Create custom rate limiter
export function createRateLimiter(requests: number, window: string) {
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  })
}

// Helper function to get rate limit identifier
export function getRateLimitIdentifier(
  request: Request,
  type: 'ip' | 'user' | 'session' = 'ip'
): string {
  switch (type) {
    case 'ip':
      const forwardedFor = request.headers.get('x-forwarded-for')
      const realIP = request.headers.get('x-real-ip')
      return forwardedFor?.split(',')[0] || realIP || 'unknown'
    
    case 'user':
      const authorization = request.headers.get('authorization')
      if (authorization) {
        // Extract user ID from token (simplified)
        return `user:${authorization.split(' ')[1]}`
      }
      return getRateLimitIdentifier(request, 'ip')
    
    case 'session':
      const sessionId = request.headers.get('x-session-id')
      return sessionId ? `session:${sessionId}` : getRateLimitIdentifier(request, 'ip')
    
    default:
      return getRateLimitIdentifier(request, 'ip')
  }
}

// Rate limiting middleware with custom configuration
export async function withRateLimit(
  identifier: string,
  limiter: Ratelimit = ratelimit
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  error?: string
}> {
  try {
    const result = await limiter.limit(identifier)
    
    if (!result.success) {
      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        error: `Rate limit exceeded. ${result.remaining} requests remaining. Resets at ${new Date(result.reset).toISOString()}`
      }
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fail open - don't block requests if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      error: 'Rate limiting service unavailable'
    }
  }
}

// Burst protection for sensitive operations
export const sensitiveOperationLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(1, "10 s"), // 1 request every 10 seconds
  analytics: true,
})

// DDoS protection
export const ddosProtectionLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 s"), // 10 requests per second max
  analytics: true,
})

export default ratelimit