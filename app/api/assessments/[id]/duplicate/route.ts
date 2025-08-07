import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// POST /api/assessments/[id]/duplicate - Duplicate an assessment
export async function POST(
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

    // Get the original assessment
    const originalAssessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })

    if (!originalAssessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Create a duplicate with modified title
    const duplicateTitle = `${originalAssessment.title} (Copy)`
    
    const duplicatedAssessment = await prisma.assessment.create({
      data: {
        title: duplicateTitle,
        type: originalAssessment.type,
        location: originalAssessment.location,
        coordinates: originalAssessment.coordinates,
        startDate: originalAssessment.startDate,
        endDate: originalAssessment.endDate,
        affectedPeople: originalAssessment.affectedPeople,
        households: originalAssessment.households,
        data: originalAssessment.data,
        organizationId,
        createdById: userId,
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
        action: 'DUPLICATE_ASSESSMENT',
        entity: 'Assessment',
        entityId: duplicatedAssessment.id,
        metadata: {
          originalId: originalAssessment.id,
          originalTitle: originalAssessment.title,
          newTitle: duplicateTitle
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
          type: 'SYSTEM' as any,
          title: 'Assessment Duplicated',
          message: `A copy of the assessment "${originalAssessment.title}" has been created.`,
          data: {
            assessmentId: duplicatedAssessment.id,
            originalId: originalAssessment.id,
            createdBy: userId
          }
        }))
      })
    }

    return NextResponse.json({
      success: true,
      data: duplicatedAssessment,
      message: 'Assessment duplicated successfully'
    })
  } catch (error) {
    console.error('Error duplicating assessment:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate assessment' },
      { status: 500 }
    )
  }
}