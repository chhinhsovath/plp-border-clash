import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { Permission } from '@/lib/auth/rbac'
import { AuditLogger, AuditAction } from '@/lib/audit/audit-logger'
import * as XLSX from 'xlsx'

// GET /api/audit/report - Generate audit report
async function GET(request: NextRequest) {
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
    const format = searchParams.get('format') || 'json'
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: 30 days ago
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date() // Default: now

    // Generate comprehensive audit report
    const report = await AuditLogger.generateReport(organizationId, startDate, endDate)

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        ['Audit Report Summary'],
        ['Organization ID', organizationId],
        ['Report Period', `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
        ['Generated At', report.generatedAt.toLocaleString()],
        [''],
        ['Statistics'],
        ['Total Events', report.statistics.totalEvents],
        ['Successful Operations', report.statistics.successfulOperations],
        ['Failed Operations', report.statistics.failedOperations],
        ['Security Events', report.statistics.securityEvents],
        [''],
        ['Action Breakdown']
      ]

      Object.entries(report.statistics.actionBreakdown).forEach(([action, count]) => {
        summaryData.push([action, count])
      })

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      // Detailed logs sheet
      const logsData = [
        ['Timestamp', 'User ID', 'Action', 'Entity', 'Entity ID', 'Severity', 'Success', 'IP Address', 'Error Message']
      ]

      report.logs.forEach(log => {
        logsData.push([
          log.timestamp.toLocaleString(),
          log.userId || 'N/A',
          log.action,
          log.entity,
          log.entityId || 'N/A',
          log.severity,
          log.success ? 'Yes' : 'No',
          log.ipAddress || 'N/A',
          log.errorMessage || 'N/A'
        ])
      })

      const logsSheet = XLSX.utils.aoa_to_sheet(logsData)
      XLSX.utils.book_append_sheet(workbook, logsSheet, 'Detailed Logs')

      // User activity sheet
      const userActivityData = [['User ID', 'Activity Count']]
      Object.entries(report.statistics.userActivity).forEach(([userId, count]) => {
        userActivityData.push([userId, count])
      })

      const userActivitySheet = XLSX.utils.aoa_to_sheet(userActivityData)
      XLSX.utils.book_append_sheet(workbook, userActivitySheet, 'User Activity')

      // Timeline sheet
      const timelineData = [['Hour', 'Event Count']]
      Object.entries(report.statistics.timelineData).forEach(([hour, count]) => {
        timelineData.push([hour, count])
      })

      const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData)
      XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline')

      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      })

      // Log the report generation
      await AuditLogger.logSuccess(
        AuditAction.DATA_EXPORT,
        'AuditReport',
        userId,
        undefined,
        { format: 'excel', period: { startDate, endDate } },
        request
      )

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="audit-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx"`
        }
      })
    }

    // Default JSON response
    await AuditLogger.logSuccess(
      AuditAction.DATA_EXPORT,
      'AuditReport',
      userId,
      undefined,
      { format: 'json', period: { startDate, endDate } },
      request
    )

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error generating audit report:', error)
    return NextResponse.json(
      { error: 'Failed to generate audit report' },
      { status: 500 }
    )
  }
}

// Export with security middleware
export const GET_SECURED = withSecurity(GET, {
  permissions: [Permission.VIEW_AUDIT_LOGS],
  rateLimit: { limit: 10, window: 60 * 1000 } // Limited due to resource intensive operation
})

export { GET_SECURED as GET }