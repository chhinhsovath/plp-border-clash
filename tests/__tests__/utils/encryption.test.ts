import { EncryptionService, GDPR } from '@/lib/utils/encryption'
import { TestDataFactory } from '../../setup/test-helpers'

// Mock crypto module
const mockCrypto = {
  randomBytes: jest.fn(),
  createCipher: jest.fn(),
  createDecipher: jest.fn(),
  pbkdf2Sync: jest.fn(),
  createHash: jest.fn()
}

jest.mock('crypto', () => mockCrypto)

describe('Encryption Service', () => {
  let encryptionService: EncryptionService

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Set test encryption key
    process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-key-32-characters'
    
    encryptionService = new EncryptionService()
  })

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'sensitive information'
      
      // Mock crypto functions
      const mockIv = Buffer.from('1234567890123456')
      const mockEncrypted = Buffer.from('encrypted-data')
      const mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('part1')),
        final: jest.fn().mockReturnValue(Buffer.from('part2'))
      }
      
      mockCrypto.randomBytes.mockReturnValue(mockIv)
      mockCrypto.createCipher.mockReturnValue(mockCipher)
      
      const encrypted = encryptionService.encrypt(plaintext)
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16)
      expect(mockCrypto.createCipher).toHaveBeenCalledWith('aes-256-gcm', expect.any(String))
      expect(encrypted).toContain(':') // Should contain IV separator
    })

    it('should decrypt encrypted text correctly', () => {
      const encryptedData = 'MTIzNDU2Nzg5MDEyMzQ1Ng==:ZW5jcnlwdGVkLWRhdGE='
      const expectedPlaintext = 'sensitive information'
      
      const mockDecipher = {
        update: jest.fn().mockReturnValue(Buffer.from('sensitive ')),
        final: jest.fn().mockReturnValue(Buffer.from('information'))
      }
      
      mockCrypto.createDecipher.mockReturnValue(mockDecipher)
      
      const decrypted = encryptionService.decrypt(encryptedData)
      
      expect(mockCrypto.createDecipher).toHaveBeenCalledWith('aes-256-gcm', expect.any(String))
      expect(decrypted).toBe('sensitive information')
    })

    it('should handle encryption errors gracefully', () => {
      const plaintext = 'test data'
      
      mockCrypto.createCipher.mockImplementation(() => {
        throw new Error('Encryption failed')
      })
      
      expect(() => encryptionService.encrypt(plaintext)).toThrow('Encryption failed')
    })

    it('should handle decryption errors gracefully', () => {
      const invalidEncrypted = 'invalid-format'
      
      expect(() => encryptionService.decrypt(invalidEncrypted)).toThrow()
    })
  })

  describe('Field-Level Encryption', () => {
    it('should encrypt specific fields in an object', () => {
      const user = TestDataFactory.createUser({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })
      
      const sensitiveFields = ['email', 'firstName', 'lastName']
      
      // Mock encryption
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('1234567890123456'))
      mockCrypto.createCipher.mockReturnValue({
        update: jest.fn().mockReturnValue(Buffer.from('encrypted')),
        final: jest.fn().mockReturnValue(Buffer.from('data'))
      })
      
      const encryptedUser = encryptionService.encryptFields(user, sensitiveFields)
      
      expect(encryptedUser.email).not.toBe('user@example.com')
      expect(encryptedUser.firstName).not.toBe('John')
      expect(encryptedUser.lastName).not.toBe('Doe')
      expect(encryptedUser.id).toBe(user.id) // Non-sensitive field unchanged
    })

    it('should decrypt specific fields in an object', () => {
      const encryptedUser = {
        id: 'user-123',
        email: 'MTIzNDU2Nzg5MDEyMzQ1Ng==:ZW5jcnlwdGVkZGF0YQ==',
        firstName: 'MTIzNDU2Nzg5MDEyMzQ1Ng==:ZW5jcnlwdGVkZGF0YQ==',
        role: 'USER'
      }
      
      const sensitiveFields = ['email', 'firstName']
      
      // Mock decryption
      mockCrypto.createDecipher.mockReturnValue({
        update: jest.fn().mockReturnValue(Buffer.from('decrypted')),
        final: jest.fn().mockReturnValue(Buffer.from('data'))
      })
      
      const decryptedUser = encryptionService.decryptFields(encryptedUser, sensitiveFields)
      
      expect(decryptedUser.email).toBe('decrypteddata')
      expect(decryptedUser.firstName).toBe('decrypteddata')
      expect(decryptedUser.role).toBe('USER') // Non-sensitive field unchanged
    })

    it('should handle missing fields gracefully', () => {
      const partialUser = {
        id: 'user-123',
        email: 'user@example.com'
      }
      
      const sensitiveFields = ['email', 'firstName', 'phone'] // Some fields missing
      
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('1234567890123456'))
      mockCrypto.createCipher.mockReturnValue({
        update: jest.fn().mockReturnValue(Buffer.from('encrypted')),
        final: jest.fn().mockReturnValue(Buffer.from('data'))
      })
      
      const encryptedUser = encryptionService.encryptFields(partialUser, sensitiveFields)
      
      expect(encryptedUser.email).not.toBe('user@example.com')
      expect(encryptedUser).not.toHaveProperty('firstName')
      expect(encryptedUser).not.toHaveProperty('phone')
    })
  })

  describe('Password Hashing', () => {
    it('should hash passwords securely', () => {
      const password = 'user-password-123'
      const mockSalt = Buffer.from('random-salt')
      const mockHash = Buffer.from('hashed-password')
      
      mockCrypto.randomBytes.mockReturnValue(mockSalt)
      mockCrypto.pbkdf2Sync.mockReturnValue(mockHash)
      
      const hashedPassword = encryptionService.hashPassword(password)
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32)
      expect(mockCrypto.pbkdf2Sync).toHaveBeenCalledWith(
        password,
        mockSalt,
        100000,
        64,
        'sha512'
      )
      expect(hashedPassword).toContain(':') // Salt:Hash format
    })

    it('should verify passwords correctly', () => {
      const password = 'user-password-123'
      const hashedPassword = 'cmFuZG9tLXNhbHQ=:aGFzaGVkLXBhc3N3b3Jk' // Base64 encoded salt:hash
      
      const mockSalt = Buffer.from('random-salt')
      const mockHash = Buffer.from('hashed-password')
      
      mockCrypto.pbkdf2Sync.mockReturnValue(mockHash)
      
      const isValid = encryptionService.verifyPassword(password, hashedPassword)
      
      expect(mockCrypto.pbkdf2Sync).toHaveBeenCalledWith(
        password,
        mockSalt,
        100000,
        64,
        'sha512'
      )
      expect(isValid).toBe(true)
    })

    it('should reject invalid passwords', () => {
      const password = 'wrong-password'
      const hashedPassword = 'cmFuZG9tLXNhbHQ=:aGFzaGVkLXBhc3N3b3Jk'
      
      const mockWrongHash = Buffer.from('different-hash')
      mockCrypto.pbkdf2Sync.mockReturnValue(mockWrongHash)
      
      const isValid = encryptionService.verifyPassword(password, hashedPassword)
      
      expect(isValid).toBe(false)
    })
  })

  describe('Data Anonymization', () => {
    it('should anonymize user data for GDPR compliance', () => {
      const user = TestDataFactory.createUser({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      })
      
      const anonymized = GDPR.anonymizeUserData(user)
      
      expect(anonymized.email).toMatch(/^anon_\w+@example\.com$/)
      expect(anonymized.firstName).toBe('Anonymous')
      expect(anonymized.lastName).toBe('User')
      expect(anonymized.phone).toBeNull()
      expect(anonymized.id).toBe(user.id) // ID preserved for referential integrity
    })

    it('should pseudonymize sensitive identifiers', () => {
      const originalId = 'user-12345'
      
      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-id-value')
      })
      
      const pseudonymized = GDPR.pseudonymizeIdentifier(originalId, 'user-data')
      
      expect(pseudonymized).toBe('hashed-id-value')
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256')
    })

    it('should create data export for GDPR requests', () => {
      const user = TestDataFactory.createUser()
      const reports = [TestDataFactory.createReport({ authorId: user.id })]
      const auditLogs = [TestDataFactory.createAuditLog({ userId: user.id })]
      
      const exportData = GDPR.createDataExport({
        user,
        reports,
        auditLogs,
        assessments: []
      })
      
      expect(exportData).toMatchObject({
        exportDate: expect.any(Date),
        userId: user.id,
        personalData: {
          profile: user,
          createdReports: reports,
          activityLogs: auditLogs,
          assessments: []
        },
        dataRetentionInfo: expect.any(Object)
      })
    })
  })

  describe('Secure Token Generation', () => {
    it('should generate secure random tokens', () => {
      const mockToken = Buffer.from('random-token-bytes')
      mockCrypto.randomBytes.mockReturnValue(mockToken)
      
      const token = encryptionService.generateSecureToken(32)
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32)
      expect(token).toBe(mockToken.toString('hex'))
    })

    it('should generate API keys with proper format', () => {
      const mockBytes = Buffer.from('api-key-bytes-here')
      mockCrypto.randomBytes.mockReturnValue(mockBytes)
      
      const apiKey = encryptionService.generateApiKey('test-org')
      
      expect(apiKey).toMatch(/^hrs_test-org_[a-f0-9]+$/)
    })
  })

  describe('Data Integrity', () => {
    it('should create and verify data checksums', () => {
      const data = { id: 'test', value: 'sensitive data' }
      const dataString = JSON.stringify(data)
      const mockHash = 'checksum-hash-value'
      
      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash)
      })
      
      const checksum = encryptionService.createChecksum(dataString)
      
      expect(checksum).toBe(mockHash)
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256')
      
      // Verify checksum
      const isValid = encryptionService.verifyChecksum(dataString, checksum)
      expect(isValid).toBe(true)
    })

    it('should detect data tampering', () => {
      const originalData = 'original data'
      const tamperedData = 'tampered data'
      const checksum = 'original-checksum'
      
      mockCrypto.createHash
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('original-checksum')
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('different-checksum')
        })
      
      const originalValid = encryptionService.verifyChecksum(originalData, checksum)
      const tamperedValid = encryptionService.verifyChecksum(tamperedData, checksum)
      
      expect(originalValid).toBe(true)
      expect(tamperedValid).toBe(false)
    })
  })

  describe('Key Derivation', () => {
    it('should derive encryption keys from master key', () => {
      const context = 'user-data-encryption'
      const mockDerivedKey = Buffer.from('derived-key-bytes')
      
      mockCrypto.pbkdf2Sync.mockReturnValue(mockDerivedKey)
      
      const derivedKey = encryptionService.deriveKey(context)
      
      expect(mockCrypto.pbkdf2Sync).toHaveBeenCalledWith(
        process.env.ENCRYPTION_MASTER_KEY,
        context,
        100000,
        32,
        'sha256'
      )
      expect(derivedKey).toBe(mockDerivedKey.toString('hex'))
    })

    it('should use different keys for different contexts', () => {
      const context1 = 'user-data'
      const context2 = 'audit-logs'
      
      mockCrypto.pbkdf2Sync
        .mockReturnValueOnce(Buffer.from('key1'))
        .mockReturnValueOnce(Buffer.from('key2'))
      
      const key1 = encryptionService.deriveKey(context1)
      const key2 = encryptionService.deriveKey(context2)
      
      expect(key1).not.toBe(key2)
    })
  })

  describe('Error Handling and Security', () => {
    it('should handle missing master key', () => {
      delete process.env.ENCRYPTION_MASTER_KEY
      
      expect(() => new EncryptionService()).toThrow('Master encryption key not configured')
    })

    it('should validate key strength', () => {
      process.env.ENCRYPTION_MASTER_KEY = 'weak' // Too short
      
      expect(() => new EncryptionService()).toThrow('Master key must be at least 32 characters')
    })

    it('should handle malformed encrypted data', () => {
      const invalidData = 'not-base64-encoded:invalid'
      
      expect(() => encryptionService.decrypt(invalidData)).toThrow()
    })

    it('should securely clear sensitive data from memory', () => {
      const sensitiveData = Buffer.from('secret information')
      
      encryptionService.secureClear(sensitiveData)
      
      // Buffer should be zeroed out
      expect(sensitiveData.every(byte => byte === 0)).toBe(true)
    })
  })
})