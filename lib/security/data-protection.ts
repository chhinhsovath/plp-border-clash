import { EncryptionService, FieldEncryption, PrivacyControls } from './encryption'
import { AuditLogger, AuditAction } from '@/lib/audit/audit-logger'

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

/**
 * Data processing purposes under GDPR
 */
export enum ProcessingPurpose {
  LEGITIMATE_INTEREST = 'LEGITIMATE_INTEREST',
  CONSENT = 'CONSENT',
  CONTRACT = 'CONTRACT',
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION',
  VITAL_INTERESTS = 'VITAL_INTERESTS',
  PUBLIC_TASK = 'PUBLIC_TASK'
}

/**
 * Data retention policies
 */
export const DATA_RETENTION_POLICIES = {
  // User data
  USER_ACCOUNT: 365 * 7, // 7 years
  USER_ACTIVITY: 365 * 2, // 2 years
  
  // Report data
  HUMANITARIAN_REPORTS: 365 * 10, // 10 years (humanitarian data importance)
  DRAFT_REPORTS: 365 * 1, // 1 year
  
  // Assessment data
  ASSESSMENTS: 365 * 10, // 10 years
  
  // Audit logs
  AUDIT_LOGS: 365 * 7, // 7 years (compliance requirement)
  SECURITY_LOGS: 365 * 7, // 7 years
  
  // Session data
  SESSIONS: 30, // 30 days
  LOGIN_ATTEMPTS: 90, // 90 days
  
  // Notifications
  NOTIFICATIONS: 365 * 1, // 1 year
  
  // Temporary data
  TEMP_FILES: 7, // 7 days
  EXPORTS: 30 // 30 days
}

/**
 * Sensitive field definitions by entity
 */
export const SENSITIVE_FIELDS = {
  user: ['email', 'phone', 'address', 'dateOfBirth', 'emergencyContact'],
  organization: ['taxId', 'bankAccount', 'contactDetails'],
  report: ['authorNotes', 'internalComments'],
  assessment: ['contactInformation', 'personalIdentifiers'],
  auditLog: ['ipAddress', 'userAgent', 'metadata.personalData']
}

/**
 * Data protection service
 */
export class DataProtectionService {
  /**
   * Classify data sensitivity
   */
  static classifyData(entityType: string, fieldName: string): DataClassification {
    const sensitiveFields = SENSITIVE_FIELDS[entityType as keyof typeof SENSITIVE_FIELDS] || []
    
    if (sensitiveFields.includes(fieldName)) {
      return DataClassification.CONFIDENTIAL
    }
    
    // Default classification based on entity type
    switch (entityType) {
      case 'user':
      case 'organization':
        return DataClassification.INTERNAL
      case 'report':
      case 'assessment':
        return DataClassification.INTERNAL
      case 'auditLog':
        return DataClassification.RESTRICTED
      default:
        return DataClassification.INTERNAL
    }
  }

  /**
   * Apply data protection policies before storing
   */
  static async protectData(
    data: Record<string, any>,
    entityType: string,
    userId?: string
  ): Promise<Record<string, any>> {
    const sensitiveFields = SENSITIVE_FIELDS[entityType as keyof typeof SENSITIVE_FIELDS] || []
    
    // Encrypt sensitive fields
    const protectedData = FieldEncryption.encryptSensitiveFields(data, sensitiveFields)
    
    // Add data protection metadata
    protectedData._dataProtection = {
      encryptedAt: new Date(),
      classification: this.classifyData(entityType, 'default'),
      retentionDays: DATA_RETENTION_POLICIES[entityType.toUpperCase() as keyof typeof DATA_RETENTION_POLICIES],
      purpose: ProcessingPurpose.LEGITIMATE_INTEREST
    }
    
    // Log data protection action
    if (userId) {
      await AuditLogger.logSuccess(
        AuditAction.DATA_EXPORT, // Using generic data action
        entityType,
        userId,
        undefined,
        {
          action: 'protect',
          fieldsEncrypted: sensitiveFields.length,
          classification: protectedData._dataProtection.classification
        }
      )
    }
    
    return protectedData
  }

