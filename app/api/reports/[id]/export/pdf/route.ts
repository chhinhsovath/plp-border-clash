import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import puppeteer from 'puppeteer'

// POST /api/reports/[id]/export/pdf - Generate PDF export
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
        format: 'PDF',
        status: 'PROCESSING',
      }
    })

    try {
      // Generate HTML content for the report
      const htmlContent = generateReportHTML(report)

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

      const page = await browser.newPage()
      
      // Set content and styles
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      })

      // Add custom styles for PDF
      await page.addStyleTag({
        content: `
          @page {
            margin: 1in;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          h1 { 
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          h2 { 
            color: #1e40af;
            margin-top: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .statistics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            border: 1px solid #e5e7eb;
            padding: 15px;
            border-radius: 8px;
            background: #f9fafb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
        `
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      })

      await browser.close()

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
          metadata: { format: 'PDF' }
        }
      })

      // Return PDF as response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${report.slug}.pdf"`,
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
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

function generateReportHTML(report: any): string {
  const currentDate = new Date().toLocaleDateString()
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${report.title}</title>
    </head>
    <body>
      <div class="header">
        <h1>${report.title}</h1>
        <p>${report.description || ''}</p>
        <p><strong>Organization:</strong> ${report.organization.name}</p>
        <p><strong>Author:</strong> ${report.author.firstName} ${report.author.lastName}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Status:</strong> ${report.status}</p>
      </div>
  `

  // Add sections
  report.sections.forEach((section: any) => {
    html += `<div class="section">`
    html += `<h2>${section.title}</h2>`
    
    switch (section.type) {
      case 'TEXT':
      case 'RECOMMENDATIONS':
        html += section.content?.text || ''
        break
        
      case 'STATISTICS':
        if (section.content?.statistics) {
          html += '<div class="statistics">'
          section.content.statistics.forEach((stat: any) => {
            html += `
              <div class="stat-card">
                <div style="font-size: 24px; font-weight: bold;">${stat.value} ${stat.unit || ''}</div>
                <div>${stat.label}</div>
              </div>
            `
          })
          html += '</div>'
        }
        break
        
      case 'CHART':
        if (section.content?.chart) {
          html += `<p><em>[Chart: ${section.content.chart.title}]</em></p>`
          html += '<table>'
          html += '<thead><tr><th>Label</th><th>Value</th></tr></thead>'
          html += '<tbody>'
          section.content.chart.data?.forEach((item: any) => {
            html += `<tr><td>${item[section.content.chart.xAxisKey]}</td><td>${item[section.content.chart.dataKey]}</td></tr>`
          })
          html += '</tbody></table>'
        }
        break
        
      case 'TABLE':
        html += section.content?.text || ''
        break
        
      case 'MAP':
        if (section.content?.map?.locations) {
          html += '<h3>Locations</h3>'
          html += '<ul>'
          section.content.map.locations.forEach((loc: any) => {
            html += `<li><strong>${loc.name}</strong> (${loc.type})`
            if (loc.affectedPeople) {
              html += ` - ${loc.affectedPeople} affected`
            }
            if (loc.description) {
              html += ` - ${loc.description}`
            }
            html += '</li>'
          })
          html += '</ul>'
        }
        break
        
      case 'IMAGE_GALLERY':
        html += '<p><em>[Image gallery section - images not included in PDF]</em></p>'
        break
        
      case 'ASSESSMENT_DATA':
        html += '<p><em>[Assessment data section]</em></p>'
        break
    }
    
    html += `</div>`
  })

  // Add footer
  html += `
      <div class="footer">
        <p>Generated by Humanitarian Report System</p>
        <p>${report.organization.name} - ${currentDate}</p>
      </div>
    </body>
    </html>
  `

  return html
}