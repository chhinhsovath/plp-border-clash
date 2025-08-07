import { AuditService, AuditAction, AuditSeverity } from '@/lib/services/audit-service'
import { DatabaseMocks, TestDataFactory, MockRequest } from '../../setup/test-helpers'

// Mock Prisma client
jest.mock('@/lib/db/prisma')
// Mock Redis cache
jest.mock('@/lib/cache/redis-cache')

describe('Audit Service', () => {
  let auditService: AuditService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = DatabaseMocks.mockPrisma()
    
    // Mock the prisma import
    const { prisma } = require('@/lib/db/prisma')
    Object.assign(prisma, mockPrisma)

    auditService = new AuditService()
    jest.clearAllMocks()
  })

  describe('Audit Log Creation', () => {
    it('should create audit log for successful action', async () => {
      const auditLog = TestDataFactory.createAuditLog()
      mockPrisma.auditLog.create.mockResolvedValue(auditLog)

      const result = await auditService.log({
        userId: 'user-123',
        action: AuditAction.CREATE_REPORT,
        entity: 'Report',
        entityId: 'report-123',
        organizationId: 'org-123',
        success: true,
        metadata: { title: 'New Report' }
      })

      expect(result).toEqual(auditLog)
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: AuditAction.CREATE_REPORT,
          entity: 'Report',
          entityId: 'report-123',
          organizationId: 'org-123',
          success: true,
          metadata: { title: 'New Report' },
          severity: AuditSeverity.LOW,
          ipAddress: null,
          userAgent: null,
          timestamp: expect.any(Date)
        }
      })
    })

    it('should create audit log for failed action with higher severity', async () => {
      const auditLog = TestDataFactory.createAuditLog({ 
        success: false,
        severity: AuditSeverity.HIGH 
      })
      mockPrisma.auditLog.create.mockResolvedValue(auditLog)

      await auditService.log({
        userId: 'user-123',
        action: AuditAction.DELETE_REPORT,
        entity: 'Report',
        entityId: 'report-123',
        organizationId: 'org-123',
        success: false,
        severity: AuditSeverity.HIGH,
        metadata: { error: 'Access denied' }
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          severity: AuditSeverity.HIGH,
          metadata: { error: 'Access denied' }
        })
      })
    })

    it('should extract IP and user agent from request', async () => {
      const request = MockRequest.create({
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 Test Browser'
        }
      })
      
      const auditLog = TestDataFactory.createAuditLog()
      mockPrisma.auditLog.create.mockResolvedValue(auditLog)

      await auditService.logFromRequest(request, {
        userId: 'user-123',
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: 'user-123',
        success: true
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      })
    })

    it('should determine severity based on action type', async () => {
      const auditLog = TestDataFactory.createAuditLog()
      mockPrisma.auditLog.create.mockResolvedValue(auditLog)

      // Critical actions should have HIGH severity
      await auditService.log({
        userId: 'user-123',
        action: AuditAction.DELETE_USER,
        entity: 'User',
        entityId: 'user-456',
        success: true
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: AuditSeverity.CRITICAL
        })
      })
    })
  })

  describe('Audit Log Retrieval', () => {
    it('should get audit logs for specific entity', async () => {
      const auditLogs = [
        TestDataFactory.createAuditLog({ entityId: 'report-123' }),
        TestDataFactory.createAuditLog({ entityId: 'report-123' })
      ]
      mockPrisma.auditLog.findMany.mockResolvedValue(auditLogs)

      const result = await auditService.getEntityAuditLog('Report', 'report-123')

      expect(result).toEqual(auditLogs)
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entity: 'Report',
          entityId: 'report-123'
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    })

    it('should get audit logs for user', async () => {
      const auditLogs = [TestDataFactory.createAuditLog({ userId: 'user-123' })]
      mockPrisma.auditLog.findMany.mockResolvedValue(auditLogs)

      const result = await auditService.getUserAuditLog('user-123', {
        limit: 50,
        offset: 0
      })

      expect(result).toEqual(auditLogs)
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    })

    it('should get audit logs for organization', async () => {
      const auditLogs = [TestDataFactory.createAuditLog({ organizationId: 'org-123' })]
      mockPrisma.auditLog.findMany.mockResolvedValue(auditLogs)

      const result = await auditService.getOrganizationAuditLog('org-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        actions: [AuditAction.CREATE_REPORT, AuditAction.UPDATE_REPORT],
        severity: AuditSeverity.HIGH
      })

      expect(result).toEqual(auditLogs)
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          timestamp: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          },
          action: {
            in: [AuditAction.CREATE_REPORT, AuditAction.UPDATE_REPORT]
          },
          severity: AuditSeverity.HIGH
        },
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    })
  })

  describe('Security Event Detection', () => {
    it('should detect suspicious login patterns', async () => {
      // Mock multiple failed login attempts
      const failedLogins = Array(5).fill(null).map(() => 
        TestDataFactory.createAuditLog({
          action: AuditAction.LOGIN,
          success: false,
          ipAddress: '192.168.1.100',
          timestamp: new Date()
        })
      )
      
      mockPrisma.auditLog.findMany.mockResolvedValue(failedLogins)
      
      const alerts = await auditService.detectSecurityEvents('user-123')
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'SUSPICIOUS_LOGIN_ATTEMPTS',
          severity: 'HIGH',
          count: 5,
          ip: '192.168.1.100'
        })
      )
    })

    it('should detect unusual access patterns', async () => {
      // Mock access from different locations
      const accessLogs = [
        TestDataFactory.createAuditLog({
          ipAddress: '192.168.1.100',
          timestamp: new Date()
        }),
        TestDataFactory.createAuditLog({
          ipAddress: '203.0.113.50',
          timestamp: new Date()
        })
      ]
      
      mockPrisma.auditLog.findMany.mockResolvedValue(accessLogs)
      
      const alerts = await auditService.detectSecurityEvents('user-123')
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'UNUSUAL_ACCESS_LOCATION',
          ips: ['192.168.1.100', '203.0.113.50']
        })
      )
    })

    it('should detect privilege escalation attempts', async () => {
      const privilegedActions = [
        TestDataFactory.createAuditLog({
          action: AuditAction.UPDATE_USER_ROLE,
          success: false,
          severity: AuditSeverity.HIGH
        })
      ]
      
      mockPrisma.auditLog.findMany.mockResolvedValue(privilegedActions)
      
      const alerts = await auditService.detectSecurityEvents('user-123')
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'PRIVILEGE_ESCALATION_ATTEMPT',
          severity: 'CRITICAL'
        })
      )
    })
  })

  describe('Compliance Reporting', () => {
    it('should generate compliance report for date range', async () => {
      const auditLogs = [
        TestDataFactory.createAuditLog({ action: AuditAction.VIEW_REPORT }),
        TestDataFactory.createAuditLog({ action: AuditAction.UPDATE_REPORT }),
        TestDataFactory.createAuditLog({ action: AuditAction.DELETE_REPORT })
      ]
      
      mockPrisma.auditLog.findMany.mockResolvedValue(auditLogs)
      
      // Mock aggregation query
      mockPrisma.$queryRaw.mockResolvedValue([{
        action: AuditAction.VIEW_REPORT,
        count: 50
      }, {
        action: AuditAction.UPDATE_REPORT,
        count: 20
      }])

      const report = await auditService.generateComplianceReport('org-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(report).toMatchObject({
        organizationId: 'org-123',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        summary: {
          totalActions: expect.any(Number),
          successfulActions: expect.any(Number),
          failedActions: expect.any(Number),
          actionsByType: expect.any(Object)
        },
        securityEvents: expect.any(Array),
        dataAccess: expect.any(Array)
      })
    })

    it('should include GDPR-specific data access logs', async () => {
      const dataAccessLogs = [
        TestDataFactory.createAuditLog({ 
          action: AuditAction.VIEW_USER_DATA,
          metadata: { gdprRequest: true }
        })
      ]
      
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(dataAccessLogs) // General audit logs
        .mockResolvedValueOnce(dataAccessLogs) // GDPR-specific logs

      const report = await auditService.generateComplianceReport('org-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(report.dataAccess).toEqual(dataAccessLogs)
    })
  })

  describe('Audit Log Analytics', () => {
    it('should provide activity statistics', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { action: AuditAction.CREATE_REPORT, count: 25 },
        { action: AuditAction.UPDATE_REPORT, count: 40 },
        { action: AuditAction.VIEW_REPORT, count: 150 }
      ])

      const stats = await auditService.getActivityStatistics('org-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(stats).toEqual({
        [AuditAction.CREATE_REPORT]: 25,
        [AuditAction.UPDATE_REPORT]: 40,
        [AuditAction.VIEW_REPORT]: 150
      })
    })

    it('should track user activity patterns', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { userId: 'user-1', actionCount: 50, lastActive: new Date() },
        { userId: 'user-2', actionCount: 25, lastActive: new Date() }
      ])

      const patterns = await auditService.getUserActivityPatterns('org-123')

      expect(patterns).toHaveLength(2)
      expect(patterns[0]).toMatchObject({
        userId: 'user-1',
        actionCount: 50,
        lastActive: expect.any(Date)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database unavailable'))

      // Should not throw, just log the error
      await expect(auditService.log({
        userId: 'user-123',
        action: AuditAction.CREATE_REPORT,
        entity: 'Report',
        success: true
      })).resolves.toBeUndefined()
    })

    it('should handle missing user context', async () => {
      const auditLog = TestDataFactory.createAuditLog({ userId: null })
      mockPrisma.auditLog.create.mockResolvedValue(auditLog)

      await auditService.log({
        userId: null,
        action: AuditAction.SYSTEM_BACKUP,
        entity: 'System',
        success: true
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null
        })
      })
    })
  })

  describe('Data Retention', () => {
    it('should clean up old audit logs', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 100 })

      const deletedCount = await auditService.cleanupOldLogs(365) // Keep 1 year

      expect(deletedCount).toBe(100)
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date)
          }
        }
      })
    })

    it('should preserve critical audit logs during cleanup', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 50 })

      await auditService.cleanupOldLogs(365, {
        preserveCritical: true
      })

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date)
          },
          severity: {
            notIn: [AuditSeverity.HIGH, AuditSeverity.CRITICAL]
          }
        }
      })
    })
  })
})