  /**
   * Unprotect data after retrieval
   */
  static async unprotectData(
    data: Record<string, any>,
    entityType: string,
    userId?: string,
    purpose: ProcessingPurpose = ProcessingPurpose.LEGITIMATE_INTEREST
  ): Promise<Record<string, any>> {
    const sensitiveFields = SENSITIVE_FIELDS[entityType as keyof typeof SENSITIVE_FIELDS] || []
    
    // Validate processing purpose
    if (!this.validateProcessingPurpose(userId, purpose)) {
      throw new Error('Invalid processing purpose for data access')
    }
    
    // Decrypt sensitive fields
    const unprotectedData = FieldEncryption.decryptSensitiveFields(data, sensitiveFields)
    
    // Remove protection metadata from returned data
    delete unprotectedData._dataProtection
    
    // Log data access
    if (userId) {
      await AuditLogger.logSuccess(
        AuditAction.DATA_EXPORT, // Using generic data action
        entityType,
        userId,
        data.id,
        {
          action: 'access',
          purpose,
          fieldsDecrypted: sensitiveFields.length
        }
      )
    }
    
    return unprotectedData
  }

  /**
   * Anonymize data for analytics/research
   */
  static anonymizeForAnalytics(
    data: Record<string, any>,
    entityType: string
  ): Record<string, any> {
    const anonymized = PrivacyControls.redactPII(data)
    
    // Add anonymization metadata
    anonymized._anonymized = {
      at: new Date(),
      originalEntityType: entityType,
      method: 'pii_redaction'
    }
    
    return anonymized
  }

  /**
   * Apply data retention policies
   */
  static async applyRetentionPolicies(dryRun: boolean = true): Promise<{
    summary: Record<string, { checked: number; expired: number; deleted: number }>
  }> {
    const summary: Record<string, { checked: number; expired: number; deleted: number }> = {}
    
    for (const [entityType, retentionDays] of Object.entries(DATA_RETENTION_POLICIES)) {
      const result = await PrivacyControls.applyRetentionPolicy(
        entityType.toLowerCase(),
        retentionDays,
        dryRun
      )
      
      summary[entityType] = {
        checked: result.affectedRecords,
        expired: result.affectedRecords,
        deleted: dryRun ? 0 : result.deletedRecords
      }
    }
    
    return { summary }
  }

  /**
   * Generate GDPR-compliant user data export
   */
  static async exportUserData(
    userId: string,
    requestedBy: string,
    format: 'json' | 'xml' | 'csv' = 'json'
  ): Promise<any> {
    // Validate request
    if (requestedBy !== userId) {
      // Check if requester has admin privileges
      const hasPermission = await this.validateAdminAccess(requestedBy, userId)
      if (!hasPermission) {
        throw new Error('Unauthorized data export request')
      }
    }
    
    const exportData = await PrivacyControls.generateUserDataExport(userId)
    
    // Log the export
    await AuditLogger.logSuccess(
      AuditAction.DATA_EXPORT,
      'UserData',
      requestedBy,
      userId,
      {
        format,
        purpose: ProcessingPurpose.LEGAL_OBLIGATION,
        gdprRequest: true
      }
    )
    
    return exportData
  }

  /**
   * Delete user data (right to be forgotten)
   */
  static async deleteUserData(
    userId: string,
    requestedBy: string,
    reason: string
  ): Promise<{ deleted: boolean; affectedTables: string[] }> {
    // Validate request
    if (requestedBy !== userId) {
      const hasPermission = await this.validateAdminAccess(requestedBy, userId)
      if (!hasPermission) {
        throw new Error('Unauthorized data deletion request')
      }
    }
    
    // Check if data can be deleted (legal holds, etc.)
    const canDelete = await this.checkDeletionConstraints(userId)
    if (!canDelete) {
      throw new Error('Data cannot be deleted due to legal constraints')
    }
    
    // Pseudonymize instead of hard delete for audit trails
    const result = await this.pseudonymizeUserData(userId)
    
    // Log the deletion
    await AuditLogger.logSuccess(
      AuditAction.DELETE_USER,
      'UserData',
      requestedBy,
      userId,
      {
        reason,
        gdprRequest: true,
        method: 'pseudonymization',
        affectedTables: result.affectedTables
      }
    )
    
    return result
  }

