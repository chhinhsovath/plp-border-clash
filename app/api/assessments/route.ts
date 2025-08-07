import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createAssessmentSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['RAPID', 'DETAILED', 'SECTORAL', 'MULTI_SECTORAL', 'MONITORING']),
  location: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  startDate: z.string(),
  endDate: z.string(),
  leadAgency: z.string(),
  participatingOrganizations: z.array(z.string()).optional(),
  
  totalPopulation: z.number().optional(),
  affectedPopulation: z.number(),
  displacedHouseholds: z.number().optional(),
  hostHouseholds: z.number().optional(),
  averageHouseholdSize: z.number().optional(),
  
  demographics: z.object({
    children0to5: z.number().optional(),
    children6to17: z.number().optional(),
    adults18to59: z.number().optional(),
    elderly60plus: z.number().optional(),
    malePercentage: z.number().optional(),
    femalePercentage: z.number().optional(),
    pregnantWomen: z.number().optional(),
    lactatingWomen: z.number().optional(),
    peopleWithDisabilities: z.number().optional(),
    unaccompaniedMinors: z.number().optional(),
  }).optional(),
  
  sectors: z.any().optional(),
  keyFindings: z.string().optional(),
  immediateNeeds: z.array(z.string()).optional(),
  recommendations: z.string().optional(),
  methodology: z.any().optional(),
  teamMembers: z.array(z.object({
    name: z.string(),
    organization: z.string(),
    role: z.string()
  })).optional()
})

// GET /api/assessments - Get all assessments
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        organizationId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        report: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: assessments
    })
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  }
}

// POST /api/assessments - Create new assessment
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const {
      title,
      type,
      location,
      coordinates,
      startDate,
      endDate,
      leadAgency,
      participatingOrganizations,
      totalPopulation,
      affectedPopulation,
      displacedHouseholds,
      hostHouseholds,
      averageHouseholdSize,
      demographics,
      sectors,
      keyFindings,
      immediateNeeds,
      recommendations,
      methodology,
      teamMembers
    } = validation.data

    // Create the assessment
    const assessment = await prisma.assessment.create({
      data: {
        title,
        type: type as any,
        location,
        coordinates,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        affectedPeople: affectedPopulation,
        households: displacedHouseholds,
        data: {
          leadAgency,
          participatingOrganizations,
          totalPopulation,
          affectedPopulation,
          displacedHouseholds,
          hostHouseholds,
          averageHouseholdSize,
          demographics,
          sectors,
          keyFindings,
          immediateNeeds,
          recommendations,
          methodology,
          teamMembers
        },
        organizationId,
        createdById: userId,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_ASSESSMENT',
        entity: 'Assessment',
        entityId: assessment.id,
        metadata: {
          title,
          type,
          location
        }
      }
    })

    // Send notification to organization members
    const orgMembers = await prisma.user.findMany({
      where: {
        organizationId,
        id: { not: userId }
      },
      select: { id: true }
    })

    if (orgMembers.length > 0) {
      await prisma.notification.createMany({
        data: orgMembers.map(member => ({
          userId: member.id,
          type: 'SYSTEM',
          title: 'New Assessment Created',
          message: `A new ${type.toLowerCase()} assessment "${title}" has been created for ${location}.`,
          data: {
            assessmentId: assessment.id,
            createdBy: userId
          }
        }))
      })
    }

    return NextResponse.json({
      success: true,
      data: assessment
    })
  } catch (error) {
    console.error('Error creating assessment:', error)
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    )
  }
}