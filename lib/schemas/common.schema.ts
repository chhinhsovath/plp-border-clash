import { z } from 'zod'

export const dateStringSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  { message: 'Invalid date format' }
)

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')

export const uuidSchema = z.string().uuid('Invalid UUID')

export const emailSchema = z.string().email('Invalid email address')

export const phoneSchema = z.string().regex(
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/,
  'Invalid phone number'
)

export const coordinatesSchema = z.object({
  lat: z.union([z.string(), z.number()]).transform(val => String(val)),
  lng: z.union([z.string(), z.number()]).transform(val => String(val))
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const searchParamsSchema = z.object({
  search: z.string().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  status: z.string().optional(),
  ...paginationSchema.shape
})

export const metadataSchema = z.record(z.unknown()).default({})

export const auditFieldsSchema = z.object({
  createdAt: z.date().or(dateStringSchema),
  updatedAt: z.date().or(dateStringSchema),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional()
})

export const statusEnum = z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'])

export const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER'])

export const vulnerabilityFlagsSchema = z.object({
  unaccompaniedMinor: z.boolean().default(false),
  separatedChild: z.boolean().default(false),
  singleHeadedHH: z.boolean().default(false),
  pregnant: z.boolean().default(false),
  lactatingMother: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  elderly: z.boolean().default(false),
  chronicallyIll: z.boolean().default(false)
})

export const fileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number().positive(),
  url: z.string().url()
})

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
  code: z.string().optional()
})

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional()
  })

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number()
    }),
    message: z.string().optional()
  })

export const idParamSchema = z.object({
  id: z.string()
})

export const slugParamSchema = z.object({
  slug: z.string()
})