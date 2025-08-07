import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/assessments/[id] - Get assessment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
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
      }
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: assessment
    })
  } catch (error) {
    console.error('Error fetching assessment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment' },
      { status: 500 }
    )
  }
}

// PUT /api/assessments/[id] - Update assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if assessment exists and user has access
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })

    if (!existingAssessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
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
    } = body

    // Update the assessment
    const assessment = await prisma.assessment.update({
      where: { id: params.id },
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
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_ASSESSMENT',
        entity: 'Assessment',
        entityId: assessment.id,
        metadata: {
          title,
          type,
          location
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: assessment
    })
  } catch (error) {
    console.error('Error updating assessment:', error)
    return NextResponse.json(
      { error: 'Failed to update assessment' },
      { status: 500 }
    )
  }
}

// DELETE /api/assessments/[id] - Delete assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if assessment exists and user has access
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Delete the assessment
    await prisma.assessment.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_ASSESSMENT',
        entity: 'Assessment',
        entityId: params.id,
        metadata: {
          title: assessment.title,
          type: assessment.type,
          location: assessment.location
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting assessment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assessment' },
      { status: 500 }
    )
  }
}