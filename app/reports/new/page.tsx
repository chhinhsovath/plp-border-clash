'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Save,
  Send,
  Eye,
  FileText,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  BarChart,
  Table,
  Map,
  List,
  Type,
  Hash,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Settings2,
  Globe,
  Target,
  Heart,
  Droplets,
  Home,
  GraduationCap,
  ShieldCheck,
  Wheat,
  Package,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
}

const sectorIcons = {
  HEALTH: Heart,
  WASH: Droplets,
  SHELTER: Home,
  EDUCATION: GraduationCap,
  PROTECTION: ShieldCheck,
  NUTRITION: Wheat,
  NFI: Package
}

const sectionTypes = [
  { value: 'TEXT', label: 'Text Section', icon: Type },
  { value: 'TABLE', label: 'Data Table', icon: Table },
  { value: 'CHART', label: 'Chart/Graph', icon: BarChart },
  { value: 'MAP', label: 'Map', icon: Map },
  { value: 'LIST', label: 'Bullet List', icon: List },
  { value: 'IMAGE', label: 'Image', icon: ImageIcon },
  { value: 'STATISTICS', label: 'Key Statistics', icon: Hash }
]

const reportTemplates = [
  { 
    id: 'sitrep', 
    name: 'Situation Report', 
    sectors: ['HEALTH', 'WASH', 'SHELTER', 'PROTECTION'],
    description: 'Standard emergency situation report template'
  },
  { 
    id: 'monthly', 
    name: 'Monthly Activity Report', 
    sectors: ['ALL'],
    description: 'Comprehensive monthly activities and achievements'
  },
  { 
    id: 'assessment', 
    name: 'Needs Assessment', 
    sectors: ['HEALTH', 'WASH', 'NUTRITION', 'SHELTER'],
    description: 'Multi-sectoral needs assessment report'
  },
  { 
    id: 'donor', 
    name: 'Donor Report', 
    sectors: ['ALL'],
    description: 'Detailed report for donor organizations'
  }
]

interface ReportSection {
  id: string
  type: string
  title: string
  content: string
  data?: any
  order: number
}

