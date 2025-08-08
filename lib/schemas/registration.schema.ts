import { z } from 'zod'
import { genderEnum, vulnerabilityFlagsSchema, phoneSchema, dateStringSchema } from './common.schema'

export const householdSchema = z.object({
  id: z.string().optional(),
  householdCode: z.string().optional(),
  siteId: z.string(),
  size: z.number().int().positive(),
  headOfHouseholdId: z.string().optional(),
  shelterNumber: z.string().optional(),
  zoneBlock: z.string().optional(),
  vulnerabilities: vulnerabilityFlagsSchema.optional(),
  monthlyIncome: z.number().optional(),
  primaryIncomeSource: z.string().optional(),
  assistanceReceived: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().or(dateStringSchema).optional(),
  updatedAt: z.date().or(dateStringSchema).optional()
})

export const createIndividualSchema = z.object({
  householdId: z.string().optional(),
  isHeadOfHousehold: z.boolean().default(false),
  createNewHousehold: z.boolean().default(false),
  
  // Personal Information
  fullLegalName: z.string().min(1, 'Full legal name is required'),
  commonlyUsedName: z.string().optional(),
  dateOfBirth: dateStringSchema,
  gender: genderEnum,
  nationality: z.string().min(1, 'Nationality is required'),
  ethnicGroup: z.string().optional(),
  motherTongue: z.string().optional(),
  
  // Previous Location
  preDisplacementAddress: z.string().optional(),
  villageOfOrigin: z.string().optional(),
  
  // Current Location
  currentSiteId: z.string().min(1, 'Current site is required'),
  zoneBlock: z.string().optional(),
  shelterNumber: z.string().optional(),
  
  // Contact
  contactNumber: phoneSchema.optional(),
  alternativeContact: phoneSchema.optional(),
  
  // Vulnerability Indicators
  unaccompaniedMinor: z.boolean().default(false),
  separatedChild: z.boolean().default(false),
  singleHeadedHH: z.boolean().default(false),
  pregnant: z.boolean().default(false),
  pregnancyDueDate: dateStringSchema.optional(),
  lactatingMother: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  disabilityDetails: z.string().optional(),
  elderly: z.boolean().default(false),
  chronicallyIll: z.boolean().default(false),
  illnessDetails: z.string().optional(),
  
  // Documentation
  hasIdDocument: z.boolean().default(false),
  idDocumentType: z.string().optional(),
  idDocumentNumber: z.string().optional(),
  
  // Education
  educationLevel: z.enum(['NONE', 'PRIMARY', 'SECONDARY', 'TERTIARY', 'VOCATIONAL']).optional(),
  isEnrolledInSchool: z.boolean().default(false),
  schoolName: z.string().optional(),
  
  // Health
  hasHealthInsurance: z.boolean().default(false),
  healthConditions: z.array(z.string()).optional(),
  requiredMedications: z.array(z.string()).optional(),
  
  // Additional Information
  skills: z.array(z.string()).optional(),
  languagesSpoken: z.array(z.string()).optional(),
  assistanceNeeded: z.array(z.string()).optional(),
  notes: z.string().optional()
})

export const updateIndividualSchema = createIndividualSchema.partial()

export const individualSchema = z.object({
  id: z.string(),
  individualCode: z.string(),
  householdId: z.string().nullable(),
  household: householdSchema.optional(),
  isHeadOfHousehold: z.boolean(),
  
  // Personal Information
  fullLegalName: z.string(),
  commonlyUsedName: z.string().nullable(),
  dateOfBirth: z.date(),
  age: z.number(),
  gender: genderEnum,
  nationality: z.string(),
  ethnicGroup: z.string().nullable(),
  motherTongue: z.string().nullable(),
  
  // Location Information
  preDisplacementAddress: z.string().nullable(),
  villageOfOrigin: z.string().nullable(),
  currentSiteId: z.string(),
  currentSite: z.object({
    id: z.string(),
    name: z.string(),
    siteCode: z.string()
  }).optional(),
  zoneBlock: z.string().nullable(),
  shelterNumber: z.string().nullable(),
  
  // Contact
  contactNumber: z.string().nullable(),
  alternativeContact: z.string().nullable(),
  
  // Vulnerability Flags
  ...vulnerabilityFlagsSchema.shape,
  pregnancyDueDate: z.date().nullable(),
  disabilityDetails: z.string().nullable(),
  illnessDetails: z.string().nullable(),
  
  // Documentation
  hasIdDocument: z.boolean(),
  idDocumentType: z.string().nullable(),
  idDocumentNumber: z.string().nullable(),
  
  // Metadata
  registrationDate: z.date(),
  registeredBy: z.string(),
  lastUpdatedBy: z.string().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  
  createdAt: z.date(),
  updatedAt: z.date()
})

export const individualQuerySchema = z.object({
  siteId: z.string().optional(),
  householdId: z.string().optional(),
  vulnerableOnly: z.boolean().optional(),
  gender: genderEnum.optional(),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
  nationality: z.string().optional(),
  hasIdDocument: z.boolean().optional(),
  isHeadOfHousehold: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['fullLegalName', 'dateOfBirth', 'registrationDate', 'individualCode']).default('registrationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const bulkRegistrationSchema = z.object({
  individuals: z.array(createIndividualSchema).min(1).max(100),
  createHouseholds: z.boolean().default(false),
  skipDuplicateCheck: z.boolean().default(false)
})

export const transferIndividualSchema = z.object({
  individualId: z.string(),
  newSiteId: z.string(),
  newHouseholdId: z.string().optional(),
  transferDate: dateStringSchema,
  reason: z.string(),
  notes: z.string().optional()
})

export type Individual = z.infer<typeof individualSchema>
export type CreateIndividualInput = z.infer<typeof createIndividualSchema>
export type UpdateIndividualInput = z.infer<typeof updateIndividualSchema>
export type IndividualQuery = z.infer<typeof individualQuerySchema>
export type Household = z.infer<typeof householdSchema>
export type BulkRegistration = z.infer<typeof bulkRegistrationSchema>