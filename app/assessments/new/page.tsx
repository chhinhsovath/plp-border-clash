'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  ArrowLeft, Save, Plus, Trash2, MapPin, Users, Home,
  Heart, Droplets, GraduationCap, Shield, AlertTriangle,
  Building2, Calendar, Clock, ChevronRight, Info
} from 'lucide-react'
import { format } from 'date-fns'

interface AssessmentData {
  // Basic Information
  title: string
  type: string
  location: string
  coordinates: {
    latitude: number
    longitude: number
  }
  startDate: string
  endDate: string
  leadAgency: string
  participatingOrganizations: string[]
  
  // Displacement Information
  totalPopulation: number
  affectedPopulation: number
  displacedHouseholds: number
  hostHouseholds: number
  averageHouseholdSize: number
  
  // Demographics
  demographics: {
    children0to5: number
    children6to17: number
    adults18to59: number
    elderly60plus: number
    malePercentage: number
    femalePercentage: number
    pregnantWomen: number
    lactatingWomen: number
    peopleWithDisabilities: number
    unaccompaniedMinors: number
  }
  
  // Sector-specific assessments
  sectors: {
    protection: {
      priority: string
      issues: string[]
      genderBasedViolence: boolean
      childProtection: boolean
      notes: string
    }
    shelter: {
      priority: string
      damagedHouses: number
      destroyedHouses: number
      averageOccupancy: number
      hostingArrangements: string
      notes: string
    }
    health: {
      priority: string
      healthFacilities: number
      functionalFacilities: number
      mainHealthConcerns: string[]
      malnutritionRate: number
      notes: string
    }
    wash: {
      priority: string
      waterAccess: number
      waterQuality: string
      latrineAccess: number
      handwashingFacilities: number
      notes: string
    }
    education: {
      priority: string
      schoolsAffected: number
      childrenOutOfSchool: number
      temporaryLearningSpaces: number
      notes: string
    }
    foodSecurity: {
      priority: string
      foodInsecureHouseholds: number
      copingStrategies: string[]
      marketAccess: boolean
      notes: string
    }
  }
  
  // Key Findings
  keyFindings: string
  immediateNeeds: string[]
  recommendations: string
  
  // Methodology
  methodology: {
    assessmentTools: string[]
    samplingMethod: string
    sampleSize: number
    dataCollectionMethods: string[]
    limitations: string
  }
  
  // Team Information
  teamMembers: Array<{
    name: string
    organization: string
    role: string
  }>
}

