import { z } from 'zod'
import { dateStringSchema } from './common.schema'

export const waterSourceTypeEnum = z.enum([
  'BOREHOLE',
  'WELL',
  'SPRING',
  'RIVER',
  'LAKE',
  'RAINWATER',
  'PIPED_WATER',
  'WATER_TRUCKING',
  'BOTTLED_WATER'
])

export const waterQualityEnum = z.enum(['SAFE', 'TREATED', 'CONTAMINATED', 'UNKNOWN'])

export const sanitationTypeEnum = z.enum([
  'FLUSH_TOILET',
  'PIT_LATRINE',
  'VIP_LATRINE',
  'COMPOSTING_TOILET',
  'OPEN_DEFECATION',
  'SHARED_FACILITY',
  'NONE'
])

export const washAssessmentSchema = z.object({
  assessmentDate: dateStringSchema,
  location: z.string(),
  siteId: z.string().optional(),
  populationSize: z.number().int().positive(),
  
  // Water Access
  waterAccess: z.object({
    primarySource: waterSourceTypeEnum,
    secondarySource: waterSourceTypeEnum.optional(),
    distanceToSource: z.number(), // in meters
    queueTime: z.number(), // in minutes
    waterAvailability: z.enum(['ALWAYS', 'SOMETIMES', 'RARELY']),
    litersPerPersonPerDay: z.number(),
    
    // Water Quality
    waterQuality: waterQualityEnum,
    treatmentMethod: z.enum(['CHLORINATION', 'BOILING', 'FILTRATION', 'NONE']).optional(),
    lastQualityTest: dateStringSchema.optional(),
    testResults: z.object({
      turbidity: z.number().optional(),
      ph: z.number().optional(),
      chlorineResidual: z.number().optional(),
      coliformCount: z.number().optional()
    }).optional(),
    
    // Water Infrastructure
    functionalWaterPoints: z.number().int().min(0),
    nonFunctionalWaterPoints: z.number().int().min(0),
    waterStorageCapacity: z.number(), // in liters
    
    // Issues
    waterIssues: z.array(z.enum([
      'INSUFFICIENT_QUANTITY',
      'POOR_QUALITY',
      'LONG_DISTANCE',
      'LONG_QUEUE',
      'HIGH_COST',
      'SEASONAL_SHORTAGE',
      'BROKEN_INFRASTRUCTURE'
    ])).default([])
  }),
  
  // Sanitation
  sanitation: z.object({
    primaryType: sanitationTypeEnum,
    numberOfToilets: z.number().int().min(0),
    functionalToilets: z.number().int().min(0),
    peoplePerToilet: z.number(),
    separateForWomen: z.boolean(),
    accessibleForDisabled: z.boolean(),
    lighting: z.boolean(),
    locks: z.boolean(),
    handwashingFacility: z.boolean(),
    
    // Waste Management
    solidWasteDisposal: z.enum(['COLLECTION_SERVICE', 'BURNING', 'BURYING', 'OPEN_DUMPING', 'NONE']),
    drainageSystem: z.enum(['GOOD', 'ADEQUATE', 'POOR', 'NONE']),
    
    // Issues
    sanitationIssues: z.array(z.enum([
      'INSUFFICIENT_TOILETS',
      'POOR_MAINTENANCE',
      'NO_PRIVACY',
      'NOT_SAFE',
      'TOO_FAR',
      'FULL_LATRINES',
      'NO_HANDWASHING'
    ])).default([])
  }),
  
  // Hygiene
  hygiene: z.object({
    soapAvailability: z.enum(['ALWAYS', 'SOMETIMES', 'RARELY', 'NEVER']),
    hygieneKitsDistributed: z.boolean(),
    lastDistributionDate: dateStringSchema.optional(),
    
    // Hygiene Practices
    handwashingPractice: z.enum(['GOOD', 'FAIR', 'POOR']),
    hygienePromotion: z.boolean(),
    promotionTopics: z.array(z.string()).optional(),
    
    // Women's Hygiene
    menstrualHygieneSupport: z.boolean(),
    privatWashingSpaces: z.boolean()
  }),
  
  // Health Risks
  healthRisks: z.object({
    recentDiseaseOutbreak: z.boolean(),
    diseaseTypes: z.array(z.string()).optional(),
    vectorBreedingSites: z.boolean(),
    environmentalHazards: z.array(z.string()).optional()
  }),
  
  // Priority Needs
  priorityNeeds: z.array(z.object({
    category: z.enum(['WATER', 'SANITATION', 'HYGIENE']),
    need: z.string(),
    quantity: z.number().optional(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  
  // Recommendations
  recommendations: z.array(z.string()),
  
  notes: z.string().optional(),
  assessedBy: z.string()
})

export const waterQualityTestSchema = z.object({
  testDate: dateStringSchema,
  location: z.string(),
  waterSourceId: z.string(),
  sourceType: waterSourceTypeEnum,
  
  // Physical Parameters
  temperature: z.number().optional(),
  turbidity: z.number(),
  color: z.string().optional(),
  odor: z.string().optional(),
  taste: z.string().optional(),
  
  // Chemical Parameters
  ph: z.number(),
  dissolvedOxygen: z.number().optional(),
  chlorineResidual: z.number().optional(),
  nitrates: z.number().optional(),
  fluoride: z.number().optional(),
  arsenic: z.number().optional(),
  
  // Biological Parameters
  totalColiform: z.number(),
  fecalColiform: z.number(),
  eColi: z.number(),
  
  // Results
  overallQuality: waterQualityEnum,
  potable: z.boolean(),
  treatmentRequired: z.boolean(),
  recommendedTreatment: z.array(z.string()).optional(),
  
  // Follow-up
  retestRequired: z.boolean(),
  retestDate: dateStringSchema.optional(),
  
  testedBy: z.string(),
  labName: z.string().optional()
})

export const hygienePromotionSchema = z.object({
  sessionDate: dateStringSchema,
  location: z.string(),
  sessionType: z.enum(['COMMUNITY', 'SCHOOL', 'HEALTH_FACILITY', 'HOUSEHOLD']),
  
  // Participants
  participants: z.object({
    total: z.number().int().min(0),
    male: z.number().int().min(0),
    female: z.number().int().min(0),
    children: z.number().int().min(0)
  }),
  
  // Topics Covered
  topics: z.array(z.enum([
    'HANDWASHING',
    'WATER_TREATMENT',
    'SAFE_WATER_STORAGE',
    'PERSONAL_HYGIENE',
    'FOOD_HYGIENE',
    'ENVIRONMENTAL_HYGIENE',
    'MENSTRUAL_HYGIENE',
    'DISEASE_PREVENTION'
  ])),
  
  // Methods Used
  methods: z.array(z.enum([
    'DEMONSTRATION',
    'DISCUSSION',
    'DRAMA',
    'SONGS',
    'POSTERS',
    'HOUSE_VISITS'
  ])),
  
  // Materials Distributed
  materials: z.array(z.object({
    type: z.string(),
    quantity: z.number()
  })).optional(),
  
  // Outcomes
  keyMessages: z.array(z.string()),
  commitmentsMade: z.array(z.string()).optional(),
  followUpRequired: z.boolean(),
  
  facilitator: z.string()
})

export type WashAssessment = z.infer<typeof washAssessmentSchema>
export type WaterQualityTest = z.infer<typeof waterQualityTestSchema>
export type HygienePromotion = z.infer<typeof hygienePromotionSchema>
export type WaterSourceType = z.infer<typeof waterSourceTypeEnum>
export type SanitationType = z.infer<typeof sanitationTypeEnum>