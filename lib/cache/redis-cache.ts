import { Redis } from '@upstash/redis'
import { AuditLogger, AuditAction } from '@/lib/audit/audit-logger'

// Redis client configuration
const redis = Redis.fromEnv()

export enum CacheStrategy {
  // Time-based expiration
  TTL = 'TTL',
  // Write-through (update cache on write)
  WRITE_THROUGH = 'WRITE_THROUGH',
  // Write-behind (async cache update)
  WRITE_BEHIND = 'WRITE_BEHIND',
  // Cache-aside (lazy loading)
  CACHE_ASIDE = 'CACHE_ASIDE',
  // Read-through (fetch on cache miss)
  READ_THROUGH = 'READ_THROUGH'
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  strategy?: CacheStrategy
  tags?: string[] // For cache invalidation
  compress?: boolean // Compress large objects
  serialize?: boolean // Custom serialization
}

export class RedisCache {
  private static instance: RedisCache
  private static readonly DEFAULT_TTL = 3600 // 1 hour
  private static readonly MAX_KEY_LENGTH = 250
  private static readonly COMPRESSION_THRESHOLD = 1024 // 1KB

  private constructor() {}

  static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache()
    }
    return RedisCache.instance
  }

  /**
   * Generate cache key with namespace and validation
   */
  private generateKey(namespace: string, key: string, userId?: string): string {
    const segments = [
      'hrs', // Humanitarian Report System
      namespace,
      userId || 'global',
      key
    ].filter(Boolean)

    const fullKey = segments.join(':')
    
    if (fullKey.length > RedisCache.MAX_KEY_LENGTH) {
      // Hash long keys to stay within limits
      const crypto = require('crypto')
      const hash = crypto.createHash('sha256').update(fullKey).digest('hex').substring(0, 32)
      return `hrs:${namespace}:${hash}`
    }

    return fullKey
  }

  /**
   * Set cache value with options
   */
  async set(
    namespace: string,
    key: string,
    value: any,
    options: CacheOptions = {},
    userId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(namespace, key, userId)
      const ttl = options.ttl || RedisCache.DEFAULT_TTL

      let serializedValue: string
      
      if (typeof value === 'string') {
        serializedValue = value
      } else {
        serializedValue = JSON.stringify(value)
      }

      // Compress large values
      if (options.compress && serializedValue.length > RedisCache.COMPRESSION_THRESHOLD) {
        const zlib = require('zlib')
        const compressed = zlib.gzipSync(serializedValue)
        serializedValue = `gzip:${compressed.toString('base64')}`
      }

      // Set with expiration
      const result = await redis.setex(cacheKey, ttl, serializedValue)

      // Add tags for group invalidation
      if (options.tags?.length) {
        await this.addTags(cacheKey, options.tags)
      }

      // Log cache write for monitoring
      if (userId) {
        await AuditLogger.logSuccess(
          AuditAction.SYSTEM_CONFIG_CHANGE,
          'Cache',
          userId,
          cacheKey,
          {
            action: 'set',
            namespace,
            ttl,
            size: serializedValue.length,
            compressed: serializedValue.startsWith('gzip:')
          }
        )
      }

      return result === 'OK'
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Get cache value with decompression and deserialization
   */
  async get<T = any>(
    namespace: string,
    key: string,
    userId?: string
  ): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(namespace, key, userId)
      let value = await redis.get(cacheKey)

      if (value === null) {
        return null
      }

      // Handle compressed values
      if (typeof value === 'string' && value.startsWith('gzip:')) {
        const zlib = require('zlib')
        const compressed = Buffer.from(value.substring(5), 'base64')
        value = zlib.gunzipSync(compressed).toString()
      }

      // Deserialize JSON
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value as T
        }
      }

      return value as T
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Delete cache entry
   */
  async del(
    namespace: string,
    key: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(namespace, key, userId)
      const result = await redis.del(cacheKey)
      
      // Remove from tag associations
      await this.removeFromTags(cacheKey)
      
      return result === 1
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Check if cache key exists
   */
  async exists(
    namespace: string,
    key: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(namespace, key, userId)
      const result = await redis.exists(cacheKey)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Set cache with automatic refresh
   */
  async setWithRefresh<T>(
    namespace: string,
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {},
    userId?: string
  ): Promise<T> {
    const cached = await this.get<T>(namespace, key, userId)
    
    if (cached !== null) {
      // Refresh in background if TTL is low
      const cacheKey = this.generateKey(namespace, key, userId)
      const ttl = await redis.ttl(cacheKey)
      
      if (ttl < (options.ttl || RedisCache.DEFAULT_TTL) * 0.1) {
        // Refresh in background
        setImmediate(async () => {
          try {
            const fresh = await fetchFunction()
            await this.set(namespace, key, fresh, options, userId)
          } catch (error) {
            console.error('Background refresh error:', error)
          }
        })
      }
      
      return cached
    }

    // Cache miss - fetch and store
    const fresh = await fetchFunction()
    await this.set(namespace, key, fresh, options, userId)
    return fresh
  }

  /**
   * Increment counter in cache
   */
  async increment(
    namespace: string,
    key: string,
    delta: number = 1,
    userId?: string
  ): Promise<number> {
    try {
      const cacheKey = this.generateKey(namespace, key, userId)
      return await redis.incrby(cacheKey, delta)
    } catch (error) {
      console.error('Cache increment error:', error)
      return 0
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(
    namespace: string,
    keys: string[],
    userId?: string
  ): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(namespace, key, userId))
      const values = await redis.mget(...cacheKeys)
      
      return values.map(value => {
        if (value === null) return null
        
        if (typeof value === 'string') {
          // Handle compressed values
          if (value.startsWith('gzip:')) {
            const zlib = require('zlib')
            const compressed = Buffer.from(value.substring(5), 'base64')
            value = zlib.gunzipSync(compressed).toString()
          }
          
          try {
            return JSON.parse(value)
          } catch {
            return value as T
          }
        }
        
        return value as T
      })
    } catch (error) {
      console.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(
    namespace: string,
    keyValues: Record<string, any>,
    options: CacheOptions = {},
    userId?: string
  ): Promise<boolean> {
    try {
      const pipeline = redis.pipeline()
      const ttl = options.ttl || RedisCache.DEFAULT_TTL

      for (const [key, value] of Object.entries(keyValues)) {
        const cacheKey = this.generateKey(namespace, key, userId)
        let serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
        
        // Compress large values
        if (options.compress && serializedValue.length > RedisCache.COMPRESSION_THRESHOLD) {
          const zlib = require('zlib')
          const compressed = zlib.gzipSync(serializedValue)
          serializedValue = `gzip:${compressed.toString('base64')}`
        }
        
        pipeline.setex(cacheKey, ttl, serializedValue)
      }

      const results = await pipeline.exec()
      return results.every(result => result[1] === 'OK')
    } catch (error) {
      console.error('Cache mset error:', error)
      return false
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let deletedCount = 0
      
      for (const tag of tags) {
        const tagKey = `hrs:tags:${tag}`
        const keys = await redis.smembers(tagKey)
        
        if (keys.length > 0) {
          const deleted = await redis.del(...keys)
          deletedCount += deleted
          
          // Clean up tag set
          await redis.del(tagKey)
        }
      }
      
      return deletedCount
    } catch (error) {
      console.error('Cache tag invalidation error:', error)
      return 0
    }
  }

  /**
   * Clear all cache in namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    try {
      const pattern = `hrs:${namespace}:*`
      const keys = await redis.keys(pattern)
      
      if (keys.length === 0) return 0
      
      return await redis.del(...keys)
    } catch (error) {
      console.error('Cache namespace clear error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
    namespaces: Record<string, number>
  }> {
    try {
      const info = await redis.info('memory')
      const keys = await redis.keys('hrs:*')
      
      // Group by namespace
      const namespaces: Record<string, number> = {}
      for (const key of keys) {
        const parts = key.split(':')
        const namespace = parts[1] || 'unknown'
        namespaces[namespace] = (namespaces[namespace] || 0) + 1
      }

      return {
        totalKeys: keys.length,
        memoryUsage: this.parseMemoryUsage(info),
        hitRate: 0.85, // Mock hit rate - would come from monitoring
        namespaces
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0,
        namespaces: {}
      }
    }
  }

  // Private helper methods
  private async addTags(key: string, tags: string[]): Promise<void> {
    const pipeline = redis.pipeline()
    
    for (const tag of tags) {
      const tagKey = `hrs:tags:${tag}`
      pipeline.sadd(tagKey, key)
      pipeline.expire(tagKey, RedisCache.DEFAULT_TTL * 2) // Tags live longer
    }
    
    await pipeline.exec()
  }

  private async removeFromTags(key: string): Promise<void> {
    // This would require reverse mapping - simplified for demo
    const tagPattern = 'hrs:tags:*'
    const tagKeys = await redis.keys(tagPattern)
    
    if (tagKeys.length > 0) {
      const pipeline = redis.pipeline()
      tagKeys.forEach(tagKey => pipeline.srem(tagKey, key))
      await pipeline.exec()
    }
  }

  private parseMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/m)
    return match ? match[1].trim() : '0B'
  }
}

// Cache decorators and utilities
export function cached(
  namespace: string,
  keyGenerator?: (args: any[]) => string,
  options: CacheOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cache = RedisCache.getInstance()

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(args) : `${propertyName}:${JSON.stringify(args)}`
      
      const cached = await cache.get(namespace, key)
      if (cached !== null) {
        return cached
      }

      const result = await method.apply(this, args)
      await cache.set(namespace, key, result, options)
      
      return result
    }

    return descriptor
  }
}

// Singleton cache instance
export const cache = RedisCache.getInstance()
export default cache