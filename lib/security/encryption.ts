import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 64 // 512 bits

export class EncryptionService {
  private static masterKey: Buffer | null = null

  /**
   * Initialize encryption service with master key
   */
  static initialize(masterKey?: string) {
    if (masterKey) {
      this.masterKey = Buffer.from(masterKey, 'hex')
    } else if (process.env.ENCRYPTION_MASTER_KEY) {
      this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex')
    } else {
      // Generate a new master key (should be stored securely in production)
      this.masterKey = crypto.randomBytes(KEY_LENGTH)
      console.warn('Generated new master key. Store this securely:', this.masterKey.toString('hex'))
    }
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(plaintext: string, additionalData?: string): {
    encrypted: string
    iv: string
    tag: string
    salt: string
  } {
    if (!this.masterKey) {
      this.initialize()
    }

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(this.masterKey!, salt, 100000, KEY_LENGTH, 'sha512')
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from(additionalData || '', 'utf8'))
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get authentication tag
    const tag = cipher.getAuthTag()
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex')
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(
    encrypted: string,
    iv: string,
    tag: string,
    salt: string,
    additionalData?: string
  ): string {
    if (!this.masterKey) {
      this.initialize()
    }

    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(
      this.masterKey!,
      Buffer.from(salt, 'hex'),
      100000,
      KEY_LENGTH,
      'sha512'
    )
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    decipher.setAAD(Buffer.from(additionalData || '', 'utf8'))
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH)
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, KEY_LENGTH, 'sha512')
    
    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex')
    }
  }

  /**
   * Verify hashed data
   */
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt)
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    )
  }

  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Generate cryptographically secure UUID
   */
  static generateSecureUUID(): string {
    const bytes = crypto.randomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant bits
    
    const hex = bytes.toString('hex')
    return [
      hex.substr(0, 8),
      hex.substr(8, 4),
      hex.substr(12, 4),
      hex.substr(16, 4),
      hex.substr(20, 12)
    ].join('-')
  }

  /**
   * Encrypt database field
   */
  static encryptField(value: string, fieldName: string): string {
    const { encrypted, iv, tag, salt } = this.encrypt(value, fieldName)
    return `${encrypted}:${iv}:${tag}:${salt}`
  }

  /**
   * Decrypt database field
   */
  static decryptField(encryptedValue: string, fieldName: string): string {
    const parts = encryptedValue.split(':')
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted field format')
    }
    
    const [encrypted, iv, tag, salt] = parts
    return this.decrypt(encrypted, iv, tag, salt, fieldName)
  }

  /**
   * Mask sensitive data for logging
   */
  static maskData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length)
    }
    
    const start = data.substring(0, visibleChars)
    const end = data.substring(data.length - visibleChars)
    const middle = '*'.repeat(data.length - visibleChars * 2)
    
    return `${start}${middle}${end}`
  }

  /**
   * Secure data deletion (overwrite memory)
   */
  static secureDelete(data: Buffer | string): void {
    if (Buffer.isBuffer(data)) {
      data.fill(0)
    } else if (typeof data === 'string') {
      // Can't directly overwrite string memory in JavaScript
      // This is a limitation of the language
      data = ''
    }
  }
}

/**
 * Field-level encryption for Prisma models
 */
export class FieldEncryption {
  /**
   * Encrypt sensitive fields before saving to database
   */
  static encryptSensitiveFields(data: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
    const encrypted = { ...data }
    
    sensitiveFields.forEach(field => {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = EncryptionService.encryptField(encrypted[field], field)
      }
    })
    
    return encrypted
  }

  /**
   * Decrypt sensitive fields after retrieving from database
   */
  static decryptSensitiveFields(data: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
    const decrypted = { ...data }
    
    sensitiveFields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = EncryptionService.decryptField(decrypted[field], field)
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error)
          // Don't expose the encrypted value
          decrypted[field] = '[ENCRYPTED]'
        }
      }
    })
    
    return decrypted
  }
}

/**
 * Privacy controls for data handling
 */
export class PrivacyControls {
  /**
   * Redact PII from data for logging/analytics
   */
  static redactPII(data: Record<string, any>): Record<string, any> {
    const piiFields = [
      'email', 'phone', 'phoneNumber', 'address', 'firstName', 'lastName',
      'fullName', 'dateOfBirth', 'ssn', 'nationalId', 'passport', 'ipAddress'
    ]
    
    const redacted = { ...data }
    
    piiFields.forEach(field => {
      if (redacted[field]) {
        redacted[field] = EncryptionService.maskData(String(redacted[field]))
      }
    })
    
    return redacted
  }

  /**
   * Apply data retention policies
   */
  static async applyRetentionPolicy(
    entityType: string,
    retentionPeriodDays: number,
    dryRun: boolean = true
  ): Promise<{ affectedRecords: number; deletedRecords: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays)
    
    // This would be implemented with actual database queries
    // For now, return mock data
    return {
      affectedRecords: 0,
      deletedRecords: 0
    }
  }

  /**
   * Anonymize user data while preserving analytics value
   */
  static anonymizeUser(userData: Record<string, any>): Record<string, any> {
    const anonymized = { ...userData }
    
    // Replace identifying information with hashed versions
    if (anonymized.email) {
      anonymized.emailHash = EncryptionService.hash(anonymized.email).hash
      delete anonymized.email
    }
    
    if (anonymized.firstName && anonymized.lastName) {
      const fullName = `${anonymized.firstName} ${anonymized.lastName}`
      anonymized.nameHash = EncryptionService.hash(fullName).hash
      delete anonymized.firstName
      delete anonymized.lastName
    }
    
    // Remove other PII
    delete anonymized.address
    delete anonymized.phone
    delete anonymized.dateOfBirth
    
    // Add anonymization timestamp
    anonymized.anonymizedAt = new Date()
    
    return anonymized
  }

  /**
   * Generate data export for user (GDPR compliance)
   */
  static async generateUserDataExport(userId: string): Promise<Record<string, any>> {
    // This would collect all user data from various tables
    // For now, return mock structure
    return {
      user: {},
      reports: [],
      assessments: [],
      auditLogs: [],
      notifications: [],
      exportedAt: new Date(),
      format: 'json'
    }
  }

  /**
   * Validate data processing consent
   */
  static validateConsent(userId: string, processingType: string): boolean {
    // This would check user consent preferences
    // For now, return true (assuming consent)
    return true
  }
}

// Initialize encryption service
EncryptionService.initialize()

export { EncryptionService as default }