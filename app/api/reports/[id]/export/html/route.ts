import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// POST /api/reports/[id]/export/html - Generate HTML export
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

    // Fetch the report with all related data
    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        author: true,
        organization: true,
        sections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' }
        },
        assessments: true,
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Create export record
    const exportRecord = await prisma.reportExport.create({
      data: {
        reportId: params.id,
        format: 'HTML',
        status: 'PROCESSING',
      }
    })

    try {
      // Generate HTML content for the report
      const htmlContent = generateReportHTML(report)

      // Update export record as completed
      await prisma.reportExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'EXPORT_REPORT',
          entity: 'Report',
          entityId: params.id,
          metadata: { format: 'HTML' }
        }
      })

      // Return HTML as response
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${report.slug}.html"`,
        },
      })
    } catch (error) {
      // Update export record as failed
      await prisma.reportExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'FAILED',
          error: (error as Error).message,
        }
      })
      throw error
    }
  } catch (error) {
    console.error('Error generating HTML:', error)
    return NextResponse.json(
      { error: 'Failed to generate HTML' },
      { status: 500 }
    )
  }
}

// GET /api/reports/[id]/share - Get shareable HTML link
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareToken = request.nextUrl.searchParams.get('token')
    
    // Verify share token if provided
    if (shareToken) {
      const report = await prisma.report.findFirst({
        where: {
          id: params.id,
          shareToken,
          isPublic: true,
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

      if (!report) {
        return NextResponse.json(
          { error: 'Invalid share link' },
          { status: 404 }
        )
      }

      // Generate HTML content for public viewing
      const htmlContent = generatePublicHTML(report)
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    // For authenticated requests
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Generate a share token if not exists
    let reportShareToken = report.shareToken
    if (!reportShareToken) {
      reportShareToken = generateShareToken()
      await prisma.report.update({
        where: { id: params.id },
        data: { shareToken: reportShareToken }
      })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/reports/${params.id}/export/html?token=${reportShareToken}`

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken: reportShareToken,
    })
  } catch (error) {
    console.error('Error generating share link:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function generateReportHTML(report: any): string {
  const currentDate = new Date().toLocaleDateString()
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${report.title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 40px 0;
          border-bottom: 3px solid #2563eb;
          margin-bottom: 40px;
        }
        h1 {
          color: #2563eb;
          font-size: 2.5em;
          margin-bottom: 20px;
        }
        .metadata {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 40px;
        }
        .metadata-item {
          display: flex;
          flex-direction: column;
        }
        .metadata-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 0.9em;
          text-transform: uppercase;
        }
        .metadata-value {
          color: #111827;
          font-size: 1.1em;
          margin-top: 4px;
        }
        .section {
          margin-bottom: 40px;
          padding: 20px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .section:last-child {
          border-bottom: none;
        }
        h2 {
          color: #1e40af;
          font-size: 1.8em;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #dbeafe;
        }
        .statistics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .stat-value {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .chart-placeholder {
          background: #f3f4f6;
          padding: 40px;
          text-align: center;
          border-radius: 8px;
          color: #6b7280;
          font-style: italic;
        }
        .location-list {
          list-style: none;
          padding: 0;
        }
        .location-item {
          background: #f9fafb;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .location-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 5px;
        }
        .location-details {
          color: #6b7280;
          font-size: 0.9em;
        }
        .footer {
          text-align: center;
          margin-top: 60px;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
        }
        .footer-logo {
          font-size: 1.2em;
          font-weight: 600;
          color: #2563eb;
          margin-bottom: 10px;
        }
        @media print {
          body {
            background: white;
          }
          .container {
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${report.title}</h1>
          ${report.description ? `<p style="font-size: 1.1em; color: #6b7280; margin-top: 10px;">${report.description}</p>` : ''}
        </div>
        
        <div class="metadata">
          <div class="metadata-item">
            <span class="metadata-label">Organization</span>
            <span class="metadata-value">${report.organization.name}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Author</span>
            <span class="metadata-value">${report.author.firstName} ${report.author.lastName}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Date</span>
            <span class="metadata-value">${currentDate}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Status</span>
            <span class="metadata-value">${report.status}</span>
          </div>
        </div>
        
        ${report.sections.map((section: any) => generateSectionHTML(section)).join('')}
        
        <div class="footer">
          <div class="footer-logo">Humanitarian Report System</div>
          <p>${report.organization.name} - ${currentDate}</p>
          <p style="margin-top: 10px; font-size: 0.9em;">This report was automatically generated and may contain sensitive information.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateSectionHTML(section: any): string {
  let html = `<div class="section">`
  html += `<h2>${section.title}</h2>`
  
  switch (section.type) {
    case 'TEXT':
    case 'RECOMMENDATIONS':
      html += `<div>${section.content?.text || ''}</div>`
      break
      
    case 'STATISTICS':
      if (section.content?.statistics && section.content.statistics.length > 0) {
        html += '<div class="statistics">'
        section.content.statistics.forEach((stat: any) => {
          html += `
            <div class="stat-card">
              <div class="stat-value">${stat.value} ${stat.unit || ''}</div>
              <div class="stat-label">${stat.label}</div>
            </div>
          `
        })
        html += '</div>'
      }
      break
      
    case 'CHART':
      if (section.content?.chart) {
        html += `<div class="chart-placeholder">Chart: ${section.content.chart.title}</div>`
        if (section.content.chart.data?.length > 0) {
          html += '<table>'
          html += '<thead><tr><th>Label</th><th>Value</th></tr></thead>'
          html += '<tbody>'
          section.content.chart.data.forEach((item: any) => {
            html += `<tr><td>${item[section.content.chart.xAxisKey]}</td><td>${item[section.content.chart.dataKey]}</td></tr>`
          })
          html += '</tbody></table>'
        }
      }
      break
      
    case 'TABLE':
      html += `<div>${section.content?.text || ''}</div>`
      break
      
    case 'MAP':
      if (section.content?.map?.locations && section.content.map.locations.length > 0) {
        html += '<ul class="location-list">'
        section.content.map.locations.forEach((loc: any) => {
          html += `
            <li class="location-item">
              <div class="location-name">${loc.name} (${loc.type})</div>
              <div class="location-details">
                ${loc.affectedPeople ? `Affected: ${loc.affectedPeople} people • ` : ''}
                Coordinates: ${loc.latitude}, ${loc.longitude}
                ${loc.description ? `<br>${loc.description}` : ''}
              </div>
            </li>
          `
        })
        html += '</ul>'
      }
      break
      
    case 'IMAGE_GALLERY':
      html += '<div class="chart-placeholder">Image gallery - Images not included in HTML export</div>'
      break
      
    case 'ASSESSMENT_DATA':
      html += '<div class="chart-placeholder">Assessment data section</div>'
      break
      
    default:
      html += `<div class="chart-placeholder">[${section.type} section]</div>`
  }
  
  html += `</div>`
  return html
}

function generatePublicHTML(report: any): string {
  // Similar to generateReportHTML but with public viewing considerations
  return generateReportHTML(report)
}