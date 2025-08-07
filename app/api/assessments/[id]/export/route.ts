import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import * as XLSX from 'xlsx'

// GET /api/assessments/[id]/export - Export assessment data
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
    const format = searchParams.get('format') || 'excel'

    // Get the assessment
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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

    if (format === 'excel') {
      // Create Excel export
      const workbook = XLSX.utils.book_new()
      
      // Basic Information Sheet
      const basicInfoData = [
        ['Assessment Title', assessment.title],
        ['Type', assessment.type.replace('_', ' ')],
        ['Location', assessment.location],
        ['Start Date', new Date(assessment.startDate).toLocaleDateString()],
        ['End Date', new Date(assessment.endDate).toLocaleDateString()],
        ['Lead Agency', assessment.data.leadAgency],
        ['Total Population', assessment.data.totalPopulation || 'N/A'],
        ['Affected Population', assessment.affectedPeople],
        ['Displaced Households', assessment.data.displacedHouseholds || 'N/A'],
        ['Host Households', assessment.data.hostHouseholds || 'N/A'],
        ['Average Household Size', assessment.data.averageHouseholdSize || 'N/A'],
        ['Created By', `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`],
        ['Created At', new Date(assessment.createdAt).toLocaleDateString()],
      ]
      const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfoData)
      XLSX.utils.book_append_sheet(workbook, basicInfoSheet, 'Basic Information')

      // Demographics Sheet
      if (assessment.data.demographics) {
        const demographics = assessment.data.demographics
        const demographicsData = [
          ['Age Group', 'Count'],
          ['Children 0-5 years', demographics.children0to5 || 0],
          ['Children 6-17 years', demographics.children6to17 || 0],
          ['Adults 18-59 years', demographics.adults18to59 || 0],
          ['Elderly 60+ years', demographics.elderly60plus || 0],
          [''],
          ['Gender Distribution', 'Percentage'],
          ['Male', demographics.malePercentage ? `${demographics.malePercentage}%` : 'N/A'],
          ['Female', demographics.femalePercentage ? `${demographics.femalePercentage}%` : 'N/A'],
          [''],
          ['Vulnerable Groups', 'Count'],
          ['Pregnant Women', demographics.pregnantWomen || 0],
          ['Lactating Women', demographics.lactatingWomen || 0],
          ['People with Disabilities', demographics.peopleWithDisabilities || 0],
          ['Unaccompanied Minors', demographics.unaccompaniedMinors || 0],
        ]
        const demographicsSheet = XLSX.utils.aoa_to_sheet(demographicsData)
        XLSX.utils.book_append_sheet(workbook, demographicsSheet, 'Demographics')
      }

      // Sectors Sheet
      if (assessment.data.sectors) {
        const sectorsData = [['Sector', 'Key', 'Value']]
        Object.entries(assessment.data.sectors).forEach(([sector, sectorData]) => {
          if (sectorData && typeof sectorData === 'object') {
            Object.entries(sectorData).forEach(([key, value]) => {
              sectorsData.push([
                sector.charAt(0).toUpperCase() + sector.slice(1).replace(/([A-Z])/g, ' $1'),
                key.replace(/([A-Z])/g, ' $1'),
                typeof value === 'number' ? value.toLocaleString() : String(value)
              ])
            })
          }
        })
        const sectorsSheet = XLSX.utils.aoa_to_sheet(sectorsData)
        XLSX.utils.book_append_sheet(workbook, sectorsSheet, 'Sectors')
      }

      // Team Members Sheet
      if (assessment.data.teamMembers && assessment.data.teamMembers.length > 0) {
        const teamData = [['Name', 'Organization', 'Role']]
        assessment.data.teamMembers.forEach(member => {
          teamData.push([member.name, member.organization, member.role])
        })
        const teamSheet = XLSX.utils.aoa_to_sheet(teamData)
        XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Members')
      }

      // Key Findings and Recommendations Sheet
      const findingsData = [
        ['Key Findings'],
        [assessment.data.keyFindings || 'No key findings recorded'],
        [''],
        ['Immediate Needs'],
        ...(assessment.data.immediateNeeds?.map(need => [need]) || [['No immediate needs identified']]),
        [''],
        ['Recommendations'],
        [assessment.data.recommendations || 'No recommendations provided']
      ]
      const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData)
      XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings & Recommendations')

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'EXPORT_ASSESSMENT',
          entity: 'Assessment',
          entityId: assessment.id,
          metadata: {
            format: 'excel',
            title: assessment.title
          }
        }
      })

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${assessment.title}-assessment.xlsx"`
        }
      })

    } else if (format === 'pdf') {
      // For PDF export, we'll return JSON data that the frontend can format
      // In a real implementation, you would use a PDF generation library
      const pdfData = {
        title: assessment.title,
        type: assessment.type,
        location: assessment.location,
        dateRange: `${new Date(assessment.startDate).toLocaleDateString()} - ${new Date(assessment.endDate).toLocaleDateString()}`,
        leadAgency: assessment.data.leadAgency,
        affectedPeople: assessment.affectedPeople,
        demographics: assessment.data.demographics,
        sectors: assessment.data.sectors,
        keyFindings: assessment.data.keyFindings,
        immediateNeeds: assessment.data.immediateNeeds,
        recommendations: assessment.data.recommendations,
        teamMembers: assessment.data.teamMembers,
        createdBy: `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`,
        createdAt: assessment.createdAt
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'EXPORT_ASSESSMENT',
          entity: 'Assessment',
          entityId: assessment.id,
          metadata: {
            format: 'pdf',
            title: assessment.title
          }
        }
      })

      // Return PDF data as JSON (frontend will handle PDF generation)
      return NextResponse.json({
        success: true,
        data: pdfData,
        format: 'pdf'
      })

    } else {
      return NextResponse.json(
        { error: 'Unsupported export format' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error exporting assessment:', error)
    return NextResponse.json(
      { error: 'Failed to export assessment' },
      { status: 500 }
    )
  }
}