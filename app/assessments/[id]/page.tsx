'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Edit, FileText, MapPin, Calendar, Users, Building2, 
  Download, Share2, Trash2, Copy, AlertCircle, CheckCircle,
  BarChart3, Globe, Shield, Heart, Home, GraduationCap,
  Utensils, ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface Assessment {
  id: string
  title: string
  type: string
  location: string
  coordinates: {
    latitude: number
    longitude: number
  }
  startDate: string
  endDate: string
  affectedPeople: number
  households?: number
  status: string
  createdAt: string
  updatedAt: string
  createdBy: {
    firstName: string
    lastName: string
    email: string
  }
  report?: {
    id: string
    title: string
    status: string
  }
  data: {
    leadAgency: string
    participatingOrganizations?: string[]
    totalPopulation?: number
    affectedPopulation: number
    displacedHouseholds?: number
    hostHouseholds?: number
    averageHouseholdSize?: number
    demographics?: {
      children0to5?: number
      children6to17?: number
      adults18to59?: number
      elderly60plus?: number
      malePercentage?: number
      femalePercentage?: number
      pregnantWomen?: number
      lactatingWomen?: number
      peopleWithDisabilities?: number
      unaccompaniedMinors?: number
    }
    sectors?: {
      protection?: any
      shelter?: any
      health?: any
      wash?: any
      education?: any
      foodSecurity?: any
    }
    keyFindings?: string
    immediateNeeds?: string[]
    recommendations?: string
    methodology?: any
    teamMembers?: Array<{
      name: string
      organization: string
      role: string
    }>
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'RAPID': return <AlertCircle className="h-4 w-4" />
    case 'DETAILED': return <FileText className="h-4 w-4" />
    case 'SECTORAL': return <BarChart3 className="h-4 w-4" />
    case 'MULTI_SECTORAL': return <Globe className="h-4 w-4" />
    case 'MONITORING': return <CheckCircle className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getSectorIcon = (sector: string) => {
  switch (sector) {
    case 'protection': return <Shield className="h-4 w-4" />
    case 'shelter': return <Home className="h-4 w-4" />
    case 'health': return <Heart className="h-4 w-4" />
    case 'wash': return <Globe className="h-4 w-4" />
    case 'education': return <GraduationCap className="h-4 w-4" />
    case 'foodSecurity': return <Utensils className="h-4 w-4" />
    default: return <BarChart3 className="h-4 w-4" />
  }
}

export default function AssessmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAssessment()
    }
  }, [params.id])

  const fetchAssessment = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch assessment')
      }
      
      const data = await response.json()
      setAssessment(data.data)
    } catch (error) {
      console.error('Error fetching assessment:', error)
      alert('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete assessment')
      }
      
      alert('Assessment deleted successfully')
      router.push('/assessments')
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('Failed to delete assessment')
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${params.id}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to export assessment')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${assessment?.title}-assessment.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting assessment:', error)
      alert('Failed to export assessment')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!assessment) {
    return <div className="flex items-center justify-center min-h-screen">Assessment not found</div>
  }

  const demographics = assessment.data.demographics || {}
  const sectors = assessment.data.sectors || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(assessment.type)}
                <h1 className="text-3xl font-bold">{assessment.title}</h1>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {assessment.location}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(assessment.startDate), 'MMM dd, yyyy')} - {format(new Date(assessment.endDate), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {assessment.affectedPeople.toLocaleString()} affected people
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/assessments/${params.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('pdf')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('excel')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Assessment</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this assessment? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete Assessment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Assessment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getTypeIcon(assessment.type)}
                <span className="font-semibold">{assessment.type.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Lead Agency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="font-semibold">{assessment.data.leadAgency}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Population</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessment.data.totalPopulation?.toLocaleString() || 'N/A'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Households</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessment.households?.toLocaleString() || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Displacement Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Affected Population</p>
                      <p className="text-xl font-semibold">{assessment.data.affectedPopulation.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Displaced Households</p>
                      <p className="text-xl font-semibold">{assessment.data.displacedHouseholds?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Host Households</p>
                      <p className="text-xl font-semibold">{assessment.data.hostHouseholds?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Household Size</p>
                      <p className="text-xl font-semibold">{assessment.data.averageHouseholdSize || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Participating Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessment.data.participatingOrganizations?.length ? (
                    <div className="space-y-2">
                      {assessment.data.participatingOrganizations.map((org, index) => (
                        <Badge key={index} variant="outline">{org}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No participating organizations listed</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="demographics">
            <Card>
              <CardHeader>
                <CardTitle>Population Demographics</CardTitle>
                <CardDescription>Age groups and vulnerable populations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Age Groups</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>0-5 years</span>
                        <span className="font-medium">{demographics.children0to5?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>6-17 years</span>
                        <span className="font-medium">{demographics.children6to17?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>18-59 years</span>
                        <span className="font-medium">{demographics.adults18to59?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>60+ years</span>
                        <span className="font-medium">{demographics.elderly60plus?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Gender</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Male</span>
                        <span className="font-medium">{demographics.malePercentage ? `${demographics.malePercentage}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Female</span>
                        <span className="font-medium">{demographics.femalePercentage ? `${demographics.femalePercentage}%` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Women's Health</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Pregnant Women</span>
                        <span className="font-medium">{demographics.pregnantWomen?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lactating Women</span>
                        <span className="font-medium">{demographics.lactatingWomen?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Vulnerable Groups</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>People with Disabilities</span>
                        <span className="font-medium">{demographics.peopleWithDisabilities?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unaccompanied Minors</span>
                        <span className="font-medium">{demographics.unaccompaniedMinors?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectors">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(sectors).map(([sectorKey, sectorData]) => (
                <Card key={sectorKey}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getSectorIcon(sectorKey)}
                      {sectorKey.charAt(0).toUpperCase() + sectorKey.slice(1).replace(/([A-Z])/g, ' $1')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sectorData && typeof sectorData === 'object' ? (
                      <div className="space-y-2">
                        {Object.entries(sectorData).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                            <span className="font-medium">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No data available</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="findings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {assessment.data.keyFindings ? (
                      <p className="whitespace-pre-wrap">{assessment.data.keyFindings}</p>
                    ) : (
                      <p className="text-gray-500">No key findings recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Immediate Needs</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessment.data.immediateNeeds?.length ? (
                    <ul className="space-y-2">
                      {assessment.data.immediateNeeds.map((need, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {need}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No immediate needs identified</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {assessment.data.recommendations ? (
                      <p className="whitespace-pre-wrap">{assessment.data.recommendations}</p>
                    ) : (
                      <p className="text-gray-500">No recommendations provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="methodology">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Methodology</CardTitle>
                <CardDescription>Data collection methods and approaches</CardDescription>
              </CardHeader>
              <CardContent>
                {assessment.data.methodology ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(assessment.data.methodology, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500">No methodology information available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Team</CardTitle>
                <CardDescription>Team members involved in this assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {assessment.data.teamMembers?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessment.data.teamMembers.map((member, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div>
                            <h4 className="font-semibold">{member.name}</h4>
                            <p className="text-sm text-gray-600">{member.organization}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {member.role}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No team members listed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Information */}
        <div className="mt-8 text-sm text-gray-500 border-t pt-6">
          <div className="flex justify-between items-center">
            <div>
              Created by {assessment.createdBy.firstName} {assessment.createdBy.lastName} • 
              {formatDistanceToNow(new Date(assessment.createdAt), { addSuffix: true })}
            </div>
            <div>
              Last updated {formatDistanceToNow(new Date(assessment.updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}