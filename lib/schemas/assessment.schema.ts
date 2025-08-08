import { z } from 'zod'
import { coordinatesSchema, dateStringSchema, metadataSchema } from './common.schema'

export const assessmentTypeEnum = z.enum([
  'RAPID',
  'DETAILED',
  'SECTORAL',
  'MULTI_SECTORAL',
  'MONITORING',
  'BASELINE',
  'ENDLINE',
  'NEEDS_ASSESSMENT'
])

export const assessmentStatusEnum = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'VALIDATED',
  'PUBLISHED',
  'ARCHIVED'
])

export const severityEnum = z.enum(['MINIMAL', 'STRESS', 'CRISIS', 'EMERGENCY', 'CATASTROPHE'])

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const createAssessmentSchema = z.object({
  reportId: z.string().optional(),
  type: assessmentTypeEnum,
  status: assessmentStatusEnum.default('PLANNED'),
  location: z.string().min(1),
  coordinates: coordinatesSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  teamLeader: z.string().optional(),
  teamMembers: z.array(z.string()).default([]),
  affectedPeople: z.number().positive().optional(),
  households: z.number().positive().optional(),
  methodology: z.string().optional(),
  sectors: z.array(z.string()).min(1),
  findings: z.object({
    summary: z.string(),
    details: z.array(z.object({
      sector: z.string(),
      severity: severityEnum,
      priority: priorityEnum,
      needs: z.array(z.string()),
      gaps: z.array(z.string()),
      recommendations: z.array(z.string())
    }))
  }).optional(),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: priorityEnum,
    timeframe: z.string(),
    responsibleParty: z.string().optional(),
    resources: z.string().optional()
  })).optional(),
  dataCollection: z.object({
    methods: z.array(z.enum(['SURVEY', 'INTERVIEW', 'FOCUS_GROUP', 'OBSERVATION', 'SECONDARY_DATA'])),
    sampleSize: z.number().positive().optional(),
    samplingMethod: z.string().optional(),
    tools: z.array(z.string()).optional()
  }).optional(),
  constraints: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url: z.string().url()
  })).optional()
})

export const updateAssessmentSchema = createAssessmentSchema.partial()

export const assessmentSchema = z.object({
  id: z.string(),
  reportId: z.string().nullable(),
  type: assessmentTypeEnum,
  status: assessmentStatusEnum,
  location: z.string(),
  coordinates: coordinatesSchema.nullable(),
  startDate: z.date(),
  endDate: z.date(),
  teamLeader: z.string().nullable(),
  teamMembers: z.any().nullable(),
  affectedPeople: z.number().nullable(),
  households: z.number().nullable(),
  methodology: z.string().nullable(),
  findings: z.any().nullable(),
  recommendations: z.any().nullable(),
  sectorData: z.any().nullable(),
  metadata: metadataSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const assessmentQuerySchema = z.object({
  type: assessmentTypeEnum.optional(),
  status: assessmentStatusEnum.optional(),
  location: z.string().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  sectors: z.union([z.string(), z.array(z.string())]).optional(),
  severity: severityEnum.optional(),
  priority: priorityEnum.optional(),
  teamLeader: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['createdAt', 'startDate', 'endDate', 'location', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const duplicateAssessmentSchema = z.object({
  includeFindings: z.boolean().default(false),
  includeRecommendations: z.boolean().default(false),
  newLocation: z.string().optional(),
  newStartDate: dateStringSchema.optional()
})

export type Assessment = z.infer<typeof assessmentSchema>
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>
export type AssessmentQuery = z.infer<typeof assessmentQuerySchema>
export type AssessmentType = z.infer<typeof assessmentTypeEnum>
export type AssessmentStatus = z.infer<typeof assessmentStatusEnum>
export type Severity = z.infer<typeof severityEnum>
export type Priority = z.infer<typeof priorityEnum>