export default function CreateReport() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  
  const [reportData, setReportData] = useState({
    title: '',
    reportType: 'SITUATION_REPORT',
    description: '',
    status: 'DRAFT',
    sectors: [] as string[],
    reportingPeriodStart: '',
    reportingPeriodEnd: '',
    location: '',
    executiveSummary: '',
    recommendations: '',
    sections: [] as ReportSection[]
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userStr || !token) {
      router.push('/')
      return
    }
    
    setUser(JSON.parse(userStr))
  }, [router])

  const addSection = (type: string) => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type,
      title: '',
      content: '',
      order: reportData.sections.length + 1
    }
    
    setReportData({
      ...reportData,
      sections: [...reportData.sections, newSection]
    })
  }

  const updateSection = (id: string, field: string, value: any) => {
    setReportData({
      ...reportData,
      sections: reportData.sections.map(section =>
        section.id === id ? { ...section, [field]: value } : section
      )
    })
  }

  const removeSection = (id: string) => {
    setReportData({
      ...reportData,
      sections: reportData.sections.filter(section => section.id !== id)
    })
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = reportData.sections.findIndex(s => s.id === id)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === reportData.sections.length - 1)) {
      return
    }
    
    const newSections = [...reportData.sections]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newSections[index]
    newSections[index] = newSections[newIndex]
    newSections[newIndex] = temp
    
    setReportData({
      ...reportData,
      sections: newSections.map((section, i) => ({ ...section, order: i + 1 }))
    })
  }

  const toggleSector = (sector: string) => {
    if (reportData.sectors.includes(sector)) {
      setReportData({
        ...reportData,
        sectors: reportData.sectors.filter(s => s !== sector)
      })
    } else {
      setReportData({
        ...reportData,
        sectors: [...reportData.sectors, sector]
      })
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId)
    if (!template) return
    
    setSelectedTemplate(templateId)
    
    // Pre-populate sections based on template
    const defaultSections: ReportSection[] = []
    
    if (templateId === 'sitrep') {
      defaultSections.push(
        { id: `section-${Date.now()}-1`, type: 'TEXT', title: 'Situation Overview', content: '', order: 1 },
        { id: `section-${Date.now()}-2`, type: 'STATISTICS', title: 'Key Figures', content: '', order: 2 },
        { id: `section-${Date.now()}-3`, type: 'TEXT', title: 'Response Activities', content: '', order: 3 },
        { id: `section-${Date.now()}-4`, type: 'LIST', title: 'Urgent Needs', content: '', order: 4 }
      )
    }
    
    setReportData({
      ...reportData,
      sections: defaultSections,
      sectors: template.sectors[0] === 'ALL' ? ['HEALTH', 'WASH', 'SHELTER', 'EDUCATION', 'PROTECTION', 'NUTRITION', 'NFI'] : template.sectors
    })
  }

  const handleSubmit = async (action: 'save' | 'submit') => {
    setLoading(true)
    setMessage(null)

    try {
      if (!reportData.title || !reportData.reportingPeriodStart || !reportData.reportingPeriodEnd) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...reportData,
          status: action === 'submit' ? 'IN_REVIEW' : 'DRAFT',
          authorId: user?.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create report')
      }

      setMessage({ 
        type: 'success', 
        text: action === 'submit' 
          ? 'Report submitted for review successfully!' 
          : 'Report saved as draft successfully!'
      })
      
      setTimeout(() => {
        router.push('/reports')
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/reports')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Create Report
                </h1>
                <p className="text-sm text-gray-500">
                  Generate comprehensive humanitarian reports
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleSubmit('save')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button 
                onClick={() => handleSubmit('submit')}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Processing...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Report Settings */}
          <div className="space-y-6">
            {/* Report Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-purple-600" />
                  Report Template
                </CardTitle>
                <CardDescription>
                  Choose a template to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === template.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Report Information */}
            <Card>
              <CardHeader>
                <CardTitle>Report Information</CardTitle>
                <CardDescription>
                  Basic report details and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Title *</Label>
                  <Input
                    value={reportData.title}
                    onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                    placeholder="Enter report title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select 
                    value={reportData.reportType} 
                    onValueChange={(value) => setReportData({ ...reportData, reportType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SITUATION_REPORT">Situation Report</SelectItem>
                      <SelectItem value="ASSESSMENT">Assessment Report</SelectItem>
                      <SelectItem value="MONTHLY">Monthly Report</SelectItem>
                      <SelectItem value="DONOR">Donor Report</SelectItem>
                      <SelectItem value="SPECIAL">Special Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={reportData.location}
                    onChange={(e) => setReportData({ ...reportData, location: e.target.value })}
                    placeholder="Report coverage area"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Period Start *</Label>
                    <Input
                      type="date"
                      value={reportData.reportingPeriodStart}
                      onChange={(e) => setReportData({ ...reportData, reportingPeriodStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period End *</Label>
                    <Input
                      type="date"
                      value={reportData.reportingPeriodEnd}
                      onChange={(e) => setReportData({ ...reportData, reportingPeriodEnd: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sectors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Sectors Covered
                </CardTitle>
                <CardDescription>
                  Select relevant sectors for this report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(sectorIcons).map(([sector, Icon]) => (
                  <div key={sector} className="flex items-center space-x-2">
                    <Checkbox
                      id={sector}
                      checked={reportData.sectors.includes(sector)}
                      onCheckedChange={() => toggleSector(sector)}
                    />
                    <Label 
                      htmlFor={sector} 
                      className="flex items-center gap-2 cursor-pointer font-normal"
                    >
                      <Icon className="h-4 w-4" />
                      {sector}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Report Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
                <CardDescription>
                  Brief overview of the report's key findings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={reportData.executiveSummary}
                  onChange={(e) => setReportData({ ...reportData, executiveSummary: e.target.value })}
                  placeholder="Provide a concise summary of the report..."
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>

            {/* Report Sections */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Report Sections</CardTitle>
                    <CardDescription>
                      Build your report by adding different types of content
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sectionTypes.map(type => (
                      <Button
                        key={type.value}
                        variant="outline"
                        size="sm"
                        onClick={() => addSection(type.value)}
                        className="flex items-center gap-1"
                      >
                        <type.icon className="h-3 w-3" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportData.sections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No sections added yet</p>
                    <p className="text-xs mt-1">Click the buttons above to add content sections</p>
                  </div>
                ) : (
                  reportData.sections.map((section, index) => (
                    <Card key={section.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <Badge variant="secondary">
                              {sectionTypes.find(t => t.value === section.type)?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSection(section.id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSection(section.id, 'down')}
                              disabled={index === reportData.sections.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSection(section.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                          placeholder="Section title"
                        />
                        
                        {section.type === 'TEXT' || section.type === 'LIST' ? (
                          <Textarea
                            value={section.content}
                            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                            placeholder={section.type === 'LIST' ? 'Enter items, one per line' : 'Enter content...'}
                            className="min-h-[100px]"
                          />
                        ) : section.type === 'STATISTICS' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Metric name" />
                            <Input placeholder="Value" />
                            <Button variant="outline" size="sm" className="col-span-2">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Metric
                            </Button>
                          </div>
                        ) : section.type === 'IMAGE' ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Click to upload image</p>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
                            Configuration for {section.type} coming soon
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Key recommendations and next steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={reportData.recommendations}
                  onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
                  placeholder="List key recommendations..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}