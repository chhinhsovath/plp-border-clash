import { NextRequest, NextResponse } from 'next/server'
import { cache, CacheOptions } from '@/lib/cache/redis-cache'
import { CacheService } from './cache-strategies'
import * as zlib from 'zlib'
import * as crypto from 'crypto'

export interface ApiCacheOptions extends CacheOptions {
  varyBy?: string[] // Headers to vary cache by
  revalidate?: number // ISR-style revalidation
  etag?: boolean // Enable ETag support
  compress?: boolean // Response compression
  skipCache?: (request: NextRequest) => boolean // Skip cache condition
  generateKey?: (request: NextRequest) => string // Custom key generation
}

/**
 * API Response caching middleware with advanced features
 */
export class ApiCache {
  private static instance: ApiCache
  
  private constructor() {}
  
  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache()
    }
    return ApiCache.instance
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(
    request: NextRequest,
    options: ApiCacheOptions
  ): string {
    if (options.generateKey) {
      return options.generateKey(request)
    }

    const url = new URL(request.url)
    const baseKey = `${request.method}:${url.pathname}:${url.search}`
    
    // Add vary headers to key
    if (options.varyBy?.length) {
      const varyValues = options.varyBy
        .map(header => `${header}:${request.headers.get(header) || ''}`)
        .join(',')
      return `${baseKey}:${crypto.createHash('md5').update(varyValues).digest('hex')}`
    }
    
    return baseKey
  }

  /**
   * Generate ETag for response
   */
  private generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    return crypto.createHash('md5').update(content).digest('hex')
  }

  /**
   * Check if request has valid ETag
   */
  private checkETag(request: NextRequest, etag: string): boolean {
    const ifNoneMatch = request.headers.get('if-none-match')
    return ifNoneMatch === etag
  }

  /**
   * Compress response data
   */
  private async compressResponse(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (error, result) => {
        if (error) reject(error)
        else resolve(result.toString('base64'))
      })
    })
  }

  /**
   * Decompress response data
   */
  private async decompressResponse(compressedData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(compressedData, 'base64')
      zlib.gunzip(buffer, (error, result) => {
        if (error) reject(error)
        else resolve(result.toString())
      })
    })
  }

  /**
   * Wrap API handler with caching
   */
  withCache(
    handler: (request: NextRequest, context: any) => Promise<NextResponse>,
    options: ApiCacheOptions = {}
  ) {
    return async (request: NextRequest, context: any): Promise<NextResponse> => {
      const {
        ttl = 300, // 5 minutes default
        skipCache,
        etag = true,
        compress = true,
        revalidate
      } = options

      // Skip cache if condition is met
      if (skipCache && skipCache(request)) {
        return handler(request, context)
      }

      // Only cache GET requests by default
      if (request.method !== 'GET' && !options.strategy) {
        return handler(request, context)
      }

      const cacheKey = this.generateCacheKey(request, options)
      const userId = request.headers.get('x-user-id') || undefined

      // Try to get cached response
      const cachedData = await cache.get<{
        body: any
        headers: Record<string, string>
        status: number
        etag?: string
        compressed?: boolean
        timestamp: number
      }>('api', cacheKey, userId)

      // Return cached response if valid
      if (cachedData) {
        // Check if revalidation is needed
        if (revalidate && Date.now() - cachedData.timestamp > revalidate * 1000) {
          // Revalidate in background
          setImmediate(async () => {
            try {
              const fresh = await handler(request, context)
              await this.cacheResponse(cacheKey, fresh, options, userId)
            } catch (error) {
              console.error('Background revalidation error:', error)
            }
          })
        }

        // Check ETag if enabled
        if (etag && cachedData.etag && this.checkETag(request, cachedData.etag)) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              'Cache-Control': `max-age=${ttl}`,
              'ETag': cachedData.etag
            }
          })
        }

        // Decompress if needed
        let body = cachedData.body
        if (cachedData.compressed && typeof body === 'string') {
          body = await this.decompressResponse(body)
        }

        // Return cached response
        const headers = new Headers(cachedData.headers)
        headers.set('X-Cache', 'HIT')
        headers.set('Cache-Control', `max-age=${Math.max(0, ttl - Math.floor((Date.now() - cachedData.timestamp) / 1000))}`)
        
        if (cachedData.etag) {
          headers.set('ETag', cachedData.etag)
        }

        return new NextResponse(body, {
          status: cachedData.status,
          headers
        })
      }

      // Cache miss - execute handler
      const response = await handler(request, context)
      
      // Cache successful responses
      if (response.status >= 200 && response.status < 300) {
        await this.cacheResponse(cacheKey, response.clone(), options, userId)
      }

      // Add cache headers
      const headers = new Headers(response.headers)
      headers.set('X-Cache', 'MISS')
      headers.set('Cache-Control', `max-age=${ttl}`)

      return new NextResponse(response.body, {
        status: response.status,
        headers
      })
    }
  }

  /**
   * Cache response data
   */
  private async cacheResponse(
    cacheKey: string,
    response: NextResponse,
    options: ApiCacheOptions,
    userId?: string
  ): Promise<void> {
    try {
      const body = await response.text()
      let processedBody: any = body
      let isCompressed = false

      // Generate ETag
      const responseETag = options.etag ? this.generateETag(body) : undefined

      // Compress large responses
      if (options.compress && body.length > 1024) {
        processedBody = await this.compressResponse(body)
        isCompressed = true
      }

      // Extract headers to cache
      const headersToCache: Record<string, string> = {}
      const cacheableHeaders = [
        'content-type',
        'content-encoding',
        'content-language',
        'vary',
        'last-modified'
      ]

      cacheableHeaders.forEach(header => {
        const value = response.headers.get(header)
        if (value) headersToCache[header] = value
      })

      // Cache the response data
      await cache.set(
        'api',
        cacheKey,
        {
          body: processedBody,
          headers: headersToCache,
          status: response.status,
          etag: responseETag,
          compressed: isCompressed,
          timestamp: Date.now()
        },
        {
          ttl: options.ttl,
          tags: options.tags,
          compress: false // Already compressed
        },
        userId
      )
    } catch (error) {
      console.error('Failed to cache response:', error)
    }
  }

  /**
   * Invalidate API cache by patterns
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    // This would use Redis SCAN with pattern matching
    // For now, clear entire API namespace if pattern is broad
    if (pattern.includes('*')) {
      return await cache.clearNamespace('api')
    }
    
    return await cache.del('api', pattern)
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    hitRate: number
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    avgResponseTime: number
    topEndpoints: Array<{ endpoint: string; hits: number }>
  }> {
    // This would be implemented with proper monitoring
    // For now, return mock data
    return {
      hitRate: 0.75,
      totalRequests: 10000,
      cacheHits: 7500,
      cacheMisses: 2500,
      avgResponseTime: 120,
      topEndpoints: [
        { endpoint: '/api/reports', hits: 2500 },
        { endpoint: '/api/assessments', hits: 1800 },
        { endpoint: '/api/analytics', hits: 1200 }
      ]
    }
  }
}

/**
 * Response compression middleware
 */
