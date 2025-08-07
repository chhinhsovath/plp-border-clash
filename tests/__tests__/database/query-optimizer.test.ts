import { QueryOptimizer } from '@/lib/database/query-optimizer'
import { DatabaseMocks, TestDataFactory } from '../../setup/test-helpers'

// Mock Prisma client
jest.mock('@/lib/db/prisma')

describe('Query Optimizer', () => {
  let optimizer: QueryOptimizer
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = DatabaseMocks.mockPrisma()
    
    // Mock the prisma import
    const { prisma } = require('@/lib/db/prisma')
    Object.assign(prisma, mockPrisma)

    optimizer = new QueryOptimizer()
    jest.clearAllMocks()
  })

  describe('Optimized Report Queries', () => {
    it('should fetch report with selective includes', async () => {
      const report = TestDataFactory.createReport()
      mockPrisma.report.findUnique.mockResolvedValue(report)

      const result = await optimizer.getOptimizedReport('report-123', {
        sections: true,
        author: true
      })

      expect(result).toEqual(report)
      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        include: {
          sections: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
              order: true,
              isVisible: true
            }
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      })
    })

    it('should fetch report without includes when not requested', async () => {
      const report = TestDataFactory.createReport()
      mockPrisma.report.findUnique.mockResolvedValue(report)

      await optimizer.getOptimizedReport('report-123')

      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        include: {}
      })
    })

    it('should handle all include options', async () => {
      const report = TestDataFactory.createReport()
      mockPrisma.report.findUnique.mockResolvedValue(report)

      await optimizer.getOptimizedReport('report-123', {
        sections: true,
        collaborators: true,
        comments: true,
        files: true,
        author: true,
        versions: true
      })

      const includeClause = mockPrisma.report.findUnique.mock.calls[0][0].include
      expect(includeClause).toHaveProperty('sections')
      expect(includeClause).toHaveProperty('collaborators')
      expect(includeClause).toHaveProperty('comments')
      expect(includeClause).toHaveProperty('files')
      expect(includeClause).toHaveProperty('author')
      expect(includeClause).toHaveProperty('versions')
    })
  })

  describe('Optimized Assessment Queries', () => {
    it('should fetch assessment with selective includes', async () => {
      const assessment = TestDataFactory.createAssessment()
      mockPrisma.assessment.findUnique.mockResolvedValue(assessment)

      const result = await optimizer.getOptimizedAssessment('assessment-123', {
        createdBy: true,
        organization: true
      })

      expect(result).toEqual(assessment)
      expect(mockPrisma.assessment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assessment-123' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      })
    })
  })

  describe('Batch Operations', () => {
    it('should fetch multiple reports efficiently', async () => {
      const reports = [
        TestDataFactory.createReport({ id: 'report-1' }),
        TestDataFactory.createReport({ id: 'report-2' })
      ]
      mockPrisma.report.findMany.mockResolvedValue(reports)

      const result = await optimizer.getOptimizedReports(['report-1', 'report-2'], {
        sections: true
      })

      expect(result).toEqual(reports)
      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['report-1', 'report-2'] }
        },
        include: {
          sections: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
              order: true,
              isVisible: true
            }
          }
        }
      })
    })

    it('should handle empty ID array', async () => {
      const result = await optimizer.getOptimizedReports([])

      expect(result).toEqual([])
      expect(mockPrisma.report.findMany).not.toHaveBeenCalled()
    })
  })

  describe('Full-text Search Optimization', () => {
    it('should perform optimized search with ranking', async () => {
      const searchResults = [
        { ...TestDataFactory.createReport(), _relevance: 0.95 },
        { ...TestDataFactory.createReport(), _relevance: 0.85 }
      ]
      mockPrisma.$queryRaw.mockResolvedValue(searchResults)

      const result = await optimizer.searchReports('crisis response', {
        organizationId: 'org-123',
        limit: 20,
        offset: 0
      })

      expect(result).toEqual(searchResults)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ts_rank'),
        'crisis response',
        'org-123',
        20,
        0
      )
    })

    it('should handle search without organization filter', async () => {
      const searchResults = [TestDataFactory.createReport()]
      mockPrisma.$queryRaw.mockResolvedValue(searchResults)

      await optimizer.searchReports('humanitarian', {
        limit: 10,
        offset: 0
      })

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('ts_rank'),
        'humanitarian',
        null,
        10,
        0
      )
    })
  })

  describe('Aggregation Queries', () => {
    it('should get report statistics efficiently', async () => {
      const stats = {
        totalReports: 150,
        publishedReports: 120,
        draftReports: 30,
        recentReports: 25
      }
      mockPrisma.$queryRaw.mockResolvedValue([stats])

      const result = await optimizer.getReportStatistics('org-123')

      expect(result).toEqual(stats)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        'org-123'
      )
    })

    it('should get assessment statistics efficiently', async () => {
      const stats = {
        totalAssessments: 75,
        rapidAssessments: 40,
        detailedAssessments: 35,
        avgAffectedPeople: 5000
      }
      mockPrisma.$queryRaw.mockResolvedValue([stats])

      const result = await optimizer.getAssessmentStatistics('org-123')

      expect(result).toEqual(stats)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('AVG'),
        'org-123'
      )
    })
  })

  describe('Pagination Optimization', () => {
    it('should use cursor-based pagination for large datasets', async () => {
      const reports = [
        TestDataFactory.createReport({ id: 'report-1' }),
        TestDataFactory.createReport({ id: 'report-2' })
      ]
      mockPrisma.report.findMany.mockResolvedValue(reports)

      const result = await optimizer.getPaginatedReports({
        organizationId: 'org-123',
        cursor: 'report-100',
        limit: 20,
        orderBy: 'updatedAt',
        orderDirection: 'desc'
      })

      expect(result).toEqual(reports)
      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123'
        },
        cursor: {
          id: 'report-100'
        },
        take: 20,
        skip: 1, // Skip the cursor
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    })

    it('should handle first page without cursor', async () => {
      const reports = [TestDataFactory.createReport()]
      mockPrisma.report.findMany.mockResolvedValue(reports)

      await optimizer.getPaginatedReports({
        organizationId: 'org-123',
        limit: 20
      })

      const query = mockPrisma.report.findMany.mock.calls[0][0]
      expect(query).not.toHaveProperty('cursor')
      expect(query).not.toHaveProperty('skip')
    })
  })

  describe('Query Performance', () => {
    it('should use database indexes effectively', async () => {
      // Test that queries use proper where clauses that match our indexes
      await optimizer.getOptimizedReports(['report-1'], { author: true })

      const query = mockPrisma.report.findMany.mock.calls[0][0]
      expect(query.where).toEqual({
        id: { in: ['report-1'] }
      })
    })

    it('should limit selected fields to reduce data transfer', async () => {
      await optimizer.getOptimizedReport('report-123', { author: true })

      const query = mockPrisma.report.findUnique.mock.calls[0][0]
      expect(query.include.author.select).toEqual({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.report.findUnique.mockRejectedValue(new Error('Database connection failed'))

      await expect(optimizer.getOptimizedReport('report-123')).rejects.toThrow('Database connection failed')
    })

    it('should handle invalid query parameters', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Invalid query'))

      await expect(optimizer.searchReports('')).rejects.toThrow('Invalid query')
    })
  })

  describe('Caching Integration', () => {
    it('should work with cached queries', async () => {
      // This would typically be tested with actual cache integration
      const report = TestDataFactory.createReport()
      mockPrisma.report.findUnique.mockResolvedValue(report)

      const result1 = await optimizer.getOptimizedReport('report-123')
      const result2 = await optimizer.getOptimizedReport('report-123')

      // Both calls should return same data
      expect(result1).toEqual(result2)
      // But database should be called twice without cache
      expect(mockPrisma.report.findUnique).toHaveBeenCalledTimes(2)
    })
  })
})