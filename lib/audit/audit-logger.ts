import { prisma } from '@/lib/db/prisma'

export enum AuditAction {
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Report actions
  CREATE_REPORT = 'CREATE_REPORT',
  UPDATE_REPORT = 'UPDATE_REPORT',
  DELETE_REPORT = 'DELETE_REPORT',
  PUBLISH_REPORT = 'PUBLISH_REPORT',
  APPROVE_REPORT = 'APPROVE_REPORT',
  SHARE_REPORT = 'SHARE_REPORT',
  EXPORT_REPORT = 'EXPORT_REPORT',
  
  // Assessment actions
  CREATE_ASSESSMENT = 'CREATE_ASSESSMENT',
  UPDATE_ASSESSMENT = 'UPDATE_ASSESSMENT',
  DELETE_ASSESSMENT = 'DELETE_ASSESSMENT',
  EXPORT_ASSESSMENT = 'EXPORT_ASSESSMENT',
  DUPLICATE_ASSESSMENT = 'DUPLICATE_ASSESSMENT',
  
  // User management actions
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  CHANGE_USER_ROLE = 'CHANGE_USER_ROLE',
  ACTIVATE_USER = 'ACTIVATE_USER',
  DEACTIVATE_USER = 'DEACTIVATE_USER',
  
  // Organization actions
  UPDATE_ORGANIZATION = 'UPDATE_ORGANIZATION',
  INVITE_USER = 'INVITE_USER',
  REMOVE_USER = 'REMOVE_USER',
  
  // Security actions
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED = 'IP_BLOCKED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // Data actions
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_BACKUP = 'DATA_BACKUP',
  DATA_RESTORE = 'DATA_RESTORE',
  
