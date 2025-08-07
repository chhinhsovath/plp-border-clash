import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import ExcelJS from 'exceljs'

// POST /api/reports/[id]/export/excel - Generate Excel export
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
        format: 'EXCEL',
        status: 'PROCESSING',
      }
    })

    try {
      // Create workbook
      const workbook = new ExcelJS.Workbook()
      workbook.creator = `${report.author.firstName} ${report.author.lastName}`
      workbook.created = new Date()
      workbook.modified = new Date()

      // Add overview sheet
      const overviewSheet = workbook.addWorksheet('Overview')
      
      // Style the header
      overviewSheet.getRow(1).font = { bold: true, size: 16 }
      overviewSheet.getCell('A1').value = report.title
      overviewSheet.mergeCells('A1:D1')
      
      // Add metadata
      overviewSheet.getCell('A3').value = 'Organization:'
      overviewSheet.getCell('B3').value = report.organization.name
      overviewSheet.getCell('A4').value = 'Author:'
      overviewSheet.getCell('B4').value = `${report.author.firstName} ${report.author.lastName}`
      overviewSheet.getCell('A5').value = 'Date:'
      overviewSheet.getCell('B5').value = new Date().toLocaleDateString()
      overviewSheet.getCell('A6').value = 'Status:'
      overviewSheet.getCell('B6').value = report.status
      
      if (report.description) {
        overviewSheet.getCell('A8').value = 'Description:'
        overviewSheet.getCell('B8').value = report.description
        overviewSheet.mergeCells('B8:D8')
      }
      
      // Auto-fit columns
      overviewSheet.columns.forEach(column => {
        column.width = 20
      })

      // Process sections
      report.sections.forEach((section, index) => {
        switch (section.type) {
          case 'STATISTICS':
            if (section.content?.statistics && section.content.statistics.length > 0) {
              const statsSheet = workbook.addWorksheet(`Statistics ${index + 1}`)
              
              // Add title
              statsSheet.getRow(1).font = { bold: true, size: 14 }
              statsSheet.getCell('A1').value = section.title
              statsSheet.mergeCells('A1:C1')
              
              // Add headers
              statsSheet.getRow(3).font = { bold: true }
              statsSheet.getCell('A3').value = 'Metric'
              statsSheet.getCell('B3').value = 'Value'
              statsSheet.getCell('C3').value = 'Unit'
              
              // Add data
              section.content.statistics.forEach((stat: any, i: number) => {
                const row = i + 4
                statsSheet.getCell(`A${row}`).value = stat.label
                statsSheet.getCell(`B${row}`).value = stat.value
                statsSheet.getCell(`C${row}`).value = stat.unit || ''
              })
              
              // Style the data
              statsSheet.getColumn('B').numFmt = '#,##0'
              statsSheet.columns.forEach(column => {
                column.width = 25
              })
            }
            break

          case 'CHART':
            if (section.content?.chart?.data && section.content.chart.data.length > 0) {
              const chartSheet = workbook.addWorksheet(`Chart ${index + 1}`)
              
              // Add title
              chartSheet.getRow(1).font = { bold: true, size: 14 }
              chartSheet.getCell('A1').value = section.content.chart.title || section.title
              chartSheet.mergeCells('A1:B1')
              
              // Add headers
              chartSheet.getRow(3).font = { bold: true }
              chartSheet.getCell('A3').value = 'Label'
              chartSheet.getCell('B3').value = 'Value'
              
              // Add data
              section.content.chart.data.forEach((item: any, i: number) => {
                const row = i + 4
                chartSheet.getCell(`A${row}`).value = item[section.content.chart.xAxisKey]
                chartSheet.getCell(`B${row}`).value = item[section.content.chart.dataKey]
              })
              
              // Style the data
              chartSheet.getColumn('B').numFmt = '#,##0'
              chartSheet.columns.forEach(column => {
                column.width = 25
              })
            }
            break

          case 'MAP':
            if (section.content?.map?.locations && section.content.map.locations.length > 0) {
              const mapSheet = workbook.addWorksheet(`Locations ${index + 1}`)
              
              // Add title
              mapSheet.getRow(1).font = { bold: true, size: 14 }
              mapSheet.getCell('A1').value = section.title
              mapSheet.mergeCells('A1:F1')
              
              // Add headers
              mapSheet.getRow(3).font = { bold: true }
              mapSheet.getCell('A3').value = 'Location Name'
              mapSheet.getCell('B3').value = 'Type'
              mapSheet.getCell('C3').value = 'Latitude'
              mapSheet.getCell('D3').value = 'Longitude'
              mapSheet.getCell('E3').value = 'Affected People'
              mapSheet.getCell('F3').value = 'Description'
              
              // Add data
              section.content.map.locations.forEach((loc: any, i: number) => {
                const row = i + 4
                mapSheet.getCell(`A${row}`).value = loc.name
                mapSheet.getCell(`B${row}`).value = loc.type
                mapSheet.getCell(`C${row}`).value = loc.latitude
                mapSheet.getCell(`D${row}`).value = loc.longitude
                mapSheet.getCell(`E${row}`).value = loc.affectedPeople || ''
                mapSheet.getCell(`F${row}`).value = loc.description || ''
              })
              
              // Style the data
              mapSheet.getColumn('C').numFmt = '0.000000'
              mapSheet.getColumn('D').numFmt = '0.000000'
              mapSheet.getColumn('E').numFmt = '#,##0'
              mapSheet.columns.forEach(column => {
                column.width = 20
              })
            }
            break

          case 'ASSESSMENT_DATA':
            if (section.content?.assessments) {
              const assessmentSheet = workbook.addWorksheet(`Assessment ${index + 1}`)
              
              // Add title
              assessmentSheet.getRow(1).font = { bold: true, size: 14 }
              assessmentSheet.getCell('A1').value = section.title
              assessmentSheet.mergeCells('A1:D1')
              
              // Add any assessment data here
              assessmentSheet.getCell('A3').value = 'Assessment data export coming soon'
            }
            break
        }
      })

      // Add summary sheet if there are assessments
      if (report.assessments && report.assessments.length > 0) {
        const assessmentSheet = workbook.addWorksheet('Assessments')
        
        // Add headers
        assessmentSheet.getRow(1).font = { bold: true }
        assessmentSheet.getCell('A1').value = 'Location'
        assessmentSheet.getCell('B1').value = 'Type'
        assessmentSheet.getCell('C1').value = 'Affected People'
        assessmentSheet.getCell('D1').value = 'Households'
        assessmentSheet.getCell('E1').value = 'Start Date'
        assessmentSheet.getCell('F1').value = 'End Date'
        
        // Add data
        report.assessments.forEach((assessment: any, i: number) => {
          const row = i + 2
          assessmentSheet.getCell(`A${row}`).value = assessment.location
          assessmentSheet.getCell(`B${row}`).value = assessment.type
          assessmentSheet.getCell(`C${row}`).value = assessment.affectedPeople || 0
          assessmentSheet.getCell(`D${row}`).value = assessment.households || 0
          assessmentSheet.getCell(`E${row}`).value = new Date(assessment.startDate).toLocaleDateString()
          assessmentSheet.getCell(`F${row}`).value = new Date(assessment.endDate).toLocaleDateString()
        })
        
        // Style the data
        assessmentSheet.getColumn('C').numFmt = '#,##0'
        assessmentSheet.getColumn('D').numFmt = '#,##0'
        assessmentSheet.columns.forEach(column => {
          column.width = 20
        })
      }

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer()

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
          metadata: { format: 'EXCEL' }
        }
      })

      // Return Excel file as response
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${report.slug}.xlsx"`,
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
    console.error('Error generating Excel file:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}