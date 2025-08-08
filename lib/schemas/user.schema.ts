import { z } from 'zod'
import { emailSchema, phoneSchema, auditFieldsSchema } from './common.schema'

export const userRoleEnum = z.enum(['ADMIN', 'MANAGER', 'FIELD_OFFICER', 'VIEWER', 'SUPER_ADMIN'])

export const userStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])

export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8).optional(),
  role: userRoleEnum.default('VIEWER'),
  organizationId: z.string(),
  phone: phoneSchema.optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  status: userStatusEnum.default('PENDING')
})

export const updateUserSchema = createUserSchema.partial().omit({ 
  email: true,
  password: true 
})

export const userSchema = z.object({
  id: z.string(),
  email: emailSchema,
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleEnum,
  organizationId: z.string(),
  organizationName: z.string().optional(),
  phone: phoneSchema.optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  status: userStatusEnum,
  lastLogin: z.date().nullable(),
  profileImage: z.string().url().optional(),
  ...auditFieldsSchema.shape
})

export const userListQuerySchema = z.object({
  organizationId: z.string().optional(),
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'lastLogin']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1),
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete']),
  reason: z.string().optional()
})

export const userPermissionSchema = z.object({
  resource: z.string(),
  actions: z.array(z.enum(['create', 'read', 'update', 'delete', 'approve', 'publish']))
})

export const updateUserPermissionsSchema = z.object({
  permissions: z.array(userPermissionSchema)
})

export type User = z.infer<typeof userSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserRole = z.infer<typeof userRoleEnum>
export type UserStatus = z.infer<typeof userStatusEnum>
export type UserListQuery = z.infer<typeof userListQuerySchema>