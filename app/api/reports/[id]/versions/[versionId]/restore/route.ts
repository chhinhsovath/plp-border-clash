import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// POST /api/reports/[id]/versions/[versionId]/restore - Restore a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    const userRole = request.headers.get('x-user-role')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins and editors can restore versions
    if (userRole === 'VIEWER') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Get the version to restore
    const version = await prisma.reportVersion.findUnique({
      where: { id: params.versionId }
    })

    if (!version || version.reportId !== params.id) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Verify report belongs to organization
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        sections: true,
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Create a backup of current state before restoring
    const currentSnapshot = {
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

    // Get next version number
    const latestVersion = await prisma.reportVersion.findFirst({
      where: { reportId: params.id },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const nextVersion = (latestVersion?.version || 0) + 1

    // Create backup version
    await prisma.reportVersion.create({
      data: {
        reportId: params.id,
        version: nextVersion,
        data: currentSnapshot,
        changes: {
          type: 'backup_before_restore',
          restoredFrom: version.version,
        },
        createdBy: userId,
        metadata: {
          message: `Backup before restoring version ${version.version}`,
          autoSave: false,
        }
      }
    })

    // Restore the version data
    const versionData = version.data as any

    // Update report metadata
    await prisma.report.update({
      where: { id: params.id },
      data: {
        title: versionData.title,
        description: versionData.description,
        status: versionData.status,
        metadata: versionData.metadata,
        settings: versionData.settings,
        version: nextVersion + 1,
      }
    })

    // Delete existing sections
    await prisma.section.deleteMany({
      where: { reportId: params.id }
    })

    // Recreate sections from version
    if (versionData.sections && versionData.sections.length > 0) {
      await prisma.section.createMany({
        data: versionData.sections.map((s: any) => ({
          id: s.id,
          reportId: params.id,
          title: s.title,
          type: s.type,
          content: s.content,
          order: s.order,
          isVisible: s.isVisible,
          metadata: s.metadata,
        }))
      })
    }

    // Create restore version record
    const restoreVersion = await prisma.reportVersion.create({
      data: {
        reportId: params.id,
        version: nextVersion + 1,
        data: versionData,
        changes: {
          type: 'restored',
          restoredFrom: version.version,
        },
        createdBy: userId,
        metadata: {
          message: `Restored from version ${version.version}`,
          autoSave: false,
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESTORE_VERSION',
        entity: 'Report',
        entityId: params.id,
        metadata: {
          versionId: params.versionId,
          restoredVersion: version.version,
          newVersion: nextVersion + 1,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully restored version ${version.version}`,
      data: restoreVersion,
    })
  } catch (error) {
    console.error('Error restoring version:', error)
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    )
  }
}