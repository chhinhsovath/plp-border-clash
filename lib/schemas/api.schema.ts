import { z } from 'zod'

// Generic API Response Schemas
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
  code: z.string().optional(),
  statusCode: z.number().optional(),
  timestamp: z.string().datetime().optional()
})

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional()
  })

export const paginatedApiResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional()
  })

// Batch Operation Schemas
export const batchOperationResultSchema = z.object({
  success: z.boolean(),
  total: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(z.object({
    id: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  })).optional(),
  errors: z.array(z.object({
    id: z.string(),
    error: z.string(),
    details: z.any().optional()
  })).optional()
})

// File Upload Response
export const fileUploadResponseSchema = z.object({
  success: z.literal(true),
  file: z.object({
    id: z.string(),
    filename: z.string(),
    originalName: z.string(),
    mimetype: z.string(),
    size: z.number(),
    url: z.string().url(),
    uploadedAt: z.string().datetime()
  })
})

export const multipleFileUploadResponseSchema = z.object({
  success: z.literal(true),
  files: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    originalName: z.string(),
    mimetype: z.string(),
    size: z.number(),
    url: z.string().url(),
    uploadedAt: z.string().datetime()
  }))
})

// Export Response Schemas
export const exportResponseSchema = z.object({
  success: z.literal(true),
  format: z.enum(['PDF', 'EXCEL', 'WORD', 'CSV', 'JSON', 'HTML']),
  filename: z.string(),
  url: z.string().url(),
  size: z.number(),
  expiresAt: z.string().datetime().optional()
})

// Statistics and Analytics
export const statisticsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalReports: z.number().int().min(0),
    totalAssessments: z.number().int().min(0),
    totalBeneficiaries: z.number().int().min(0),
    totalDistributions: z.number().int().min(0),
    byStatus: z.record(z.number()),
    bySector: z.record(z.number()),
    byLocation: z.record(z.number()),
    trends: z.array(z.object({
      date: z.string(),
      value: z.number()
    })).optional()
  }),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
})

// Health Check Response
export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  uptime: z.number(),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']).optional(),
    storage: z.enum(['up', 'down']).optional()
  }),
  version: z.string().optional(),
  environment: z.string().optional()
})

// Webhook Schemas
export const webhookPayloadSchema = z.object({
  event: z.string(),
  timestamp: z.string().datetime(),
  data: z.any(),
  signature: z.string().optional()
})

export const webhookResponseSchema = z.object({
  received: z.literal(true),
  processed: z.boolean(),
  message: z.string().optional()
})

// Rate Limit Response
export const rateLimitResponseSchema = z.object({
  error: z.literal('Too Many Requests'),
  message: z.string(),
  retryAfter: z.number(), // seconds
  limit: z.number(),
  remaining: z.number(),
  reset: z.string().datetime()
})

// Validation Error Response
export const validationErrorResponseSchema = z.object({
  error: z.literal('Validation Error'),
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional()
  }))
})

// Types
export type ApiError = z.infer<typeof apiErrorSchema>
export type BatchOperationResult = z.infer<typeof batchOperationResultSchema>
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>
export type ExportResponse = z.infer<typeof exportResponseSchema>
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>
export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>