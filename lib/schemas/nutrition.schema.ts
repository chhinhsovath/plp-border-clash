import { z } from 'zod'
import { dateStringSchema, genderEnum } from './common.schema'

export const malnutritionStatusEnum = z.enum([
  'NORMAL',
  'MAM', // Moderate Acute Malnutrition
  'SAM', // Severe Acute Malnutrition
  'SAM_WITH_COMPLICATIONS',
  'AT_RISK'
])

export const nutritionAssessmentSchema = z.object({
  individualId: z.string().min(1, 'Individual ID is required'),
  assessmentDate: dateStringSchema,
  
  // Child Information
  childAge: z.number().min(0).max(59, 'Age must be between 0-59 months'),
  childGender: genderEnum,
  
  // Anthropometric Measurements
  weight: z.number().positive().max(50, 'Weight must be realistic for a child'),
  height: z.number().positive().max(150, 'Height must be realistic for a child'),
  muac: z.number().positive().max(300, 'MUAC must be in millimeters'), // Mid-Upper Arm Circumference
  
  // Calculated Indicators
  weightForHeight: z.number().optional(),
  weightForAge: z.number().optional(),
  heightForAge: z.number().optional(),
  
  // Z-scores
  whz: z.number().optional(), // Weight-for-Height Z-score
  waz: z.number().optional(), // Weight-for-Age Z-score
  haz: z.number().optional(), // Height-for-Age Z-score
  
  // Clinical Signs
  oedema: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE']),
  appetiteTest: z.enum(['PASS', 'FAIL', 'NOT_DONE']).optional(),
  
  // Classification
  malnutritionStatus: malnutritionStatusEnum,
  
  // Referral and Treatment
  referredTo: z.enum(['OTP', 'SFP', 'SC', 'NONE']).optional(), // OTP: Outpatient Therapeutic Program, SFP: Supplementary Feeding Program, SC: Stabilization Center
  admittedTo: z.string().optional(),
  treatmentStartDate: dateStringSchema.optional(),
  
  // Follow-up
  isFollowUp: z.boolean().default(false),
  previousAssessmentId: z.string().optional(),
  improvementStatus: z.enum(['IMPROVED', 'STABLE', 'DETERIORATED', 'NEW_CASE']).optional(),
  
  // Additional Information
  medicalComplications: z.array(z.string()).optional(),
  feedingPractices: z.object({
    breastfeeding: z.enum(['EXCLUSIVE', 'PARTIAL', 'NONE']).optional(),
    complementaryFeeding: z.boolean().optional(),
    mealFrequency: z.number().int().min(0).max(10).optional()
  }).optional(),
  
  householdFoodSecurity: z.enum(['SECURE', 'MILDLY_INSECURE', 'MODERATELY_INSECURE', 'SEVERELY_INSECURE']).optional(),
  
  notes: z.string().optional(),
  assessedBy: z.string()
})

export const feedingProgramSchema = z.object({
  programName: z.string(),
  programType: z.enum(['OTP', 'SFP', 'BSFP', 'SC', 'IYCF']), // BSFP: Blanket Supplementary Feeding Program, IYCF: Infant and Young Child Feeding
  location: z.string(),
  startDate: dateStringSchema,
  endDate: dateStringSchema.optional(),
  targetBeneficiaries: z.number().int().positive(),
  actualBeneficiaries: z.number().int().min(0),
  
  admissionCriteria: z.object({
    ageMin: z.number().int().min(0),
    ageMax: z.number().int().max(240),
    muacThreshold: z.number().optional(),
    whzThreshold: z.number().optional(),
    otherCriteria: z.array(z.string()).optional()
  }),
  
  dischargeCriteria: z.object({
    muacThreshold: z.number().optional(),
    whzThreshold: z.number().optional(),
    minimumStay: z.number().int().optional(),
    otherCriteria: z.array(z.string()).optional()
  }),
  
  supplies: z.array(z.object({
    itemName: z.string(),
    quantity: z.number(),
    unit: z.string(),
    distributionFrequency: z.string()
  })),
  
  outcomes: z.object({
    cured: z.number().int().min(0),
    died: z.number().int().min(0),
    defaulted: z.number().int().min(0),
    nonResponse: z.number().int().min(0),
    transferred: z.number().int().min(0)
  }).optional(),
  
  isActive: z.boolean()
})

export const nutritionSupplySchema = z.object({
  itemName: z.string(),
  category: z.enum(['RUTF', 'RUSF', 'CSB', 'OIL', 'MICRONUTRIENTS', 'OTHER']),
  quantity: z.number().positive(),
  unit: z.string(),
  batchNumber: z.string(),
  expiryDate: dateStringSchema,
  receivedDate: dateStringSchema,
  distributedQuantity: z.number().min(0).default(0),
  remainingQuantity: z.number().min(0),
  storageLocation: z.string()
})

export type NutritionAssessment = z.infer<typeof nutritionAssessmentSchema>
export type FeedingProgram = z.infer<typeof feedingProgramSchema>
export type NutritionSupply = z.infer<typeof nutritionSupplySchema>
export type MalnutritionStatus = z.infer<typeof malnutritionStatusEnum>