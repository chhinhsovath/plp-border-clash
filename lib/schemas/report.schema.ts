import { z } from 'zod'
import { statusEnum, coordinatesSchema, dateStringSchema, metadataSchema, auditFieldsSchema } from './common.schema'

export const reportTypeEnum = z.enum([
  'ASSESSMENT',
  'SITUATION_REPORT',
  'MONITORING',
  'EVALUATION',
  'INCIDENT',
  'DISTRIBUTION',
  'NEEDS_ASSESSMENT',
  'RAPID_ASSESSMENT',
  'DETAILED_ASSESSMENT',
  'OTHER'
])

export const sectionTypeEnum = z.enum([
  'TEXT',
  'CHART',
  'TABLE',
  'IMAGE',
  'MAP',
  'FINDINGS',
  'RECOMMENDATIONS',
  'METHODOLOGY',
  'EXECUTIVE_SUMMARY'
])

export const sectionSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().optional(),
  type: sectionTypeEnum.default('TEXT'),
  title: z.string().min(1),
  content: z.union([
    z.string(),
    z.object({
      text: z.string().optional(),
      data: z.any().optional(),
      html: z.string().optional()
    })
  ]).optional(),
  order: z.number().int().min(0),
  metadata: metadataSchema
})

export const createReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  templateId: z.string().optional(),
  status: statusEnum.default('DRAFT'),
  reportType: reportTypeEnum.optional(),
  location: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  affectedPeople: z.union([z.string(), z.number()]).optional(),
  households: z.union([z.string(), z.number()]).optional(),
  methodology: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
  tags: z.array(z.string()).optional(),
  isConfidential: z.boolean().default(false),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'ORGANIZATION']).default('ORGANIZATION')
})

export const updateReportSchema = createReportSchema.partial()

export const reportSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: statusEnum,
  reportType: reportTypeEnum.nullable(),
  authorId: z.string(),
  author: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  }).optional(),
  organizationId: z.string(),
  templateId: z.string().nullable(),
  metadata: metadataSchema,
  sections: z.array(sectionSchema).optional(),
  collaborators: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    role: z.string(),
    user: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string()
    }).optional()
  })).optional(),
  version: z.number().default(1),
  publishedAt: z.date().nullable(),
  isConfidential: z.boolean(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'ORGANIZATION']),
  tags: z.array(z.string()).default([]),
  _count: z.object({
    sections: z.number(),
    collaborators: z.number(),
    comments: z.number(),
    versions: z.number()
  }).optional(),
  ...auditFieldsSchema.shape
})

export const reportQuerySchema = z.object({
  status: statusEnum.optional(),
  reportType: reportTypeEnum.optional(),
  authorId: z.string().optional(),
  organizationId: z.string().optional(),
  templateId: z.string().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  location: z.string().optional(),
  sectors: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
  isConfidential: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'ORGANIZATION']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status', 'publishedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const reportExportSchema = z.object({
  format: z.enum(['PDF', 'WORD', 'EXCEL', 'HTML']),
  includeComments: z.boolean().default(false),
  includeVersionHistory: z.boolean().default(false),
  includeCoverPage: z.boolean().default(true),
  includeTableOfContents: z.boolean().default(true),
  customStyles: z.record(z.string()).optional()
})

export const batchReportExportSchema = z.object({
  reportIds: z.array(z.string()).min(1),
  format: z.enum(['PDF', 'WORD', 'EXCEL', 'ZIP']),
  mergeIntoSingle: z.boolean().default(false)
})

export const reportCommentSchema = z.object({
  content: z.string().min(1),
  sectionId: z.string().optional(),
  parentId: z.string().optional()
})

export const reportVersionSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  version: z.number(),
  title: z.string(),
  content: z.any(),
  metadata: metadataSchema,
  createdBy: z.string(),
  createdAt: z.date(),
  changeLog: z.string().optional()
})

export type Report = z.infer<typeof reportSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type ReportQuery = z.infer<typeof reportQuerySchema>
export type Section = z.infer<typeof sectionSchema>
export type ReportType = z.infer<typeof reportTypeEnum>
export type ReportExportOptions = z.infer<typeof reportExportSchema>