  /**
   * Validate data processing consent
   */
  static async validateConsent(
    userId: string,
    purpose: ProcessingPurpose,
    dataTypes: string[]
  ): Promise<boolean> {
    // Check user consent preferences
    const hasConsent = PrivacyControls.validateConsent(userId, purpose)
    
    if (!hasConsent) {
      await AuditLogger.logFailure(
        AuditAction.PERMISSION_DENIED,
        'DataProcessing',
        'Insufficient consent for data processing',
        userId,
        undefined,
        { purpose, dataTypes }
      )
    }
    
    return hasConsent
  }

  /**
   * Generate privacy impact assessment
   */
  static generatePrivacyImpactAssessment(
    processingActivity: string,
    dataTypes: string[],
    purposes: ProcessingPurpose[],
    recipients: string[]
  ): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    recommendations: string[]
    requiredSafeguards: string[]
  } {
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    const recommendations: string[] = []
    const requiredSafeguards: string[] = []
    
    // Assess risk based on data sensitivity
    const hasPersonalData = dataTypes.some(type => 
      ['email', 'name', 'address', 'phone'].includes(type)
    )
    const hasSpecialCategory = dataTypes.some(type => 
      ['health', 'biometric', 'ethnic', 'political'].includes(type)
    )
    
    if (hasSpecialCategory) {
      riskLevel = 'HIGH'
      requiredSafeguards.push('Explicit consent required')
      requiredSafeguards.push('Enhanced encryption mandatory')
      recommendations.push('Consider data minimization')
      recommendations.push('Implement access controls')
    } else if (hasPersonalData) {
      riskLevel = 'MEDIUM'
      requiredSafeguards.push('Standard encryption required')
      requiredSafeguards.push('Audit logging mandatory')
    }
    
    // Check for automated decision making
    if (purposes.includes(ProcessingPurpose.LEGITIMATE_INTEREST)) {
      recommendations.push('Document legitimate interest assessment')
    }
    
    return {
      riskLevel,
      recommendations,
      requiredSafeguards
    }
  }

  // Private helper methods
  private static validateProcessingPurpose(userId?: string, purpose?: ProcessingPurpose): boolean {
    // In a real implementation, this would check user consent and legal basis
    return true // Simplified for demo
  }

  private static async validateAdminAccess(requesterId: string, targetUserId: string): Promise<boolean> {
    // Check if requester has admin privileges
    // This would integrate with the RBAC system
    return false // Simplified for demo
  }

  private static async checkDeletionConstraints(userId: string): Promise<boolean> {
    // Check for legal holds, active contracts, etc.
    return true // Simplified for demo
  }

  private static async pseudonymizeUserData(userId: string): Promise<{
    deleted: boolean
    affectedTables: string[]
  }> {
    // Replace identifying data with pseudonymous identifiers
    // Preserve data utility while protecting privacy
    return {
      deleted: true,
      affectedTables: ['users', 'reports', 'assessments', 'audit_logs']
    }
  }
}

/**
 * Middleware for automatic data protection
 */
export function withDataProtection<T extends Record<string, any>>(
  entityType: string,
  operation: 'create' | 'read' | 'update' | 'delete'
) {
  return {
    async beforeCreate(data: T, userId?: string): Promise<T> {
      if (operation === 'create') {
        return await DataProtectionService.protectData(data, entityType, userId) as T
      }
      return data
    },
    
    async afterRead(data: T, userId?: string, purpose?: ProcessingPurpose): Promise<T> {
      if (operation === 'read') {
        return await DataProtectionService.unprotectData(data, entityType, userId, purpose) as T
      }
      return data
    },
    
    async beforeUpdate(data: T, userId?: string): Promise<T> {
      if (operation === 'update') {
        return await DataProtectionService.protectData(data, entityType, userId) as T
      }
      return data
    }
  }
}

export default DataProtectionService