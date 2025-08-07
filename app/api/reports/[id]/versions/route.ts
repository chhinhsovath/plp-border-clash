import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// GET /api/reports/[id]/versions - Get version history
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

    // Verify report access
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Get version history
    const versions = await prisma.reportVersion.findMany({
      where: {
        reportId: params.id,
      },
      orderBy: {
        version: 'desc',
      },
      take: 50, // Limit to last 50 versions
    })

    // Get user details for each version
    const userIds = [...new Set(versions.map(v => v.createdBy))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const versionsWithUsers = versions.map(version => ({
      ...version,
      createdByUser: userMap.get(version.createdBy),
    }))

    return NextResponse.json({
      success: true,
      data: versionsWithUsers,
    })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

// POST /api/reports/[id]/versions - Create a new version
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

    const body = await request.json()
    const { message, autoSave = false } = body

    // Get current report with all sections
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        sections: {
          orderBy: { order: 'asc' }
        },
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Get the latest version number
    const latestVersion = await prisma.reportVersion.findFirst({
      where: { reportId: params.id },
      orderBy: { version: 'desc' },
      select: { version: true, data: true }
    })

    const nextVersion = (latestVersion?.version || 0) + 1

    // Create snapshot of current state
    const snapshot = {
      title: report.title,
      description: report.description,
      status: report.status,
      metadata: report.metadata,
      settings: report.settings,
      sections: report.sections.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        content: s.content,
        order: s.order,
        isVisible: s.isVisible,
        metadata: s.metadata,
      })),
    }

    // Calculate changes diff if there's a previous version
    let changes = null
    if (latestVersion?.data) {
      changes = calculateDiff(latestVersion.data, snapshot)
    }

    // Create new version
    const newVersion = await prisma.reportVersion.create({
      data: {
        reportId: params.id,
        version: nextVersion,
        data: snapshot,
        changes,
        createdBy: userId,
        metadata: {
          message,
          autoSave,
        }
      }
    })

    // Update report version number
    await prisma.report.update({
      where: { id: params.id },
      data: { version: nextVersion }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: autoSave ? 'AUTO_SAVE_VERSION' : 'CREATE_VERSION',
        entity: 'ReportVersion',
        entityId: newVersion.id,
        metadata: { 
          reportId: params.id,
          version: nextVersion,
          message 
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: newVersion,
    })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    )
  }
}

function calculateDiff(oldData: any, newData: any): any {
  const diff: any = {
    added: [],
    modified: [],
    removed: [],
  }

  // Compare sections
  const oldSections = new Map((oldData.sections || []).map((s: any) => [s.id, s]))
  const newSections = new Map((newData.sections || []).map((s: any) => [s.id, s]))

  // Find added and modified sections
  newSections.forEach((newSection, id) => {
    const oldSection = oldSections.get(id)
    if (!oldSection) {
      diff.added.push({
        type: 'section',
        id,
        title: newSection.title,
      })
    } else if (JSON.stringify(oldSection) !== JSON.stringify(newSection)) {
      diff.modified.push({
        type: 'section',
        id,
        title: newSection.title,
        changes: getFieldChanges(oldSection, newSection),
      })
    }
  })

  // Find removed sections
  oldSections.forEach((oldSection, id) => {
    if (!newSections.has(id)) {
      diff.removed.push({
        type: 'section',
        id,
        title: oldSection.title,
      })
    }
  })

  // Compare report metadata
  const metadataFields = ['title', 'description', 'status']
  metadataFields.forEach(field => {
    if (oldData[field] !== newData[field]) {
      diff.modified.push({
        type: 'metadata',
        field,
        oldValue: oldData[field],
        newValue: newData[field],
      })
    }
  })

  return diff
}

function getFieldChanges(oldObj: any, newObj: any): any[] {
  const changes = []
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
  
  allKeys.forEach(key => {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        newValue: newObj[key],
      })
    }
  })
  
  return changes
}