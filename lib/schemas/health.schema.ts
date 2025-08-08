import { z } from 'zod'
import { dateStringSchema, genderEnum } from './common.schema'

export const healthVisitTypeEnum = z.enum([
  'CONSULTATION',
  'EMERGENCY',
  'VACCINATION',
  'ANTENATAL',
  'POSTNATAL',
  'NUTRITION_SCREENING',
  'FOLLOW_UP',
  'REFERRAL'
])

export const createClinicalVisitSchema = z.object({
  individualId: z.string().min(1, 'Individual ID is required'),
  visitDate: dateStringSchema,
  visitType: healthVisitTypeEnum,
  facilityName: z.string().min(1, 'Facility name is required'),
  
  // Patient Details
  patientAge: z.number().int().min(0).max(150),
  patientGender: genderEnum,
  isPregnant: z.boolean().default(false),
  isLactating: z.boolean().default(false),
  
  // Clinical Information
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  symptoms: z.array(z.string()).default([]),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  
  // Diagnosis
  diagnosis: z.array(z.string()).min(1, 'At least one diagnosis is required'),
  icdCodes: z.array(z.string()).optional(),
  
  // Treatment
  treatmentProvided: z.array(z.string()).default([]),
  medicationsPrescribed: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string()
  })).optional(),
  
  // Outcome
  outcome: z.enum(['TREATED', 'REFERRED', 'ADMITTED', 'DIED', 'LEFT_AGAINST_ADVICE']),
  referralTo: z.string().optional(),
  referralReason: z.string().optional(),
  
  // Follow-up
  followUpRequired: z.boolean().default(false),
  followUpDate: dateStringSchema.optional(),
  
  // Additional Information
  labTestsOrdered: z.array(z.string()).optional(),
  labTestResults: z.array(z.object({
    testName: z.string(),
    result: z.string(),
    normalRange: z.string().optional()
  })).optional(),
  
  notes: z.string().optional(),
  recordedBy: z.string().optional()
})

export const vaccinationRecordSchema = z.object({
  individualId: z.string(),
  vaccineType: z.string(),
  vaccineName: z.string(),
  doseNumber: z.number().int().positive(),
  dateAdministered: dateStringSchema,
  batchNumber: z.string().optional(),
  expiryDate: dateStringSchema.optional(),
  administeredBy: z.string(),
  facilityName: z.string(),
  sideEffects: z.array(z.string()).optional(),
  nextDoseDate: dateStringSchema.optional()
})

export const diseaseOutbreakSchema = z.object({
  diseaseName: z.string(),
  icdCode: z.string().optional(),
  locationId: z.string(),
  startDate: dateStringSchema,
  endDate: dateStringSchema.optional(),
  totalCases: z.number().int().min(0),
  totalDeaths: z.number().int().min(0),
  ageGroups: z.array(z.object({
    range: z.string(),
    cases: z.number(),
    deaths: z.number()
  })).optional(),
  responseActions: z.array(z.string()).optional(),
  status: z.enum(['SUSPECTED', 'CONFIRMED', 'CONTROLLED', 'ENDED'])
})

export const healthFacilitySchema = z.object({
  name: z.string(),
  type: z.enum(['HOSPITAL', 'CLINIC', 'HEALTH_POST', 'MOBILE_CLINIC', 'FIELD_HOSPITAL']),
  location: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  capacity: z.number().int().positive(),
  servicesAvailable: z.array(z.string()),
  staffCount: z.object({
    doctors: z.number().int().min(0),
    nurses: z.number().int().min(0),
    midwives: z.number().int().min(0),
    communityHealthWorkers: z.number().int().min(0),
    other: z.number().int().min(0)
  }),
  operatingHours: z.string(),
  contactNumber: z.string().optional(),
  isOperational: z.boolean()
})

export type ClinicalVisit = z.infer<typeof createClinicalVisitSchema>
export type VaccinationRecord = z.infer<typeof vaccinationRecordSchema>
export type DiseaseOutbreak = z.infer<typeof diseaseOutbreakSchema>
export type HealthFacility = z.infer<typeof healthFacilitySchema>