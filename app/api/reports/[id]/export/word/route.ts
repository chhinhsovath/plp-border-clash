import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

// POST /api/reports/[id]/export/word - Generate Word export
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
        format: 'WORD',
        status: 'PROCESSING',
      }
    })

    try {
      // Create document sections
      const children: any[] = []

      // Add title
      children.push(
        new Paragraph({
          text: report.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )

      // Add metadata
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Organization: ', bold: true }),
            new TextRun(report.organization.name),
          ],
          spacing: { after: 200 }
        })
      )

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Author: ', bold: true }),
            new TextRun(`${report.author.firstName} ${report.author.lastName}`),
          ],
          spacing: { after: 200 }
        })
      )

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun(new Date().toLocaleDateString()),
          ],
          spacing: { after: 200 }
        })
      )

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Status: ', bold: true }),
            new TextRun(report.status),
          ],
          spacing: { after: 600 }
        })
      )

      // Add description if exists
      if (report.description) {
        children.push(
          new Paragraph({
            text: report.description,
            spacing: { after: 400 }
          })
        )
      }

      // Add sections
      for (const section of report.sections) {
        // Section title
        children.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )

        // Section content based on type
        switch (section.type) {
          case 'TEXT':
          case 'RECOMMENDATIONS':
            const textContent = stripHtml(section.content?.text || '')
            children.push(
              new Paragraph({
                text: textContent,
                spacing: { after: 200 }
              })
            )
            break

          case 'STATISTICS':
            if (section.content?.statistics) {
              const statsTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: 'Metric', bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'Value', bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                      }),
                    ],
                  }),
                  ...section.content.statistics.map((stat: any) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(stat.label)],
                        }),
                        new TableCell({
                          children: [new Paragraph(`${stat.value} ${stat.unit || ''}`)],
                        }),
                      ],
                    })
                  ),
                ],
              })
              children.push(statsTable)
            }
            break

          case 'CHART':
            if (section.content?.chart) {
              children.push(
                new Paragraph({
                  text: `Chart: ${section.content.chart.title}`,
                  italics: true,
                  spacing: { after: 200 }
                })
              )
              
              // Add chart data as table
              if (section.content.chart.data?.length > 0) {
                const chartTable = new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: 'Label', bold: true })],
                          width: { size: 50, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: 'Value', bold: true })],
                          width: { size: 50, type: WidthType.PERCENTAGE }
                        }),
                      ],
                    }),
                    ...section.content.chart.data.map((item: any) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph(String(item[section.content.chart.xAxisKey]))],
                          }),
                          new TableCell({
                            children: [new Paragraph(String(item[section.content.chart.dataKey]))],
                          }),
                        ],
                      })
                    ),
                  ],
                })
                children.push(chartTable)
              }
            }
            break

          case 'MAP':
            if (section.content?.map?.locations) {
              children.push(
                new Paragraph({
                  text: 'Locations:',
                  bold: true,
                  spacing: { after: 100 }
                })
              )
              
              section.content.map.locations.forEach((loc: any) => {
                let locationText = `• ${loc.name} (${loc.type})`
                if (loc.affectedPeople) {
                  locationText += ` - ${loc.affectedPeople} affected`
                }
                if (loc.description) {
                  locationText += ` - ${loc.description}`
                }
                
                children.push(
                  new Paragraph({
                    text: locationText,
                    spacing: { after: 100 }
                  })
                )
              })
            }
            break

          case 'TABLE':
            const tableContent = stripHtml(section.content?.text || '')
            children.push(
              new Paragraph({
                text: tableContent,
                spacing: { after: 200 }
              })
            )
            break

          default:
            children.push(
              new Paragraph({
                text: `[${section.type} section]`,
                italics: true,
                spacing: { after: 200 }
              })
            )
        }
      }

      // Add footer
      children.push(
        new Paragraph({
          text: '---',
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 200 }
        })
      )

      children.push(
        new Paragraph({
          text: 'Generated by Humanitarian Report System',
          alignment: AlignmentType.CENTER,
          size: 20,
          color: '666666'
        })
      )

      children.push(
        new Paragraph({
          text: `${report.organization.name} - ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          size: 20,
          color: '666666'
        })
      )

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      })

      // Generate Word document buffer
      const buffer = await Packer.toBuffer(doc)

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
          metadata: { format: 'WORD' }
        }
      })

      // Return Word document as response
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${report.slug}.docx"`,
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
    console.error('Error generating Word document:', error)
    return NextResponse.json(
      { error: 'Failed to generate Word document' },
      { status: 500 }
    )
  }
}

function stripHtml(html: string): string {
  // Basic HTML stripping - in production, use a proper HTML parser
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}