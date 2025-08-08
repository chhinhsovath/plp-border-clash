import { z } from 'zod'
import { dateStringSchema, genderEnum } from './common.schema'

export const incidentTypeEnum = z.enum([
  'GBV',
  'CHILD_ABUSE',
  'EXPLOITATION',
  'TRAFFICKING',
  'KIDNAPPING',
  'FORCED_RECRUITMENT',
  'DETENTION',
  'HARASSMENT',
  'DISCRIMINATION',
  'PROPERTY_VIOLATION',
  'OTHER'
])

export const incidentSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const protectionIncidentSchema = z.object({
  incidentCode: z.string().optional(),
  reportDate: dateStringSchema,
  incidentDate: dateStringSchema,
  incidentTime: z.string().optional(),
  
  // Location
  location: z.string().min(1, 'Location is required'),
  specificLocation: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  
  // Incident Details
  incidentType: incidentTypeEnum,
  incidentSubtype: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: incidentSeverityEnum,
  
  // Survivor Information (kept minimal for confidentiality)
  survivorAge: z.number().int().min(0).max(120).optional(),
  survivorGender: genderEnum.optional(),
  survivorNationality: z.string().optional(),
  isUnaccompaniedMinor: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  
  // Multiple survivors
  numberOfSurvivors: z.number().int().positive().default(1),
  
  // Perpetrator Information (if known)
  perpetratorKnown: z.boolean(),
  perpetratorRelationship: z.string().optional(),
  numberOfPerpetrators: z.number().int().positive().optional(),
  
  // Response Actions
  immediateActionsTaken: z.array(z.string()).default([]),
  referralsMade: z.array(z.object({
    service: z.string(),
    organization: z.string(),
    date: dateStringSchema,
    status: z.enum(['PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED'])
  })).optional(),
  
  // Services Provided
  servicesProvided: z.array(z.enum([
    'MEDICAL',
    'PSYCHOSOCIAL',
    'LEGAL',
    'SAFETY_SECURITY',
    'SHELTER',
    'LIVELIHOOD',
    'EDUCATION',
    'OTHER'
  ])).default([]),
  
  // Case Management
  caseOpened: z.boolean().default(false),
  caseNumber: z.string().optional(),
  assignedCaseWorker: z.string().optional(),
  
  // Follow-up
  followUpRequired: z.boolean().default(true),
  followUpDate: dateStringSchema.optional(),
  followUpActions: z.array(z.string()).optional(),
  
  // Status
  status: z.enum(['REPORTED', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED', 'REFERRED']),
  resolutionDate: dateStringSchema.optional(),
  resolutionDetails: z.string().optional(),
  
  // Consent and Confidentiality
  consentObtained: z.boolean(),
  informationSharedWith: z.array(z.string()).optional(),
  
  // Additional Information
  witnessesPresent: z.boolean().default(false),
  evidenceCollected: z.boolean().default(false),
  policeInvolved: z.boolean().default(false),
  policeReportNumber: z.string().optional(),
  
  notes: z.string().optional(),
  reportedBy: z.string(),
  confidentialityLevel: z.enum(['PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL']).default('CONFIDENTIAL')
})

export const caseManagementSchema = z.object({
  caseNumber: z.string(),
  incidentId: z.string().optional(),
  
  // Client Information
  clientCode: z.string(), // Anonymized identifier
  registrationDate: dateStringSchema,
  
  // Assessment
  initialAssessment: z.object({
    date: dateStringSchema,
    needs: z.array(z.string()),
    risks: z.array(z.string()),
    strengths: z.array(z.string()),
    priorityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  }),
  
  // Care Plan
  carePlan: z.object({
    goals: z.array(z.object({
      description: z.string(),
      timeframe: z.string(),
      responsible: z.string(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    })),
    services: z.array(z.object({
      type: z.string(),
      provider: z.string(),
      startDate: dateStringSchema,
      endDate: dateStringSchema.optional(),
      status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'DISCONTINUED'])
    }))
  }),
  
  // Case Notes
  caseNotes: z.array(z.object({
    date: dateStringSchema,
    note: z.string(),
    author: z.string(),
    type: z.enum(['CONTACT', 'PROGRESS', 'INCIDENT', 'CLOSURE', 'OTHER'])
  })).optional(),
  
  // Status
  status: z.enum(['OPEN', 'CLOSED', 'TRANSFERRED', 'INACTIVE']),
  closureDate: dateStringSchema.optional(),
  closureReason: z.string().optional(),
  
  assignedTo: z.string(),
  supervisor: z.string().optional()
})

export const childProtectionSchema = z.object({
  childId: z.string(),
  registrationDate: dateStringSchema,
  
  // Child Information
  age: z.number().int().min(0).max(18),
  gender: genderEnum,
  
  // Protection Concerns
  protectionConcerns: z.array(z.enum([
    'UNACCOMPANIED',
    'SEPARATED',
    'ORPHAN',
    'CHILD_LABOR',
    'CHILD_MARRIAGE',
    'ARMED_FORCES',
    'TRAFFICKING',
    'ABUSE',
    'NEGLECT',
    'EXPLOITATION'
  ])),
  
  // Care Arrangement
  currentCareArrangement: z.enum([
    'WITH_PARENTS',
    'WITH_RELATIVES',
    'FOSTER_CARE',
    'INSTITUTIONAL_CARE',
    'INDEPENDENT_LIVING',
    'UNKNOWN'
  ]),
  
  caregiverName: z.string().optional(),
  caregiverRelationship: z.string().optional(),
  caregiverContact: z.string().optional(),
  
  // Family Tracing
  familyTracingRequired: z.boolean(),
  familyTracingStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SUCCESSFUL', 'UNSUCCESSFUL']).optional(),
  reunificationDate: dateStringSchema.optional(),
  
  // Best Interest Assessment
  biaCompleted: z.boolean().default(false),
  biaDate: dateStringSchema.optional(),
  bidRequired: z.boolean().default(false), // Best Interest Determination
  bidDate: dateStringSchema.optional(),
  
  // Services
  servicesReceiving: z.array(z.string()).default([]),
  
  followUpSchedule: z.array(z.object({
    date: dateStringSchema,
    purpose: z.string(),
    completed: z.boolean().default(false)
  })).optional()
})

export type ProtectionIncident = z.infer<typeof protectionIncidentSchema>
export type CaseManagement = z.infer<typeof caseManagementSchema>
export type ChildProtection = z.infer<typeof childProtectionSchema>
export type IncidentType = z.infer<typeof incidentTypeEnum>
export type IncidentSeverity = z.infer<typeof incidentSeverityEnum>