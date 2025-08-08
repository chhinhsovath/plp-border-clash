import { z } from 'zod'
import { dateStringSchema, genderEnum } from './common.schema'

export const educationLevelEnum = z.enum([
  'PRE_PRIMARY',
  'PRIMARY',
  'LOWER_SECONDARY',
  'UPPER_SECONDARY',
  'TERTIARY',
  'VOCATIONAL',
  'ADULT_EDUCATION',
  'NONE'
])

export const schoolTypeEnum = z.enum([
  'FORMAL',
  'NON_FORMAL',
  'TEMPORARY_LEARNING_SPACE',
  'ACCELERATED_LEARNING',
  'VOCATIONAL_TRAINING',
  'COMMUNITY_BASED'
])

export const educationEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  individualId: z.string().min(1, 'Individual ID is required'),
  
  // Student Information
  studentName: z.string().min(1, 'Student name is required'),
  dateOfBirth: dateStringSchema,
  age: z.number().int().min(3).max(25),
  gender: genderEnum,
  
  // School Information
  schoolName: z.string().min(1, 'School name is required'),
  schoolType: schoolTypeEnum,
  educationLevel: educationLevelEnum,
  grade: z.string(),
  academicYear: z.string(),
  
  // Enrollment Details
  enrollmentDate: dateStringSchema,
  enrollmentStatus: z.enum(['ENROLLED', 'DROPPED_OUT', 'GRADUATED', 'TRANSFERRED']),
  dropoutDate: dateStringSchema.optional(),
  dropoutReason: z.string().optional(),
  
  // Academic Performance
  attendance: z.object({
    daysPresent: z.number().int().min(0),
    totalDays: z.number().int().min(0),
    attendanceRate: z.number().min(0).max(100)
  }).optional(),
  
  academicPerformance: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR']).optional(),
  
  // Support Received
  supportReceived: z.array(z.enum([
    'SCHOOL_SUPPLIES',
    'UNIFORMS',
    'SCHOOL_FEEDING',
    'TRANSPORTATION',
    'SCHOLARSHIP',
    'PSYCHOSOCIAL_SUPPORT'
  ])).default([]),
  
  // Special Needs
  hasSpecialNeeds: z.boolean().default(false),
  specialNeedsDetails: z.string().optional(),
  accommodationsProvided: z.array(z.string()).optional(),
  
  // Parent/Guardian Information
  guardianName: z.string(),
  guardianRelationship: z.string(),
  guardianContact: z.string().optional(),
  
  // Additional Information
  previousSchool: z.string().optional(),
  languageOfInstruction: z.string(),
  distanceToSchool: z.number().optional(), // in kilometers
  transportationMethod: z.enum(['WALKING', 'BICYCLE', 'PUBLIC_TRANSPORT', 'SCHOOL_BUS', 'OTHER']).optional(),
  
  notes: z.string().optional(),
  registeredBy: z.string()
})

export const schoolAssessmentSchema = z.object({
  schoolName: z.string(),
  schoolType: schoolTypeEnum,
  location: z.string(),
  assessmentDate: dateStringSchema,
  
  // Infrastructure
  infrastructure: z.object({
    classrooms: z.number().int().min(0),
    functionalClassrooms: z.number().int().min(0),
    toilets: z.object({
      total: z.number().int().min(0),
      functional: z.number().int().min(0),
      separateForGirls: z.boolean()
    }),
    waterAccess: z.boolean(),
    electricity: z.boolean(),
    playground: z.boolean(),
    fence: z.boolean(),
    library: z.boolean(),
    computerLab: z.boolean()
  }),
  
  // Students
  studentEnrollment: z.object({
    total: z.number().int().min(0),
    boys: z.number().int().min(0),
    girls: z.number().int().min(0),
    withDisabilities: z.number().int().min(0),
    refugees: z.number().int().min(0),
    idps: z.number().int().min(0)
  }),
  
  // Teachers
  teachers: z.object({
    total: z.number().int().min(0),
    qualified: z.number().int().min(0),
    male: z.number().int().min(0),
    female: z.number().int().min(0)
  }),
  
  // Teaching Materials
  teachingMaterials: z.object({
    textbooksAvailable: z.boolean(),
    textbookRatio: z.number().optional(), // students per textbook
    teachingAidsAvailable: z.boolean(),
    stationeryAvailable: z.boolean()
  }),
  
  // Programs
  programsOffered: z.array(z.string()),
  schoolFeedingProgram: z.boolean(),
  psychosocialSupport: z.boolean(),
  
  // Challenges
  challenges: z.array(z.string()),
  
  // Needs
  priorityNeeds: z.array(z.object({
    need: z.string(),
    quantity: z.number().optional(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  
  recommendations: z.array(z.string()).optional(),
  assessedBy: z.string()
})

export const teacherTrainingSchema = z.object({
  trainingTitle: z.string(),
  trainingType: z.enum(['IN_SERVICE', 'PRE_SERVICE', 'REFRESHER', 'SPECIALIZED']),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  duration: z.string(),
  location: z.string(),
  
  participants: z.object({
    total: z.number().int().min(0),
    male: z.number().int().min(0),
    female: z.number().int().min(0),
    completed: z.number().int().min(0)
  }),
  
  topics: z.array(z.string()),
  trainers: z.array(z.string()),
  
  outcomes: z.object({
    skillsAcquired: z.array(z.string()),
    certificatesIssued: z.number().int().min(0),
    followUpPlanned: z.boolean()
  }),
  
  feedback: z.string().optional()
})

export type EducationEnrollment = z.infer<typeof educationEnrollmentSchema>
export type SchoolAssessment = z.infer<typeof schoolAssessmentSchema>
export type TeacherTraining = z.infer<typeof teacherTrainingSchema>
export type EducationLevel = z.infer<typeof educationLevelEnum>
export type SchoolType = z.infer<typeof schoolTypeEnum>