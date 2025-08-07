'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Download, FileText, Table, Globe, Package, 
  ArrowLeft, Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface Report {
  id: string
  title: string
  status: string
  updatedAt: string
}

interface ExportRecord {
  id: string
  format: string
  status: string
  createdAt: string
  completedAt?: string
  error?: string
  metadata?: any
  report: {
    title: string
    slug: string
  }
}

export default function ExportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<string>('ALL')
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchReports()
    fetchExportHistory()
  }, [])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch reports')
      
      const data = await response.json()
      setReports(data.data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExportHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reports/batch-export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch export history')
      
      const data = await response.json()
      setExportHistory(data.data || [])
    } catch (error) {
      console.error('Error fetching export history:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([])
    } else {
      setSelectedReports(reports.map(r => r.id))
    }
  }

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    )
  }

  const handleBatchExport = async () => {
    if (selectedReports.length === 0) {
      alert('Please select at least one report to export')
      return
    }

    setExporting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reports/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportIds: selectedReports,
          format: exportFormat
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to export reports')
      }
      
      // Download the zip file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reports_export_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      alert(`Successfully exported ${selectedReports.length} report(s)!`)
      
      // Refresh export history
      fetchExportHistory()
      
      // Clear selection
      setSelectedReports([])
    } catch (error) {
      console.error('Error exporting reports:', error)
      alert('Failed to export reports')
    } finally {
      setExporting(false)
    }
  }

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return <FileText className="h-4 w-4" />
      case 'EXCEL':
        return <Table className="h-4 w-4" />
      case 'HTML':
        return <Globe className="h-4 w-4" />
      case 'ALL':
        return <Package className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Batch Export & Downloads</h1>
                <p className="text-sm text-gray-600">Export multiple reports at once</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList>
            <TabsTrigger value="export">Batch Export</TabsTrigger>
            <TabsTrigger value="history">Export History</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Reports to Export</CardTitle>
                <CardDescription>
                  Choose one or more reports and select the export format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search and filters */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Export format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Formats</SelectItem>
                      <SelectItem value="PDF">PDF Only</SelectItem>
                      <SelectItem value="WORD">Word Only</SelectItem>
                      <SelectItem value="EXCEL">Excel Only</SelectItem>
                      <SelectItem value="HTML">HTML Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reports list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedReports.length === reports.length && reports.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="font-medium">Select All</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {selectedReports.length} of {reports.length} selected
                    </span>
                  </div>

                  {filteredReports.map(report => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedReports.includes(report.id)}
                          onCheckedChange={() => handleReportToggle(report.id)}
                        />
                        <div>
                          <p className="font-medium">{report.title}</p>
                          <p className="text-sm text-gray-600">
                            Status: {report.status} • Updated: {new Date(report.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleBatchExport}
                    disabled={selectedReports.length === 0 || exporting}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export Selected ({selectedReports.length})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export History</CardTitle>
                <CardDescription>
                  View and download previous exports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exportHistory.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No export history yet</p>
                  ) : (
                    exportHistory.map(export_ => (
                      <div
                        key={export_.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(export_.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{export_.report.title}</p>
                              {export_.metadata?.batchExport && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Batch ({export_.metadata.reportCount} reports)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Format: {export_.format} • {new Date(export_.createdAt).toLocaleString()}
                            </p>
                            {export_.error && (
                              <p className="text-sm text-red-600">Error: {export_.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getFormatIcon(export_.format)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}