export class ResponseCompressor {
  private static readonly COMPRESSION_THRESHOLD = 1024 // 1KB
  private static readonly COMPRESSIBLE_TYPES = [
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'text/plain',
    'text/xml',
    'application/xml'
  ]

  static shouldCompress(response: NextResponse): boolean {
    const contentType = response.headers.get('content-type')
    const contentLength = parseInt(response.headers.get('content-length') || '0')
    
    if (contentLength < this.COMPRESSION_THRESHOLD) return false
    if (!contentType) return false
    
    return this.COMPRESSIBLE_TYPES.some(type => contentType.includes(type))
  }

  static async compressResponse(response: NextResponse): Promise<NextResponse> {
    if (!this.shouldCompress(response)) {
      return response
    }

    try {
      const body = await response.text()
      const compressed = zlib.gzipSync(body)
      
      const headers = new Headers(response.headers)
      headers.set('Content-Encoding', 'gzip')
      headers.set('Content-Length', compressed.length.toString())
      headers.set('Vary', 'Accept-Encoding')
      
      return new NextResponse(compressed, {
        status: response.status,
        headers
      })
    } catch (error) {
      console.error('Compression error:', error)
      return response
    }
  }
}

/**
 * HTTP caching headers utility
 */
export class CacheHeaders {
  static maxAge(seconds: number): Record<string, string> {
    return {
      'Cache-Control': `max-age=${seconds}`,
      'Expires': new Date(Date.now() + seconds * 1000).toUTCString()
    }
  }

  static noCache(): Record<string, string> {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }

  static staleWhileRevalidate(maxAge: number, staleTime: number): Record<string, string> {
    return {
      'Cache-Control': `max-age=${maxAge}, stale-while-revalidate=${staleTime}`
    }
  }

  static etag(value: string): Record<string, string> {
    return {
      'ETag': `"${value}"`,
      'Cache-Control': 'must-revalidate'
    }
  }

  static lastModified(date: Date): Record<string, string> {
    return {
      'Last-Modified': date.toUTCString(),
      'Cache-Control': 'must-revalidate'
    }
  }
}

// Singleton instance
export const apiCache = ApiCache.getInstance()

// Decorator for easy caching
export function cacheApi(options: ApiCacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    descriptor.value = apiCache.withCache(method, options)
    return descriptor
  }
}

export default apiCache