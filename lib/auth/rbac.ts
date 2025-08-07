// Role-Based Access Control (RBAC) System
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  MANAGER = 'MANAGER',
  COORDINATOR = 'COORDINATOR',
  FIELD_WORKER = 'FIELD_WORKER',
  VIEWER = 'VIEWER'
}

export enum Permission {
  // Report permissions
  CREATE_REPORT = 'CREATE_REPORT',
  READ_REPORT = 'READ_REPORT',
  UPDATE_REPORT = 'UPDATE_REPORT',
  DELETE_REPORT = 'DELETE_REPORT',
  PUBLISH_REPORT = 'PUBLISH_REPORT',
  APPROVE_REPORT = 'APPROVE_REPORT',
  
  // Assessment permissions
  CREATE_ASSESSMENT = 'CREATE_ASSESSMENT',
  READ_ASSESSMENT = 'READ_ASSESSMENT',
  UPDATE_ASSESSMENT = 'UPDATE_ASSESSMENT',
  DELETE_ASSESSMENT = 'DELETE_ASSESSMENT',
  EXPORT_ASSESSMENT = 'EXPORT_ASSESSMENT',
  
  // User management permissions
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  
  // Organization permissions
  MANAGE_ORGANIZATION = 'MANAGE_ORGANIZATION',
  VIEW_ORG_ANALYTICS = 'VIEW_ORG_ANALYTICS',
  CONFIGURE_SETTINGS = 'CONFIGURE_SETTINGS',
  
  // Audit and security permissions
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_SECURITY = 'MANAGE_SECURITY',
  ACCESS_ADMIN_PANEL = 'ACCESS_ADMIN_PANEL',
  
  // Collaboration permissions
  COMMENT_ON_REPORTS = 'COMMENT_ON_REPORTS',
  SHARE_REPORTS = 'SHARE_REPORTS',
  INVITE_COLLABORATORS = 'INVITE_COLLABORATORS'
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  
  [UserRole.ORG_ADMIN]: [
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.UPDATE_REPORT,
    Permission.DELETE_REPORT,
    Permission.PUBLISH_REPORT,
    Permission.APPROVE_REPORT,
    Permission.CREATE_ASSESSMENT,
    Permission.READ_ASSESSMENT,
    Permission.UPDATE_ASSESSMENT,
    Permission.DELETE_ASSESSMENT,
    Permission.EXPORT_ASSESSMENT,
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.ASSIGN_ROLES,
    Permission.MANAGE_ORGANIZATION,
    Permission.VIEW_ORG_ANALYTICS,
    Permission.CONFIGURE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SECURITY,
    Permission.COMMENT_ON_REPORTS,
    Permission.SHARE_REPORTS,
    Permission.INVITE_COLLABORATORS
  ],
  
  [UserRole.MANAGER]: [
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.UPDATE_REPORT,
    Permission.DELETE_REPORT,
    Permission.PUBLISH_REPORT,
    Permission.CREATE_ASSESSMENT,
    Permission.READ_ASSESSMENT,
    Permission.UPDATE_ASSESSMENT,
    Permission.DELETE_ASSESSMENT,
    Permission.EXPORT_ASSESSMENT,
    Permission.READ_USER,
    Permission.VIEW_ORG_ANALYTICS,
    Permission.COMMENT_ON_REPORTS,
    Permission.SHARE_REPORTS,
    Permission.INVITE_COLLABORATORS
  ],
  
  [UserRole.COORDINATOR]: [
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.UPDATE_REPORT,
    Permission.CREATE_ASSESSMENT,
    Permission.READ_ASSESSMENT,
    Permission.UPDATE_ASSESSMENT,
    Permission.EXPORT_ASSESSMENT,
    Permission.READ_USER,
    Permission.COMMENT_ON_REPORTS,
    Permission.SHARE_REPORTS
  ],
  
  [UserRole.FIELD_WORKER]: [
    Permission.CREATE_REPORT,
    Permission.READ_REPORT,
    Permission.UPDATE_REPORT,
    Permission.CREATE_ASSESSMENT,
    Permission.READ_ASSESSMENT,
    Permission.UPDATE_ASSESSMENT,
    Permission.COMMENT_ON_REPORTS
  ],
  
  [UserRole.VIEWER]: [
    Permission.READ_REPORT,
    Permission.READ_ASSESSMENT,
    Permission.COMMENT_ON_REPORTS
  ]
}

export interface RBACContext {
  userId: string
  userRole: UserRole
  organizationId: string
  permissions: Permission[]
}

