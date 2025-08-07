import { RBAC, UserRole, Permission } from '@/lib/auth/rbac'
import { TestDataFactory } from '../../setup/test-helpers'

describe('RBAC System', () => {
  describe('Permission Checks', () => {
    it('should allow SUPER_ADMIN access to all permissions', () => {
      const user = TestDataFactory.createUser({ role: UserRole.SUPER_ADMIN })
      
      Object.values(Permission).forEach(permission => {
        expect(RBAC.hasPermission(user, permission)).toBe(true)
      })
    })

    it('should enforce role hierarchy correctly', () => {
      const orgAdmin = TestDataFactory.createUser({ role: UserRole.ORG_ADMIN })
      const manager = TestDataFactory.createUser({ role: UserRole.MANAGER })
      const coordinator = TestDataFactory.createUser({ role: UserRole.COORDINATOR })
      const fieldWorker = TestDataFactory.createUser({ role: UserRole.FIELD_WORKER })
      const viewer = TestDataFactory.createUser({ role: UserRole.VIEWER })

      // ORG_ADMIN should have user management permissions
      expect(RBAC.hasPermission(orgAdmin, Permission.MANAGE_USERS)).toBe(true)
      expect(RBAC.hasPermission(manager, Permission.MANAGE_USERS)).toBe(false)

      // MANAGER should have report management permissions
      expect(RBAC.hasPermission(manager, Permission.MANAGE_REPORTS)).toBe(true)
      expect(RBAC.hasPermission(coordinator, Permission.MANAGE_REPORTS)).toBe(false)

      // COORDINATOR should have create permissions
      expect(RBAC.hasPermission(coordinator, Permission.CREATE_REPORTS)).toBe(true)
      expect(RBAC.hasPermission(fieldWorker, Permission.CREATE_REPORTS)).toBe(false)

      // FIELD_WORKER should have basic permissions
      expect(RBAC.hasPermission(fieldWorker, Permission.VIEW_REPORTS)).toBe(true)
      expect(RBAC.hasPermission(viewer, Permission.EDIT_REPORTS)).toBe(false)

      // VIEWER should only have read permissions
      expect(RBAC.hasPermission(viewer, Permission.VIEW_REPORTS)).toBe(true)
      expect(RBAC.hasPermission(viewer, Permission.CREATE_REPORTS)).toBe(false)
    })

    it('should validate organization context', () => {
      const user1 = TestDataFactory.createUser({ organizationId: 'org-1', role: UserRole.MANAGER })
      const user2 = TestDataFactory.createUser({ organizationId: 'org-2', role: UserRole.MANAGER })
      const report = TestDataFactory.createReport({ organizationId: 'org-1' })

      expect(RBAC.canAccessResource(user1, report, 'organizationId')).toBe(true)
      expect(RBAC.canAccessResource(user2, report, 'organizationId')).toBe(false)
    })

    it('should handle ownership validation', () => {
      const owner = TestDataFactory.createUser({ id: 'user-1', role: UserRole.FIELD_WORKER })
      const nonOwner = TestDataFactory.createUser({ id: 'user-2', role: UserRole.FIELD_WORKER })
      const report = TestDataFactory.createReport({ authorId: 'user-1' })

      expect(RBAC.canAccessResource(owner, report, 'authorId')).toBe(true)
      expect(RBAC.canAccessResource(nonOwner, report, 'authorId')).toBe(false)
    })
  })

  describe('Complex Permission Scenarios', () => {
    it('should handle mixed permissions correctly', () => {
      const coordinator = TestDataFactory.createUser({ role: UserRole.COORDINATOR })
      
      // Can create and edit reports
      expect(RBAC.hasPermission(coordinator, Permission.CREATE_REPORTS)).toBe(true)
      expect(RBAC.hasPermission(coordinator, Permission.EDIT_REPORTS)).toBe(true)
      
      // Cannot delete reports or manage users
      expect(RBAC.hasPermission(coordinator, Permission.DELETE_REPORTS)).toBe(false)
      expect(RBAC.hasPermission(coordinator, Permission.MANAGE_USERS)).toBe(false)
    })

    it('should validate multiple permissions', () => {
      const manager = TestDataFactory.createUser({ role: UserRole.MANAGER })
      const requiredPermissions = [Permission.VIEW_REPORTS, Permission.EDIT_REPORTS, Permission.MANAGE_REPORTS]
      
      expect(RBAC.hasAllPermissions(manager, requiredPermissions)).toBe(true)
      
      const fieldWorker = TestDataFactory.createUser({ role: UserRole.FIELD_WORKER })
      expect(RBAC.hasAllPermissions(fieldWorker, requiredPermissions)).toBe(false)
    })
  })

  describe('Role Validation', () => {
    it('should validate role hierarchy', () => {
      expect(RBAC.isRoleHigherOrEqual(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)).toBe(true)
      expect(RBAC.isRoleHigherOrEqual(UserRole.ORG_ADMIN, UserRole.MANAGER)).toBe(true)
      expect(RBAC.isRoleHigherOrEqual(UserRole.MANAGER, UserRole.COORDINATOR)).toBe(true)
      expect(RBAC.isRoleHigherOrEqual(UserRole.COORDINATOR, UserRole.FIELD_WORKER)).toBe(true)
      expect(RBAC.isRoleHigherOrEqual(UserRole.FIELD_WORKER, UserRole.VIEWER)).toBe(true)
      
      // Reverse should be false
      expect(RBAC.isRoleHigherOrEqual(UserRole.VIEWER, UserRole.FIELD_WORKER)).toBe(false)
      expect(RBAC.isRoleHigherOrEqual(UserRole.FIELD_WORKER, UserRole.COORDINATOR)).toBe(false)
    })

    it('should handle equal roles', () => {
      expect(RBAC.isRoleHigherOrEqual(UserRole.MANAGER, UserRole.MANAGER)).toBe(true)
      expect(RBAC.isRoleHigherOrEqual(UserRole.COORDINATOR, UserRole.COORDINATOR)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid roles gracefully', () => {
      const invalidUser = TestDataFactory.createUser({ role: 'INVALID_ROLE' as UserRole })
      expect(RBAC.hasPermission(invalidUser, Permission.VIEW_REPORTS)).toBe(false)
    })

    it('should handle missing user data', () => {
      expect(() => RBAC.hasPermission(null, Permission.VIEW_REPORTS)).toThrow()
      expect(() => RBAC.hasPermission(undefined, Permission.VIEW_REPORTS)).toThrow()
    })

    it('should handle missing resource fields', () => {
      const user = TestDataFactory.createUser()
      const resource = { id: 'test' } // Missing organizationId
      
      expect(RBAC.canAccessResource(user, resource, 'organizationId')).toBe(false)
    })
  })
})