const initialAssessmentData: AssessmentData = {
  title: '',
  type: 'RAPID',
  location: '',
  coordinates: { latitude: 0, longitude: 0 },
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  leadAgency: '',
  participatingOrganizations: [],
  
  totalPopulation: 0,
  affectedPopulation: 0,
  displacedHouseholds: 0,
  hostHouseholds: 0,
  averageHouseholdSize: 5,
  
  demographics: {
    children0to5: 0,
    children6to17: 0,
    adults18to59: 0,
    elderly60plus: 0,
    malePercentage: 50,
    femalePercentage: 50,
    pregnantWomen: 0,
    lactatingWomen: 0,
    peopleWithDisabilities: 0,
    unaccompaniedMinors: 0,
  },
  
  sectors: {
    protection: {
      priority: 'MEDIUM',
      issues: [],
      genderBasedViolence: false,
      childProtection: false,
      notes: ''
    },
    shelter: {
      priority: 'HIGH',
      damagedHouses: 0,
      destroyedHouses: 0,
      averageOccupancy: 0,
      hostingArrangements: '',
      notes: ''
    },
    health: {
      priority: 'HIGH',
      healthFacilities: 0,
      functionalFacilities: 0,
      mainHealthConcerns: [],
      malnutritionRate: 0,
      notes: ''
    },
    wash: {
      priority: 'HIGH',
      waterAccess: 0,
      waterQuality: 'SAFE',
      latrineAccess: 0,
      handwashingFacilities: 0,
      notes: ''
    },
    education: {
      priority: 'MEDIUM',
      schoolsAffected: 0,
      childrenOutOfSchool: 0,
      temporaryLearningSpaces: 0,
      notes: ''
    },
    foodSecurity: {
      priority: 'HIGH',
      foodInsecureHouseholds: 0,
      copingStrategies: [],
      marketAccess: true,
      notes: ''
    }
  },
  
  keyFindings: '',
  immediateNeeds: [],
  recommendations: '',
  
  methodology: {
    assessmentTools: [],
    samplingMethod: '',
    sampleSize: 0,
    dataCollectionMethods: [],
    limitations: ''
  },
  
  teamMembers: [
    { name: '', organization: '', role: '' }
  ]
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(initialAssessmentData)
  const [activeTab, setActiveTab] = useState('basic')
  const [saving, setSaving] = useState(false)

  const updateField = (field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedField = (parent: string, field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof AssessmentData],
        [field]: value
      }
    }))
  }

  const updateSectorField = (sector: string, field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      sectors: {
        ...prev.sectors,
        [sector]: {
          ...prev.sectors[sector as keyof typeof prev.sectors],
          [field]: value
        }
      }
    }))
  }

  const addTeamMember = () => {
    setAssessmentData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: '', organization: '', role: '' }]
    }))
  }

  const updateTeamMember = (index: number, field: string, value: string) => {
    setAssessmentData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }))
  }

  const removeTeamMember = (index: number) => {
    setAssessmentData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assessmentData)
      })
      
      if (!response.ok) throw new Error('Failed to save assessment')
      
      const data = await response.json()
      alert('Assessment saved successfully!')
      router.push(`/assessments/${data.data.id}`)
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert('Failed to save assessment')
    } finally {
      setSaving(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <h1 className="text-2xl font-bold">New Assessment</h1>
                <p className="text-sm text-gray-600">Humanitarian needs assessment data collection</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="displacement">Displacement</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Assessment Information</CardTitle>
                <CardDescription>General details about the assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Assessment Title</Label>
                    <Input
                      id="title"
                      value={assessmentData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Enter assessment title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Assessment Type</Label>
                    <Select value={assessmentData.type} onValueChange={(v) => updateField('type', v)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RAPID">Rapid Assessment</SelectItem>
                        <SelectItem value="DETAILED">Detailed Assessment</SelectItem>
                        <SelectItem value="SECTORAL">Sectoral Assessment</SelectItem>
                        <SelectItem value="MULTI_SECTORAL">Multi-Sectoral Assessment</SelectItem>
                        <SelectItem value="MONITORING">Monitoring Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={assessmentData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="City, Province"
                    />
                  </div>
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      value={assessmentData.coordinates.latitude}
                      onChange={(e) => updateNestedField('coordinates', 'latitude', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      value={assessmentData.coordinates.longitude}
                      onChange={(e) => updateNestedField('coordinates', 'longitude', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={assessmentData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={assessmentData.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="leadAgency">Lead Agency</Label>
                  <Input
                    id="leadAgency"
                    value={assessmentData.leadAgency}
                    onChange={(e) => updateField('leadAgency', e.target.value)}
                    placeholder="Organization leading the assessment"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Displacement Information */}
          <TabsContent value="displacement">
            <Card>
              <CardHeader>
                <CardTitle>Displacement Information</CardTitle>
                <CardDescription>Population and household displacement data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalPopulation">
                      Total Population
                      <Info className="h-3 w-3 inline ml-1 text-gray-400" />
                    </Label>
                    <Input
                      id="totalPopulation"
                      type="number"
                      value={assessmentData.totalPopulation}
                      onChange={(e) => updateField('totalPopulation', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="affectedPopulation">
                      Affected Population
                      <Info className="h-3 w-3 inline ml-1 text-gray-400" />
                    </Label>
                    <Input
                      id="affectedPopulation"
                      type="number"
                      value={assessmentData.affectedPopulation}
                      onChange={(e) => updateField('affectedPopulation', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="displacedHouseholds">Displaced Households</Label>
                    <Input
                      id="displacedHouseholds"
                      type="number"
                      value={assessmentData.displacedHouseholds}
                      onChange={(e) => updateField('displacedHouseholds', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hostHouseholds">Host Households</Label>
                    <Input
                      id="hostHouseholds"
                      type="number"
                      value={assessmentData.hostHouseholds}
                      onChange={(e) => updateField('hostHouseholds', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="averageHouseholdSize">Avg Household Size</Label>
                    <Input
                      id="averageHouseholdSize"
                      type="number"
                      step="0.1"
                      value={assessmentData.averageHouseholdSize}
                      onChange={(e) => updateField('averageHouseholdSize', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {/* Visual representation */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Displacement Overview</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {assessmentData.affectedPopulation.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">People Affected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {assessmentData.displacedHouseholds.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Displaced HH</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round((assessmentData.affectedPopulation / assessmentData.totalPopulation) * 100) || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Population Affected</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demographics */}
          <TabsContent value="demographics">
            <Card>
              <CardHeader>
                <CardTitle>Demographic Breakdown</CardTitle>
                <CardDescription>Age, gender, and vulnerability disaggregation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Age Distribution</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="children0to5">Children 0-5</Label>
                      <Input
                        id="children0to5"
                        type="number"
                        value={assessmentData.demographics.children0to5}
                        onChange={(e) => updateNestedField('demographics', 'children0to5', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="children6to17">Children 6-17</Label>
                      <Input
                        id="children6to17"
                        type="number"
                        value={assessmentData.demographics.children6to17}
                        onChange={(e) => updateNestedField('demographics', 'children6to17', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="adults18to59">Adults 18-59</Label>
                      <Input
                        id="adults18to59"
                        type="number"
                        value={assessmentData.demographics.adults18to59}
                        onChange={(e) => updateNestedField('demographics', 'adults18to59', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="elderly60plus">Elderly 60+</Label>
                      <Input
                        id="elderly60plus"
                        type="number"
                        value={assessmentData.demographics.elderly60plus}
                        onChange={(e) => updateNestedField('demographics', 'elderly60plus', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Gender Distribution</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="malePercentage">Male %</Label>
                      <Input
                        id="malePercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={assessmentData.demographics.malePercentage}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          updateNestedField('demographics', 'malePercentage', val)
                          updateNestedField('demographics', 'femalePercentage', 100 - val)
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="femalePercentage">Female %</Label>
                      <Input
                        id="femalePercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={assessmentData.demographics.femalePercentage}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Vulnerable Groups</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pregnantWomen">Pregnant Women</Label>
                      <Input
                        id="pregnantWomen"
                        type="number"
                        value={assessmentData.demographics.pregnantWomen}
                        onChange={(e) => updateNestedField('demographics', 'pregnantWomen', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lactatingWomen">Lactating Women</Label>
                      <Input
                        id="lactatingWomen"
                        type="number"
                        value={assessmentData.demographics.lactatingWomen}
                        onChange={(e) => updateNestedField('demographics', 'lactatingWomen', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="peopleWithDisabilities">People with Disabilities</Label>
                      <Input
                        id="peopleWithDisabilities"
                        type="number"
                        value={assessmentData.demographics.peopleWithDisabilities}
                        onChange={(e) => updateNestedField('demographics', 'peopleWithDisabilities', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unaccompaniedMinors">Unaccompanied Minors</Label>
                      <Input
                        id="unaccompaniedMinors"
                        type="number"
                        value={assessmentData.demographics.unaccompaniedMinors}
                        onChange={(e) => updateNestedField('demographics', 'unaccompaniedMinors', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sectors */}
          <TabsContent value="sectors">
            <div className="space-y-6">
              {/* Protection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Priority Level</Label>
                    <Select 
                      value={assessmentData.sectors.protection.priority} 
                      onValueChange={(v) => updateSectorField('protection', 'priority', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Protection Concerns</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gbv"
                        checked={assessmentData.sectors.protection.genderBasedViolence}
                        onCheckedChange={(v) => updateSectorField('protection', 'genderBasedViolence', v)}
                      />
                      <label htmlFor="gbv">Gender-Based Violence</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="child-protection"
                        checked={assessmentData.sectors.protection.childProtection}
                        onCheckedChange={(v) => updateSectorField('protection', 'childProtection', v)}
                      />
                      <label htmlFor="child-protection">Child Protection Issues</label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="protection-notes">Notes</Label>
                    <Textarea
                      id="protection-notes"
                      value={assessmentData.sectors.protection.notes}
                      onChange={(e) => updateSectorField('protection', 'notes', e.target.value)}
                      placeholder="Additional protection concerns..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shelter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Shelter & NFI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Priority Level</Label>
                    <Select 
                      value={assessmentData.sectors.shelter.priority} 
                      onValueChange={(v) => updateSectorField('shelter', 'priority', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="damagedHouses">Damaged Houses</Label>
                      <Input
                        id="damagedHouses"
                        type="number"
                        value={assessmentData.sectors.shelter.damagedHouses}
                        onChange={(e) => updateSectorField('shelter', 'damagedHouses', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="destroyedHouses">Destroyed Houses</Label>
                      <Input
                        id="destroyedHouses"
                        type="number"
                        value={assessmentData.sectors.shelter.destroyedHouses}
                        onChange={(e) => updateSectorField('shelter', 'destroyedHouses', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Priority Level</Label>
                    <Select 
                      value={assessmentData.sectors.health.priority} 
                      onValueChange={(v) => updateSectorField('health', 'priority', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="healthFacilities">Total Health Facilities</Label>
                      <Input
                        id="healthFacilities"
                        type="number"
                        value={assessmentData.sectors.health.healthFacilities}
                        onChange={(e) => updateSectorField('health', 'healthFacilities', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="functionalFacilities">Functional Facilities</Label>
                      <Input
                        id="functionalFacilities"
                        type="number"
                        value={assessmentData.sectors.health.functionalFacilities}
                        onChange={(e) => updateSectorField('health', 'functionalFacilities', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* WASH */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5" />
                    WASH
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Priority Level</Label>
                    <Select 
                      value={assessmentData.sectors.wash.priority} 
                      onValueChange={(v) => updateSectorField('wash', 'priority', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="waterAccess">People with Water Access</Label>
                      <Input
                        id="waterAccess"
                        type="number"
                        value={assessmentData.sectors.wash.waterAccess}
                        onChange={(e) => updateSectorField('wash', 'waterAccess', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="waterQuality">Water Quality</Label>
                      <Select 
                        value={assessmentData.sectors.wash.waterQuality} 
                        onValueChange={(v) => updateSectorField('wash', 'waterQuality', v)}
                      >
                        <SelectTrigger id="waterQuality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAFE">Safe</SelectItem>
                          <SelectItem value="TREATED">Treated Required</SelectItem>
                          <SelectItem value="CONTAMINATED">Contaminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Key Findings */}
          <TabsContent value="findings">
            <Card>
              <CardHeader>
                <CardTitle>Key Findings & Recommendations</CardTitle>
                <CardDescription>Summary of assessment findings and immediate needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="keyFindings">Key Findings</Label>
                  <Textarea
                    id="keyFindings"
                    value={assessmentData.keyFindings}
                    onChange={(e) => updateField('keyFindings', e.target.value)}
                    placeholder="Summarize the main findings from the assessment..."
                    className="h-32"
                  />
                </div>

                <div>
                  <Label htmlFor="recommendations">Recommendations</Label>
                  <Textarea
                    id="recommendations"
                    value={assessmentData.recommendations}
                    onChange={(e) => updateField('recommendations', e.target.value)}
                    placeholder="Provide recommendations based on the findings..."
                    className="h-32"
                  />
                </div>

                <div>
                  <Label>Immediate Needs (Priority Order)</Label>
                  <div className="space-y-2">
                    {assessmentData.immediateNeeds.map((need, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-sm font-medium py-2">{index + 1}.</span>
                        <Input
                          value={need}
                          onChange={(e) => {
                            const newNeeds = [...assessmentData.immediateNeeds]
                            newNeeds[index] = e.target.value
                            updateField('immediateNeeds', newNeeds)
                          }}
                          placeholder="Enter immediate need"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newNeeds = assessmentData.immediateNeeds.filter((_, i) => i !== index)
                            updateField('immediateNeeds', newNeeds)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField('immediateNeeds', [...assessmentData.immediateNeeds, ''])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Need
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Methodology */}
          <TabsContent value="methodology">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Methodology</CardTitle>
                <CardDescription>Data collection methods and limitations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="samplingMethod">Sampling Method</Label>
                    <Input
                      id="samplingMethod"
                      value={assessmentData.methodology.samplingMethod}
                      onChange={(e) => updateNestedField('methodology', 'samplingMethod', e.target.value)}
                      placeholder="e.g., Random sampling, Purposive sampling"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sampleSize">Sample Size</Label>
                    <Input
                      id="sampleSize"
                      type="number"
                      value={assessmentData.methodology.sampleSize}
                      onChange={(e) => updateNestedField('methodology', 'sampleSize', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Assessment Tools Used</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Household Survey', 'Key Informant Interview', 'Focus Group Discussion', 'Direct Observation', 'Secondary Data Review'].map(tool => (
                      <div key={tool} className="flex items-center space-x-2">
                        <Checkbox
                          id={tool}
                          checked={assessmentData.methodology.assessmentTools.includes(tool)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateNestedField('methodology', 'assessmentTools', [...assessmentData.methodology.assessmentTools, tool])
                            } else {
                              updateNestedField('methodology', 'assessmentTools', assessmentData.methodology.assessmentTools.filter(t => t !== tool))
                            }
                          }}
                        />
                        <label htmlFor={tool}>{tool}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="limitations">Limitations</Label>
                  <Textarea
                    id="limitations"
                    value={assessmentData.methodology.limitations}
                    onChange={(e) => updateNestedField('methodology', 'limitations', e.target.value)}
                    placeholder="Describe any limitations or constraints faced during the assessment..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Team</CardTitle>
                <CardDescription>Team members involved in the assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessmentData.teamMembers.map((member, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4">
                      <Input
                        placeholder="Name"
                        value={member.name}
                        onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Organization"
                        value={member.organization}
                        onChange={(e) => updateTeamMember(index, 'organization', e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={member.role}
                        onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => removeTeamMember(index)}
                        disabled={assessmentData.teamMembers.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addTeamMember}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}