export class RBACService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(context: RBACContext, permission: Permission): boolean {
    return context.permissions.includes(permission)
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(context: RBACContext, permissions: Permission[]): boolean {
    return permissions.some(permission => context.permissions.includes(permission))
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(context: RBACContext, permissions: Permission[]): boolean {
    return permissions.every(permission => context.permissions.includes(permission))
  }

  /**
   * Get permissions for a specific role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if user can access a specific resource
   */
  static canAccessResource(
    context: RBACContext,
    resourceType: 'report' | 'assessment' | 'user' | 'organization',
    action: 'create' | 'read' | 'update' | 'delete',
    resourceOwnerId?: string,
    resourceOrganizationId?: string
  ): boolean {
    // Check organization access first
    if (resourceOrganizationId && resourceOrganizationId !== context.organizationId) {
      // Only super admins can access cross-organization resources
      return context.userRole === UserRole.SUPER_ADMIN
    }

    // Map resource type and action to permission
    const permissionMap: Record<string, Permission> = {
      'report-create': Permission.CREATE_REPORT,
      'report-read': Permission.READ_REPORT,
      'report-update': Permission.UPDATE_REPORT,
      'report-delete': Permission.DELETE_REPORT,
      'assessment-create': Permission.CREATE_ASSESSMENT,
      'assessment-read': Permission.READ_ASSESSMENT,
      'assessment-update': Permission.UPDATE_ASSESSMENT,
      'assessment-delete': Permission.DELETE_ASSESSMENT,
      'user-create': Permission.CREATE_USER,
      'user-read': Permission.READ_USER,
      'user-update': Permission.UPDATE_USER,
      'user-delete': Permission.DELETE_USER,
      'organization-create': Permission.MANAGE_ORGANIZATION,
      'organization-read': Permission.MANAGE_ORGANIZATION,
      'organization-update': Permission.MANAGE_ORGANIZATION,
      'organization-delete': Permission.MANAGE_ORGANIZATION
    }

    const requiredPermission = permissionMap[`${resourceType}-${action}`]
    if (!requiredPermission) return false

    const hasPermission = this.hasPermission(context, requiredPermission)

    // Additional checks for resource ownership
    if (resourceOwnerId && resourceOwnerId === context.userId) {
      // Users can usually read/update their own resources
      if (action === 'read' || action === 'update') {
        return true
      }
    }

    return hasPermission
  }

  /**
   * Filter resources based on user permissions
   */
  static filterResourcesByPermissions<T extends { id: string, organizationId?: string, createdById?: string }>(
    context: RBACContext,
    resources: T[],
    resourceType: 'report' | 'assessment' | 'user',
    action: 'read' | 'update' | 'delete' = 'read'
  ): T[] {
    return resources.filter(resource => 
      this.canAccessResource(
        context,
        resourceType,
        action,
        resource.createdById,
        resource.organizationId
      )
    )
  }

  /**
   * Create RBAC context from user data
   */
  static createContext(user: {
    id: string
    role: string
    organizationId: string
  }): RBACContext {
    const userRole = user.role as UserRole
    const permissions = this.getPermissionsForRole(userRole)

    return {
      userId: user.id,
      userRole,
      organizationId: user.organizationId,
      permissions
    }
  }

  /**
   * Validate role hierarchy for role assignment
   */
  static canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.SUPER_ADMIN]: 6,
      [UserRole.ORG_ADMIN]: 5,
      [UserRole.MANAGER]: 4,
      [UserRole.COORDINATOR]: 3,
      [UserRole.FIELD_WORKER]: 2,
      [UserRole.VIEWER]: 1
    }

    const assignerLevel = roleHierarchy[assignerRole] || 0
    const targetLevel = roleHierarchy[targetRole] || 0

    // Can only assign roles at or below your level
    return assignerLevel > targetLevel
  }

  /**
   * Get allowed actions for a resource
   */
  static getAllowedActions(
    context: RBACContext,
    resourceType: 'report' | 'assessment' | 'user' | 'organization',
    resourceOwnerId?: string,
    resourceOrganizationId?: string
  ): string[] {
    const actions = ['create', 'read', 'update', 'delete'] as const
    return actions.filter(action =>
      this.canAccessResource(context, resourceType, action, resourceOwnerId, resourceOrganizationId)
    )
  }
}

// Middleware helper for API routes
export function requirePermission(...permissions: Permission[]) {
  return (context: RBACContext) => {
    if (!RBACService.hasAllPermissions(context, permissions)) {
      throw new Error(`Insufficient permissions. Required: ${permissions.join(', ')}`)
    }
  }
}

// React hook for frontend permission checks
export function usePermissions() {
  // This would be implemented with React context in a real app
  return {
    hasPermission: (permission: Permission) => {
      // Implementation would depend on how user context is managed
      return true // Placeholder
    },
    hasAnyPermission: (permissions: Permission[]) => {
      // Implementation would depend on how user context is managed
      return true // Placeholder
    },
    canAccess: (resourceType: string, action: string) => {
      // Implementation would depend on how user context is managed
      return true // Placeholder
    }
  }
}

export default RBACService