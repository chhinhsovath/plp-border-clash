import { RedisCache } from '@/lib/cache/redis-cache'
import { CacheMocks, TestDataFactory, PerformanceHelpers } from '../../setup/test-helpers'

// Mock Redis client
jest.mock('@upstash/redis')

describe('Redis Cache Service', () => {
  let cache: RedisCache
  let mockRedis: any

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      pipeline: jest.fn(() => ({
        setex: jest.fn(),
        exec: jest.fn()
      })),
      smembers: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn()
    }

    const { Redis } = require('@upstash/redis')
    Redis.fromEnv = jest.fn().mockReturnValue(mockRedis)

    cache = new RedisCache()
    jest.clearAllMocks()
  })

  describe('Basic Operations', () => {
    it('should get value from cache', async () => {
      const testData = { id: 'test', value: 'cached data' }
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))

      const result = await cache.get('users', 'user-123')

      expect(result).toEqual(testData)
      expect(mockRedis.get).toHaveBeenCalledWith('users:user-123')
    })

    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await cache.get('users', 'user-123')

      expect(result).toBeNull()
    })

    it('should set value in cache', async () => {
      const testData = TestDataFactory.createUser()
      mockRedis.setex.mockResolvedValue('OK')

      await cache.set('users', 'user-123', testData, { ttl: 300 })

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'users:user-123',
        300,
        JSON.stringify(testData)
      )
    })

    it('should delete value from cache', async () => {
      mockRedis.del.mockResolvedValue(1)

      const result = await cache.del('users', 'user-123')

      expect(result).toBe(true)
      expect(mockRedis.del).toHaveBeenCalledWith('users:user-123')
    })

    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1)

      const exists = await cache.exists('users', 'user-123')

      expect(exists).toBe(true)
      expect(mockRedis.exists).toHaveBeenCalledWith('users:user-123')
    })
  })

  describe('Advanced Operations', () => {
    it('should get multiple values at once', async () => {
      const users = [TestDataFactory.createUser(), TestDataFactory.createUser()]
      mockRedis.mget.mockResolvedValue([
        JSON.stringify(users[0]),
        JSON.stringify(users[1])
      ])

      const result = await cache.mget('users', ['user-1', 'user-2'])

      expect(result).toEqual({
        'user-1': users[0],
        'user-2': users[1]
      })
      expect(mockRedis.mget).toHaveBeenCalledWith(['users:user-1', 'users:user-2'])
    })

    it('should set multiple values at once', async () => {
      const users = {
        'user-1': TestDataFactory.createUser(),
        'user-2': TestDataFactory.createUser()
      }
      const pipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK'])
      }
      mockRedis.pipeline.mockReturnValue(pipeline)

      await cache.mset('users', users, { ttl: 300 })

      expect(pipeline.setex).toHaveBeenCalledTimes(2)
      expect(pipeline.exec).toHaveBeenCalled()
    })

    it('should implement cache-aside pattern with setWithRefresh', async () => {
      const user = TestDataFactory.createUser()
      const fetchFunction = jest.fn().mockResolvedValue(user)
      
      // Cache miss
      mockRedis.get.mockResolvedValue(null)
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cache.setWithRefresh(
        'users',
        'user-123',
        fetchFunction,
        { ttl: 300 }
      )

      expect(result).toEqual(user)
      expect(fetchFunction).toHaveBeenCalled()
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'users:user-123',
        300,
        JSON.stringify(user)
      )
    })

    it('should return cached data on cache hit with setWithRefresh', async () => {
      const cachedUser = TestDataFactory.createUser()
      const fetchFunction = jest.fn()
      
      // Cache hit
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedUser))

      const result = await cache.setWithRefresh(
        'users',
        'user-123',
        fetchFunction
      )

      expect(result).toEqual(cachedUser)
      expect(fetchFunction).not.toHaveBeenCalled()
    })
  })

  describe('Tag-based Invalidation', () => {
    it('should invalidate cache by tags', async () => {
      mockRedis.smembers.mockResolvedValue(['users:user-1', 'users:user-2'])
      mockRedis.del.mockResolvedValue(2)
      mockRedis.del.mockResolvedValue(1) // For tag deletion

      await cache.invalidateByTags(['user-tag'])

      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:user-tag')
      expect(mockRedis.del).toHaveBeenCalledWith(['users:user-1', 'users:user-2'])
      expect(mockRedis.del).toHaveBeenCalledWith('tag:user-tag')
    })

    it('should associate cache entries with tags', async () => {
      const user = TestDataFactory.createUser()
      mockRedis.setex.mockResolvedValue('OK')
      mockRedis.sadd.mockResolvedValue(1)

      await cache.set('users', 'user-123', user, {
        ttl: 300,
        tags: ['user-tag', 'org-tag']
      })

      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:user-tag', 'users:user-123')
      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:org-tag', 'users:user-123')
    })
  })

  describe('Namespace Operations', () => {
    it('should clear entire namespace', async () => {
      mockRedis.keys.mockResolvedValue(['users:user-1', 'users:user-2', 'users:user-3'])
      mockRedis.del.mockResolvedValue(3)

      const cleared = await cache.clearNamespace('users')

      expect(cleared).toBe(3)
      expect(mockRedis.keys).toHaveBeenCalledWith('users:*')
      expect(mockRedis.del).toHaveBeenCalledWith(['users:user-1', 'users:user-2', 'users:user-3'])
    })

    it('should handle empty namespace gracefully', async () => {
      mockRedis.keys.mockResolvedValue([])

      const cleared = await cache.clearNamespace('empty')

      expect(cleared).toBe(0)
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })

  describe('Compression', () => {
    it('should compress large objects', async () => {
      const largeUser = TestDataFactory.createUser({
        metadata: 'x'.repeat(2000) // Large metadata to trigger compression
      })
      mockRedis.setex.mockResolvedValue('OK')

      await cache.set('users', 'user-123', largeUser, { 
        ttl: 300,
        compress: true 
      })

      const setCall = mockRedis.setex.mock.calls[0]
      expect(setCall[0]).toBe('users:user-123')
      expect(setCall[1]).toBe(300)
      // Compressed data should be different from original JSON
      expect(setCall[2]).not.toBe(JSON.stringify(largeUser))
    })

    it('should decompress retrieved data', async () => {
      const user = TestDataFactory.createUser()
      // Mock compressed data retrieval
      mockRedis.get.mockResolvedValue('compressed-data-mock')
      
      // Mock decompression result
      jest.spyOn(cache as any, 'decompress').mockReturnValue(JSON.stringify(user))

      const result = await cache.get('users', 'user-123')

      expect(result).toEqual(user)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide cache statistics', async () => {
      mockRedis.keys.mockResolvedValue(['users:1', 'users:2', 'reports:1'])
      
      const stats = await cache.getStats()

      expect(stats).toHaveProperty('totalKeys')
      expect(stats).toHaveProperty('namespaces')
      expect(stats.namespaces).toHaveProperty('users', 2)
      expect(stats.namespaces).toHaveProperty('reports', 1)
    })

    it('should track cache performance', async () => {
      const user = TestDataFactory.createUser()
      mockRedis.get.mockResolvedValue(JSON.stringify(user))

      const { duration } = await PerformanceHelpers.measureTime(async () => {
        await cache.get('users', 'user-123')
      })

      expect(duration).toBeLessThan(100) // Should be fast
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const result = await cache.get('users', 'user-123')

      expect(result).toBeNull()
    })

    it('should handle malformed JSON gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json')

      const result = await cache.get('users', 'user-123')

      expect(result).toBeNull()
    })

    it('should handle set operation failures', async () => {
      const user = TestDataFactory.createUser()
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'))

      // Should not throw, just fail silently
      await expect(cache.set('users', 'user-123', user)).resolves.toBeUndefined()
    })

    it('should handle delete operation failures', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'))

      const result = await cache.del('users', 'user-123')

      expect(result).toBe(false)
    })
  })

  describe('TTL Management', () => {
    it('should use default TTL when not specified', async () => {
      const user = TestDataFactory.createUser()
      mockRedis.setex.mockResolvedValue('OK')

      await cache.set('users', 'user-123', user)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'users:user-123',
        3600, // Default TTL
        JSON.stringify(user)
      )
    })

    it('should get remaining TTL for a key', async () => {
      mockRedis.ttl.mockResolvedValue(300)

      const ttl = await cache.getTTL('users', 'user-123')

      expect(ttl).toBe(300)
      expect(mockRedis.ttl).toHaveBeenCalledWith('users:user-123')
    })
  })
})