import { z } from 'zod'
import { dateStringSchema } from './common.schema'

export const distributionTypeEnum = z.enum([
  'FOOD',
  'NFI', // Non-Food Items
  'CASH',
  'VOUCHER',
  'MIXED'
])

export const distributionStatusEnum = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'POSTPONED'
])

export const createDistributionSchema = z.object({
  distributionType: distributionTypeEnum,
  distributionDate: dateStringSchema,
  location: z.string().min(1, 'Location is required'),
  siteId: z.string().optional(),
  
  // Planning Information
  plannedBeneficiaries: z.number().int().positive(),
  plannedHouseholds: z.number().int().positive(),
  
  // Items/Assistance
  items: z.array(z.object({
    category: z.string(),
    itemName: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    quantityPerHousehold: z.number().positive(),
    specifications: z.string().optional()
  })).min(1, 'At least one item is required'),
  
  // Cash/Voucher specific
  cashAmount: z.number().positive().optional(),
  voucherValue: z.number().positive().optional(),
  currency: z.string().default('USD'),
  
  // Targeting Criteria
  targetingCriteria: z.array(z.string()).default([]),
  vulnerabilityPriority: z.boolean().default(false),
  
  // Implementation
  implementingPartner: z.string(),
  distributionPoint: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  
  // Verification
  verificationMethod: z.enum(['ID_CARD', 'REGISTRATION_CARD', 'BIOMETRIC', 'VOUCHER', 'LIST']),
  verificationDocuments: z.array(z.string()).optional(),
  
  // Team
  teamLeader: z.string(),
  teamMembers: z.array(z.string()).default([]),
  
  status: distributionStatusEnum.default('PLANNED'),
  notes: z.string().optional()
})

export const updateDistributionSchema = createDistributionSchema.partial().extend({
  // Actual Distribution Data
  actualBeneficiaries: z.number().int().min(0).optional(),
  actualHouseholds: z.number().int().min(0).optional(),
  
  // Distribution Records
  beneficiaryRecords: z.array(z.object({
    householdId: z.string(),
    householdHead: z.string(),
    householdSize: z.number().int().positive(),
    itemsReceived: z.array(z.object({
      itemName: z.string(),
      quantity: z.number()
    })),
    cashReceived: z.number().optional(),
    voucherNumbers: z.array(z.string()).optional(),
    collectedBy: z.string(),
    collectionTime: z.string(),
    signature: z.boolean().default(false),
    thumbprint: z.boolean().default(false),
    photo: z.string().url().optional()
  })).optional(),
  
  // Issues and Challenges
  challenges: z.array(z.string()).optional(),
  unservedHouseholds: z.number().int().min(0).optional(),
  unservedReason: z.string().optional(),
  
  // Stock Management
  stockReceived: z.array(z.object({
    itemName: z.string(),
    quantity: z.number(),
    batchNumber: z.string().optional(),
    expiryDate: dateStringSchema.optional()
  })).optional(),
  stockDistributed: z.array(z.object({
    itemName: z.string(),
    quantity: z.number()
  })).optional(),
  stockRemaining: z.array(z.object({
    itemName: z.string(),
    quantity: z.number()
  })).optional(),
  stockDamaged: z.array(z.object({
    itemName: z.string(),
    quantity: z.number(),
    reason: z.string()
  })).optional()
})

export const distributionSchema = z.object({
  id: z.string(),
  distributionCode: z.string(),
  ...createDistributionSchema.shape,
  ...updateDistributionSchema.partial().shape,
  
  // Monitoring and Evaluation
  postDistributionMonitoring: z.object({
    conducted: z.boolean(),
    date: dateStringSchema.optional(),
    methodology: z.string().optional(),
    sampleSize: z.number().int().positive().optional(),
    findings: z.object({
      satisfactionRate: z.number().min(0).max(100).optional(),
      utilizationRate: z.number().min(0).max(100).optional(),
      issues: z.array(z.string()).optional(),
      recommendations: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  
  // Reporting
  reportSubmitted: z.boolean().default(false),
  reportDate: dateStringSchema.optional(),
  photos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional(),
    type: z.enum(['BEFORE', 'DURING', 'AFTER'])
  })).optional(),
  
  // Donor Information
  donor: z.string().optional(),
  projectCode: z.string().optional(),
  budget: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  
  createdAt: z.date().or(dateStringSchema),
  updatedAt: z.date().or(dateStringSchema),
  createdBy: z.string(),
  updatedBy: z.string().optional()
})

export const foodDistributionSchema = createDistributionSchema.extend({
  distributionType: z.literal('FOOD'),
  
  // Food Specific
  foodBasket: z.object({
    cereals: z.number().optional(), // kg
    pulses: z.number().optional(), // kg
    oil: z.number().optional(), // liters
    salt: z.number().optional(), // kg
    sugar: z.number().optional(), // kg
    otherItems: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string()
    })).optional()
  }),
  
  kcalPerPersonPerDay: z.number().optional(),
  rationDuration: z.number().int().positive(), // days
  
  // Nutrition Considerations
  specialNutritionItems: z.array(z.object({
    itemName: z.string(),
    targetGroup: z.enum(['CHILDREN_U5', 'PLW', 'ELDERLY', 'ALL']), // PLW: Pregnant and Lactating Women
    quantity: z.number(),
    unit: z.string()
  })).optional()
})

export const distributionQuerySchema = z.object({
  type: distributionTypeEnum.optional(),
  status: distributionStatusEnum.optional(),
  location: z.string().optional(),
  siteId: z.string().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  implementingPartner: z.string().optional(),
  donor: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['distributionDate', 'createdAt', 'location', 'type']).default('distributionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type Distribution = z.infer<typeof distributionSchema>
export type CreateDistributionInput = z.infer<typeof createDistributionSchema>
export type UpdateDistributionInput = z.infer<typeof updateDistributionSchema>
export type FoodDistribution = z.infer<typeof foodDistributionSchema>
export type DistributionQuery = z.infer<typeof distributionQuerySchema>
export type DistributionType = z.infer<typeof distributionTypeEnum>
export type DistributionStatus = z.infer<typeof distributionStatusEnum>