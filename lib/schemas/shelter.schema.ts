import { z } from 'zod'
import { dateStringSchema } from './common.schema'

export const shelterTypeEnum = z.enum([
  'EMERGENCY_TENT',
  'FAMILY_TENT',
  'TRANSITIONAL_SHELTER',
  'COLLECTIVE_CENTER',
  'HOST_FAMILY',
  'RENTED_ACCOMMODATION',
  'MAKESHIFT',
  'PERMANENT_STRUCTURE',
  'DAMAGED_BUILDING'
])

export const shelterConditionEnum = z.enum([
  'GOOD',
  'FAIR',
  'POOR',
  'CRITICAL',
  'UNINHABITABLE'
])

export const shelterAssessmentSchema = z.object({
  assessmentDate: dateStringSchema,
  siteId: z.string(),
  
  // Household Information
  householdId: z.string(),
  householdSize: z.number().int().positive(),
  
  // Shelter Details
  shelterType: shelterTypeEnum,
  shelterNumber: z.string().optional(),
  shelterCondition: shelterConditionEnum,
  
  // Physical Characteristics
  floorArea: z.number().positive(), // in square meters
  numberOfRooms: z.number().int().min(0),
  
  // Shelter Components Assessment
  components: z.object({
    roof: z.object({
      condition: shelterConditionEnum,
      material: z.string(),
      leaking: z.boolean()
    }),
    walls: z.object({
      condition: shelterConditionEnum,
      material: z.string(),
      damaged: z.boolean()
    }),
    floor: z.object({
      condition: shelterConditionEnum,
      material: z.string()
    }),
    doors: z.object({
      present: z.boolean(),
      lockable: z.boolean(),
      condition: shelterConditionEnum.optional()
    }),
    windows: z.object({
      present: z.boolean(),
      condition: shelterConditionEnum.optional()
    })
  }),
  
  // Living Conditions
  ventilation: z.enum(['GOOD', 'ADEQUATE', 'POOR']),
  lighting: z.enum(['GOOD', 'ADEQUATE', 'POOR']),
  privacy: z.enum(['GOOD', 'ADEQUATE', 'POOR']),
  weatherProtection: z.enum(['GOOD', 'ADEQUATE', 'POOR']),
  
  // Utilities
  electricityAccess: z.boolean(),
  waterAccess: z.boolean(),
  sanitationAccess: z.boolean(),
  cookingFacility: z.enum(['INSIDE', 'OUTSIDE', 'SHARED', 'NONE']),
  
  // Hazards and Risks
  hazards: z.array(z.enum([
    'FLOODING',
    'FIRE_RISK',
    'STRUCTURAL_DAMAGE',
    'OVERCROWDING',
    'POOR_VENTILATION',
    'NO_EMERGENCY_EXIT',
    'ENVIRONMENTAL_HAZARD'
  ])).default([]),
  
  // NFI (Non-Food Items) Needs
  nfiNeeds: z.array(z.enum([
    'BLANKETS',
    'MATTRESSES',
    'KITCHEN_SET',
    'JERRY_CANS',
    'SOLAR_LAMP',
    'MOSQUITO_NET',
    'PLASTIC_SHEETING',
    'ROPE',
    'TOOLS'
  ])).default([]),
  
  // Assistance Received
  assistanceReceived: z.array(z.object({
    type: z.string(),
    date: dateStringSchema,
    provider: z.string()
  })).optional(),
  
  // Priority Needs
  priorityNeeds: z.array(z.object({
    need: z.string(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  
  // Recommendations
  recommendations: z.array(z.string()).optional(),
  
  // Photos
  photos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional()
  })).optional(),
  
  notes: z.string().optional(),
  assessedBy: z.string()
})

export const shelterDistributionSchema = z.object({
  distributionDate: dateStringSchema,
  location: z.string(),
  
  // Items Distributed
  items: z.array(z.object({
    itemType: z.string(),
    quantity: z.number().int().positive(),
    unit: z.string(),
    specifications: z.string().optional()
  })),
  
  // Beneficiaries
  beneficiaries: z.array(z.object({
    householdId: z.string(),
    householdSize: z.number().int().positive(),
    itemsReceived: z.array(z.object({
      itemType: z.string(),
      quantity: z.number()
    })),
    signature: z.boolean().default(false)
  })),
  
  totalHouseholds: z.number().int().positive(),
  totalIndividuals: z.number().int().positive(),
  
  // Distribution Details
  distributionMethod: z.enum(['DIRECT', 'VOUCHER', 'CASH', 'CONTRACTOR']),
  verificationMethod: z.string(),
  
  // Implementing Partners
  implementingPartner: z.string(),
  donor: z.string().optional(),
  
  // Monitoring
  postDistributionMonitoring: z.boolean().default(false),
  monitoringDate: dateStringSchema.optional(),
  satisfactionLevel: z.enum(['VERY_SATISFIED', 'SATISFIED', 'NEUTRAL', 'DISSATISFIED', 'VERY_DISSATISFIED']).optional(),
  
  challenges: z.array(z.string()).optional(),
  notes: z.string().optional()
})

export type ShelterAssessment = z.infer<typeof shelterAssessmentSchema>
export type ShelterDistribution = z.infer<typeof shelterDistributionSchema>
export type ShelterType = z.infer<typeof shelterTypeEnum>
export type ShelterCondition = z.infer<typeof shelterConditionEnum>