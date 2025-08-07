import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { diffLines, diffWords } from 'diff'

// GET /api/reports/[id]/versions/compare - Compare two versions
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

    const searchParams = request.nextUrl.searchParams
    const fromVersion = searchParams.get('from')
    const toVersion = searchParams.get('to')

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'Both from and to version parameters are required' },
        { status: 400 }
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

    // Get both versions
    const [versionFrom, versionTo] = await Promise.all([
      prisma.reportVersion.findFirst({
        where: {
          reportId: params.id,
          version: parseInt(fromVersion),
        }
      }),
      prisma.reportVersion.findFirst({
        where: {
          reportId: params.id,
          version: parseInt(toVersion),
        }
      })
    ])

    if (!versionFrom || !versionTo) {
      return NextResponse.json(
        { error: 'One or both versions not found' },
        { status: 404 }
      )
    }

    // Compare the versions
    const comparison = compareVersions(versionFrom.data, versionTo.data)

    return NextResponse.json({
      success: true,
      data: {
        from: {
          version: versionFrom.version,
          createdAt: versionFrom.createdAt,
          createdBy: versionFrom.createdBy,
        },
        to: {
          version: versionTo.version,
          createdAt: versionTo.createdAt,
          createdBy: versionTo.createdBy,
        },
        comparison,
      }
    })
  } catch (error) {
    console.error('Error comparing versions:', error)
    return NextResponse.json(
      { error: 'Failed to compare versions' },
      { status: 500 }
    )
  }
}

function compareVersions(fromData: any, toData: any) {
  const comparison = {
    metadata: {
      changes: [] as any[],
    },
    sections: {
      added: [] as any[],
      removed: [] as any[],
      modified: [] as any[],
      unchanged: [] as any[],
    },
    statistics: {
      totalChanges: 0,
      addedSections: 0,
      removedSections: 0,
      modifiedSections: 0,
    }
  }

  // Compare metadata fields
  const metadataFields = ['title', 'description', 'status']
  metadataFields.forEach(field => {
    if (fromData[field] !== toData[field]) {
      comparison.metadata.changes.push({
        field,
        from: fromData[field],
        to: toData[field],
        diff: diffWords(
          fromData[field]?.toString() || '',
          toData[field]?.toString() || ''
        ).map(part => ({
          value: part.value,
          added: part.added,
          removed: part.removed,
        }))
      })
    }
  })

  // Compare sections
  const fromSections = new Map((fromData.sections || []).map((s: any) => [s.id, s]))
  const toSections = new Map((toData.sections || []).map((s: any) => [s.id, s]))

  // Find added sections
  toSections.forEach((section, id) => {
    if (!fromSections.has(id)) {
      comparison.sections.added.push(section)
      comparison.statistics.addedSections++
    }
  })

  // Find removed sections
  fromSections.forEach((section, id) => {
    if (!toSections.has(id)) {
      comparison.sections.removed.push(section)
      comparison.statistics.removedSections++
    }
  })

  // Find modified and unchanged sections
  fromSections.forEach((fromSection, id) => {
    const toSection = toSections.get(id)
    if (toSection) {
      const changes = compareSections(fromSection, toSection)
      if (changes.length > 0) {
        comparison.sections.modified.push({
          id,
          title: toSection.title,
          changes,
        })
        comparison.statistics.modifiedSections++
      } else {
        comparison.sections.unchanged.push({
          id,
          title: toSection.title,
        })
      }
    }
  })

  comparison.statistics.totalChanges = 
    comparison.statistics.addedSections +
    comparison.statistics.removedSections +
    comparison.statistics.modifiedSections +
    comparison.metadata.changes.length

  return comparison
}

function compareSections(fromSection: any, toSection: any) {
  const changes = []

  // Compare title
  if (fromSection.title !== toSection.title) {
    changes.push({
      field: 'title',
      from: fromSection.title,
      to: toSection.title,
    })
  }

  // Compare visibility
  if (fromSection.isVisible !== toSection.isVisible) {
    changes.push({
      field: 'isVisible',
      from: fromSection.isVisible,
      to: toSection.isVisible,
    })
  }

  // Compare order
  if (fromSection.order !== toSection.order) {
    changes.push({
      field: 'order',
      from: fromSection.order,
      to: toSection.order,
    })
  }

  // Compare content based on type
  if (JSON.stringify(fromSection.content) !== JSON.stringify(toSection.content)) {
    const contentChange: any = {
      field: 'content',
      type: toSection.type,
    }

    switch (toSection.type) {
      case 'TEXT':
      case 'RECOMMENDATIONS':
        if (fromSection.content?.text && toSection.content?.text) {
          contentChange.diff = diffLines(
            fromSection.content.text,
            toSection.content.text
          ).map(part => ({
            value: part.value,
            added: part.added,
            removed: part.removed,
            lineCount: part.count,
          }))
        } else {
          contentChange.from = fromSection.content
          contentChange.to = toSection.content
        }
        break

      case 'STATISTICS':
        contentChange.from = fromSection.content?.statistics || []
        contentChange.to = toSection.content?.statistics || []
        contentChange.changes = compareStatistics(
          fromSection.content?.statistics || [],
          toSection.content?.statistics || []
        )
        break

      case 'CHART':
        contentChange.from = fromSection.content?.chart
        contentChange.to = toSection.content?.chart
        break

      case 'MAP':
        contentChange.from = fromSection.content?.map
        contentChange.to = toSection.content?.map
        contentChange.changes = compareMapLocations(
          fromSection.content?.map?.locations || [],
          toSection.content?.map?.locations || []
        )
        break

      default:
        contentChange.from = fromSection.content
        contentChange.to = toSection.content
    }

    changes.push(contentChange)
  }

  return changes
}

function compareStatistics(fromStats: any[], toStats: any[]) {
  const changes = {
    added: [] as any[],
    removed: [] as any[],
    modified: [] as any[],
  }

  const fromMap = new Map(fromStats.map(s => [s.label, s]))
  const toMap = new Map(toStats.map(s => [s.label, s]))

  // Find added
  toMap.forEach((stat, label) => {
    if (!fromMap.has(label)) {
      changes.added.push(stat)
    }
  })

  // Find removed
  fromMap.forEach((stat, label) => {
    if (!toMap.has(label)) {
      changes.removed.push(stat)
    }
  })

  // Find modified
  fromMap.forEach((fromStat, label) => {
    const toStat = toMap.get(label)
    if (toStat && (fromStat.value !== toStat.value || fromStat.unit !== toStat.unit)) {
      changes.modified.push({
        label,
        from: { value: fromStat.value, unit: fromStat.unit },
        to: { value: toStat.value, unit: toStat.unit },
      })
    }
  })

  return changes
}

function compareMapLocations(fromLocations: any[], toLocations: any[]) {
  const changes = {
    added: [] as any[],
    removed: [] as any[],
    modified: [] as any[],
  }

  const fromMap = new Map(fromLocations.map(l => [l.name, l]))
  const toMap = new Map(toLocations.map(l => [l.name, l]))

  // Find added
  toMap.forEach((location, name) => {
    if (!fromMap.has(name)) {
      changes.added.push(location)
    }
  })

  // Find removed
  fromMap.forEach((location, name) => {
    if (!toMap.has(name)) {
      changes.removed.push(location)
    }
  })

  // Find modified
  fromMap.forEach((fromLoc, name) => {
    const toLoc = toMap.get(name)
    if (toLoc && JSON.stringify(fromLoc) !== JSON.stringify(toLoc)) {
      changes.modified.push({
        name,
        from: fromLoc,
        to: toLoc,
      })
    }
  })

  return changes
}