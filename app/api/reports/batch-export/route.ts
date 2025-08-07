import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import archiver from 'archiver'
import { Readable } from 'stream'

const batchExportSchema = z.object({
  reportIds: z.array(z.string()),
  format: z.enum(['PDF', 'WORD', 'EXCEL', 'HTML', 'ALL']),
})

// POST /api/reports/batch-export - Export multiple reports
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
    const validation = batchExportSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { reportIds, format } = validation.data

    // Verify all reports belong to the organization
    const reports = await prisma.report.findMany({
      where: {
        id: { in: reportIds },
        organizationId,
      },
      include: {
        author: true,
        organization: true,
        sections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' }
        },
      }
    })

    if (reports.length !== reportIds.length) {
      return NextResponse.json(
        { error: 'Some reports were not found or you do not have access' },
        { status: 404 }
      )
    }

    // Create batch export record
    const batchExport = await prisma.reportExport.create({
      data: {
        reportId: reports[0].id, // Use first report as reference
        format,
        status: 'PROCESSING',
        metadata: {
          batchExport: true,
          reportCount: reports.length,
          reportIds,
        }
      }
    })

    try {
      // Create a zip archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      })

      const chunks: Buffer[] = []
      
      archive.on('data', (chunk) => {
        chunks.push(chunk)
      })

      // Process each report based on format
      for (const report of reports) {
        const filePrefix = `${report.slug}_${report.id.slice(-6)}`
        
        if (format === 'ALL' || format === 'HTML') {
          const htmlContent = generateHTMLContent(report)
          archive.append(htmlContent, { name: `${filePrefix}.html` })
        }
        
        if (format === 'ALL' || format === 'PDF') {
          // Note: PDF generation would require puppeteer
          // For now, we'll include a placeholder
          const pdfPlaceholder = `PDF export for: ${report.title}\nThis would contain the full PDF content.`
          archive.append(pdfPlaceholder, { name: `${filePrefix}.pdf.txt` })
        }
        
        if (format === 'ALL' || format === 'WORD') {
          // Note: Word generation would require docx library
          // For now, we'll include a placeholder
          const wordPlaceholder = `Word export for: ${report.title}\nThis would contain the full Word document content.`
          archive.append(wordPlaceholder, { name: `${filePrefix}.docx.txt` })
        }
        
        if (format === 'ALL' || format === 'EXCEL') {
          // Note: Excel generation would require exceljs
          // For now, we'll include a CSV representation
          const csvContent = generateCSVContent(report)
          archive.append(csvContent, { name: `${filePrefix}.csv` })
        }
      }

      // Add manifest file
      const manifest = {
        exportDate: new Date().toISOString(),
        organization: reports[0].organization.name,
        reportCount: reports.length,
        format,
        reports: reports.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          author: `${r.author.firstName} ${r.author.lastName}`,
        }))
      }
      
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

      // Finalize the archive
      await archive.finalize()

      // Convert chunks to buffer
      const zipBuffer = Buffer.concat(chunks)

      // Update export record as completed
      await prisma.reportExport.update({
        where: { id: batchExport.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BATCH_EXPORT_REPORTS',
          entity: 'Report',
          entityId: batchExport.id,
          metadata: { 
            format,
            reportCount: reports.length,
            reportIds 
          }
        }
      })

      // Return zip file as response
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="reports_export_${Date.now()}.zip"`,
        },
      })
    } catch (error) {
      // Update export record as failed
      await prisma.reportExport.update({
        where: { id: batchExport.id },
        data: {
          status: 'FAILED',
          error: (error as Error).message,
        }
      })
      throw error
    }
  } catch (error) {
    console.error('Error in batch export:', error)
    return NextResponse.json(
      { error: 'Failed to export reports' },
      { status: 500 }
    )
  }
}

// GET /api/reports/batch-export - Get export history
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

    // Fetch export history for the organization
    const exports = await prisma.reportExport.findMany({
      where: {
        report: {
          organizationId,
        }
      },
      include: {
        report: {
          select: {
            title: true,
            slug: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50, // Last 50 exports
    })

    return NextResponse.json({
      success: true,
      data: exports
    })
  } catch (error) {
    console.error('Error fetching export history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch export history' },
      { status: 500 }
    )
  }
}

function generateHTMLContent(report: any): string {
  const currentDate = new Date().toLocaleDateString()
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${report.title}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
        .metadata { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
      </style>
    </head>
    <body>
      <h1>${report.title}</h1>
      <div class="metadata">
        <p><strong>Organization:</strong> ${report.organization.name}</p>
        <p><strong>Author:</strong> ${report.author.firstName} ${report.author.lastName}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Status:</strong> ${report.status}</p>
      </div>
      ${report.description ? `<p>${report.description}</p>` : ''}
  `

  // Add sections
  for (const section of report.sections) {
    html += `
      <div class="section">
        <h2>${section.title}</h2>
        ${formatSectionContent(section)}
      </div>
    `
  }

  html += `
    </body>
    </html>
  `

  return html
}

function formatSectionContent(section: any): string {
  switch (section.type) {
    case 'TEXT':
    case 'RECOMMENDATIONS':
      return section.content?.text || ''
      
    case 'STATISTICS':
      if (!section.content?.statistics) return ''
      let statsHtml = '<ul>'
      for (const stat of section.content.statistics) {
        statsHtml += `<li><strong>${stat.label}:</strong> ${stat.value} ${stat.unit || ''}</li>`
      }
      statsHtml += '</ul>'
      return statsHtml
      
    case 'CHART':
      if (!section.content?.chart) return ''
      return `<p><em>[Chart: ${section.content.chart.title}]</em></p>`
      
    case 'MAP':
      if (!section.content?.map?.locations) return ''
      let mapHtml = '<ul>'
      for (const loc of section.content.map.locations) {
        mapHtml += `<li>${loc.name} (${loc.type})`
        if (loc.affectedPeople) {
          mapHtml += ` - ${loc.affectedPeople} affected`
        }
        mapHtml += '</li>'
      }
      mapHtml += '</ul>'
      return mapHtml
      
    default:
      return `<p><em>[${section.type} section]</em></p>`
  }
}

function generateCSVContent(report: any): string {
  const rows: string[] = []
  
  // Header
  rows.push('Section,Type,Content')
  
  // Add report metadata
  rows.push(`"Report Title","METADATA","${report.title}"`)
  rows.push(`"Organization","METADATA","${report.organization.name}"`)
  rows.push(`"Author","METADATA","${report.author.firstName} ${report.author.lastName}"`)
  rows.push(`"Status","METADATA","${report.status}"`)
  
  // Add sections
  for (const section of report.sections) {
    let content = ''
    
    switch (section.type) {
      case 'TEXT':
      case 'RECOMMENDATIONS':
        content = stripHtml(section.content?.text || '').replace(/"/g, '""')
        break
        
      case 'STATISTICS':
        if (section.content?.statistics) {
          content = section.content.statistics
            .map((s: any) => `${s.label}: ${s.value} ${s.unit || ''}`)
            .join('; ')
        }
        break
        
      case 'CHART':
        if (section.content?.chart) {
          content = `Chart: ${section.content.chart.title}`
        }
        break
        
      case 'MAP':
        if (section.content?.map?.locations) {
          content = section.content.map.locations
            .map((l: any) => `${l.name} (${l.type})`)
            .join('; ')
        }
        break
        
      default:
        content = `[${section.type} content]`
    }
    
    rows.push(`"${section.title}","${section.type}","${content}"`)
  }
  
  return rows.join('\n')
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}