  // System actions
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  DATABASE_MIGRATION = 'DATABASE_MIGRATION'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditLogEntry {
  id?: string
  userId?: string
  action: AuditAction
  entity: string
  entityId?: string
  organizationId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  severity: AuditSeverity
  success: boolean
  errorMessage?: string
  timestamp: Date
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          organizationId: entry.organizationId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata || {},
          severity: entry.severity,
          success: entry.success,
          errorMessage: entry.errorMessage,
          timestamp: new Date()
        }
      })

      // Send alerts for high severity events
      if (entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.HIGH) {
        await this.sendSecurityAlert(entry)
      }

    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Log successful operation
   */
  static async logSuccess(
    action: AuditAction,
    entity: string,
    userId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    request?: Request
  ): Promise<void> {
    const severity = this.getSeverityForAction(action)
    const ipAddress = request ? this.getClientIP(request) : undefined
    const userAgent = request?.headers.get('user-agent') || undefined

    await this.log({
      userId,
      action,
      entity,
      entityId,
      metadata,
      severity,
      success: true,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log failed operation
   */
  static async logFailure(
    action: AuditAction,
    entity: string,
    error: string,
    userId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    request?: Request
  ): Promise<void> {
    const severity = AuditSeverity.HIGH // Failures are generally high severity
    const ipAddress = request ? this.getClientIP(request) : undefined
    const userAgent = request?.headers.get('user-agent') || undefined

    await this.log({
      userId,
      action,
      entity,
      entityId,
      metadata,
      severity,
      success: false,
      errorMessage: error,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    action: AuditAction,
    description: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: Request
  ): Promise<void> {
    const ipAddress = request ? this.getClientIP(request) : undefined
    const userAgent = request?.headers.get('user-agent') || undefined

    await this.log({
      userId,
      action,
      entity: 'Security',
      metadata: {
        ...metadata,
        description
      },
      severity: AuditSeverity.CRITICAL,
      success: false,
      ipAddress,
      userAgent
    })
  }

  /**
   * Query audit logs with filters
   */
  static async queryLogs(filters: {
    userId?: string
    organizationId?: string
    action?: AuditAction
    entity?: string
    severity?: AuditSeverity
    success?: boolean
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }) {
    const {
      userId,
      organizationId,
      action,
      entity,
      severity,
      success,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters

    const where: any = {}
    
    if (userId) where.userId = userId
    if (organizationId) where.organizationId = organizationId
    if (action) where.action = action
    if (entity) where.entity = entity
    if (severity) where.severity = severity
    if (success !== undefined) where.success = success
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.auditLog.count({ where })
    ])

    return { logs, total, hasMore: offset + limit < total }
  }

  /**
   * Generate audit report
   */
  static async generateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const logs = await this.queryLogs({
      organizationId,
      startDate,
      endDate,
      limit: 10000 // Large limit for reports
    })

    // Aggregate statistics
    const stats = {
      totalEvents: logs.total,
      successfulOperations: logs.logs.filter(log => log.success).length,
      failedOperations: logs.logs.filter(log => !log.success).length,
      securityEvents: logs.logs.filter(log => 
        log.severity === AuditSeverity.CRITICAL || 
        log.severity === AuditSeverity.HIGH
      ).length,
      userActivity: this.aggregateUserActivity(logs.logs),
      actionBreakdown: this.aggregateActionBreakdown(logs.logs),
      timelineData: this.aggregateTimelineData(logs.logs)
    }

    return {
      logs: logs.logs,
      statistics: stats,
      generatedAt: new Date(),
      period: { startDate, endDate }
    }
  }

  /**
   * Track user session
   */
  static async trackSession(
    userId: string,
    sessionId: string,
    action: 'START' | 'END',
    request?: Request
  ) {
    const ipAddress = request ? this.getClientIP(request) : undefined
    const userAgent = request?.headers.get('user-agent') || undefined

    await this.log({
      userId,
      action: action === 'START' ? AuditAction.LOGIN : AuditAction.LOGOUT,
      entity: 'Session',
      entityId: sessionId,
      metadata: { sessionId },
      severity: AuditSeverity.LOW,
      success: true,
      ipAddress,
      userAgent
    })
  }

  /**
   * Monitor data access patterns
   */
  static async monitorDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    metadata?: Record<string, any>
  ) {
    // Check for unusual access patterns
    const recentAccess = await prisma.auditLog.findMany({
      where: {
        userId,
        entity: resourceType,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    // Flag if user is accessing unusually many resources
    if (recentAccess.length > 100) {
      await this.logSecurityEvent(
        AuditAction.SUSPICIOUS_ACTIVITY,
        'Unusual data access pattern detected',
        userId,
        {
          resourceType,
          resourceId,
          recentAccessCount: recentAccess.length,
          ...metadata
        }
      )
    }
  }

  // Helper methods
  private static getSeverityForAction(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.DELETE_REPORT,
      AuditAction.DELETE_ASSESSMENT,
      AuditAction.DELETE_USER,
      AuditAction.CHANGE_USER_ROLE
    ]

    const highActions = [
      AuditAction.PUBLISH_REPORT,
      AuditAction.APPROVE_REPORT,
      AuditAction.CREATE_USER,
      AuditAction.UPDATE_USER
    ]

    if (criticalActions.includes(action)) return AuditSeverity.CRITICAL
    if (highActions.includes(action)) return AuditSeverity.HIGH
    if (action.toString().includes('FAILED') || action.toString().includes('DENIED')) {
      return AuditSeverity.HIGH
    }

    return AuditSeverity.LOW
  }

  private static getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfIP = request.headers.get('cf-connecting-ip')

    if (forwardedFor) return forwardedFor.split(',')[0].trim()
    if (realIP) return realIP
    if (cfIP) return cfIP
    return 'unknown'
  }

  private static async sendSecurityAlert(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.warn('SECURITY ALERT:', {
      action: entry.action,
      severity: entry.severity,
      userId: entry.userId,
      entity: entry.entity,
      success: entry.success,
      error: entry.errorMessage
    })

    // Store alert in database
    try {
      await prisma.securityAlert.create({
        data: {
          type: entry.action,
          severity: entry.severity,
          message: `Security event: ${entry.action} on ${entry.entity}`,
          metadata: entry.metadata || {},
          userId: entry.userId,
          resolved: false,
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to create security alert:', error)
    }
  }

  private static aggregateUserActivity(logs: any[]) {
    const userActivity: Record<string, number> = {}
    logs.forEach(log => {
      if (log.userId) {
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1
      }
    })
    return userActivity
  }

  private static aggregateActionBreakdown(logs: any[]) {
    const actionBreakdown: Record<string, number> = {}
    logs.forEach(log => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1
    })
    return actionBreakdown
  }

  private static aggregateTimelineData(logs: any[]) {
    // Group by hour for timeline visualization
    const timeline: Record<string, number> = {}
    logs.forEach(log => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13)
      timeline[hour] = (timeline[hour] || 0) + 1
    })
    return timeline
  }
}

// Decorator for automatic audit logging
export function auditLog(action: AuditAction, entity: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      let success = true
      let error: string | undefined

      try {
        const result = await method.apply(this, args)
        await AuditLogger.logSuccess(action, entity, undefined, undefined, {
          duration: Date.now() - startTime
        })
        return result
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        await AuditLogger.logFailure(action, entity, error)
        throw err
      }
    }

    return descriptor
  }
}

export default AuditLogger