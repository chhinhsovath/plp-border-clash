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
import { 
  ArrowLeft,
  Save,
  Droplets,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  MapPin,
  Users,
  Beaker,
  Home,
  ShowerHead
} from 'lucide-react'

interface WaterSource {
  sourceType: string
  capacity: number
  quality: string
  distance: number
  functional: boolean
}

interface SanitationFacility {
  facilityType: string
  quantity: number
  condition: string
  genderSeparated: boolean
  accessible: boolean
}

interface HygieneSupply {
  itemType: string
  quantityAvailable: number
  quantityNeeded: number
  lastDistribution?: string
}

export default function WashAssessmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [sites, setSites] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    siteId: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    assessorName: '',
    priority: 'MEDIUM',
    notes: ''
  })

  const [waterSources, setWaterSources] = useState<WaterSource[]>([{
    sourceType: '',
    capacity: 0,
    quality: '',
    distance: 0,
    functional: true
  }])

  const [sanitationFacilities, setSanitationFacilities] = useState<SanitationFacility[]>([{
    facilityType: '',
    quantity: 0,
    condition: '',
    genderSeparated: false,
    accessible: false
  }])

  const [hygieneSupplies, setHygieneSupplies] = useState<HygieneSupply[]>([{
    itemType: 'SOAP',
    quantityAvailable: 0,
    quantityNeeded: 0,
    lastDistribution: ''
  }])

  const [waterTestResults, setWaterTestResults] = useState({
    ecoli: 0,
    ph: 7.0,
    turbidity: 0,
    chlorine: 0,
    testDate: new Date().toISOString().split('T')[0]
  })

  const [recommendations, setRecommendations] = useState<string[]>([''])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchSites()
  }, [router])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSites(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    }
  }

  const addWaterSource = () => {
    setWaterSources([...waterSources, {
      sourceType: '',
      capacity: 0,
      quality: '',
      distance: 0,
      functional: true
    }])
  }

  const removeWaterSource = (index: number) => {
    setWaterSources(waterSources.filter((_, i) => i !== index))
  }

  const updateWaterSource = (index: number, field: string, value: any) => {
    const updated = [...waterSources]
    updated[index] = { ...updated[index], [field]: value }
    setWaterSources(updated)
  }

  const addSanitationFacility = () => {
    setSanitationFacilities([...sanitationFacilities, {
      facilityType: '',
      quantity: 0,
      condition: '',
      genderSeparated: false,
      accessible: false
    }])
  }

  const removeSanitationFacility = (index: number) => {
    setSanitationFacilities(sanitationFacilities.filter((_, i) => i !== index))
  }

  const updateSanitationFacility = (index: number, field: string, value: any) => {
    const updated = [...sanitationFacilities]
    updated[index] = { ...updated[index], [field]: value }
    setSanitationFacilities(updated)
  }

  const addHygieneSupply = () => {
    setHygieneSupplies([...hygieneSupplies, {
      itemType: '',
      quantityAvailable: 0,
      quantityNeeded: 0,
      lastDistribution: ''
    }])
  }

  const removeHygieneSupply = (index: number) => {
    setHygieneSupplies(hygieneSupplies.filter((_, i) => i !== index))
  }

  const updateHygieneSupply = (index: number, field: string, value: any) => {
    const updated = [...hygieneSupplies]
    updated[index] = { ...updated[index], [field]: value }
    setHygieneSupplies(updated)
  }

  const addRecommendation = () => {
    setRecommendations([...recommendations, ''])
  }

  const removeRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index))
  }

  const updateRecommendation = (index: number, value: string) => {
    const updated = [...recommendations]
    updated[index] = value
    setRecommendations(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.siteId || !formData.assessorName) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/wash/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          waterSources,
          sanitationFacilities,
          hygieneSupplies,
          waterTestResults,
          recommendations: recommendations.filter(r => r.trim())
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assessment')
      }

      setMessage({ 
        type: 'success', 
        text: 'WASH assessment completed successfully!' 
      })

      setTimeout(() => {
        router.push('/wash/assessments')
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/wash')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Droplets className="h-6 w-6 text-blue-600" />
                  WASH Assessment
                </h1>
                <p className="text-sm text-gray-500">Water, Sanitation & Hygiene Assessment</p>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Assessment'}
            </Button>
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

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Assessment Information
            </CardTitle>
            <CardDescription>
              Basic details about the WASH assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteId">Site *</Label>
                <Select value={formData.siteId} onValueChange={(value) => setFormData({ ...formData, siteId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.siteName} ({site.siteCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assessmentDate">Assessment Date *</Label>
                <Input
                  id="assessmentDate"
                  type="date"
                  value={formData.assessmentDate}
                  onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessorName">Assessor Name *</Label>
                <Input
                  id="assessorName"
                  value={formData.assessorName}
                  onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-8">
                <Badge className={getPriorityColor(formData.priority)}>
                  {formData.priority} Priority
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Water Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-600" />
                Water Sources
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addWaterSource}>
                <Plus className="h-4 w-4" />
                Add Source
              </Button>
            </CardTitle>
            <CardDescription>
              Document all water sources available at the site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {waterSources.map((source, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Water Source {index + 1}</h4>
                  {waterSources.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWaterSource(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select 
                      value={source.sourceType} 
                      onValueChange={(value) => updateWaterSource(index, 'sourceType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOREHOLE">Borehole</SelectItem>
                        <SelectItem value="WELL">Well</SelectItem>
                        <SelectItem value="SPRING">Spring</SelectItem>
                        <SelectItem value="SURFACE_WATER">Surface Water</SelectItem>
                        <SelectItem value="TRUCKED_WATER">Trucked Water</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Capacity (L/day)</Label>
                    <Input
                      type="number"
                      value={source.capacity}
                      onChange={(e) => updateWaterSource(index, 'capacity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Water Quality</Label>
                    <Select 
                      value={source.quality} 
                      onValueChange={(value) => updateWaterSource(index, 'quality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAFE">Safe</SelectItem>
                        <SelectItem value="NEEDS_TREATMENT">Needs Treatment</SelectItem>
                        <SelectItem value="UNSAFE">Unsafe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Distance (m)</Label>
                    <Input
                      type="number"
                      value={source.distance}
                      onChange={(e) => updateWaterSource(index, 'distance', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Functional</Label>
                    <div className="flex items-center pt-2">
                      <Checkbox
                        checked={source.functional}
                        onCheckedChange={(checked) => updateWaterSource(index, 'functional', checked)}
                      />
                      <Label className="ml-2">Yes</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Water Quality Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-purple-600" />
              Water Quality Test Results
            </CardTitle>
            <CardDescription>
              Laboratory test results for water quality parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>E.coli (CFU/100ml)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={waterTestResults.ecoli}
                  onChange={(e) => setWaterTestResults({ ...waterTestResults, ecoli: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>pH Level</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={waterTestResults.ph}
                  onChange={(e) => setWaterTestResults({ ...waterTestResults, ph: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Turbidity (NTU)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={waterTestResults.turbidity}
                  onChange={(e) => setWaterTestResults({ ...waterTestResults, turbidity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Chlorine (mg/L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={waterTestResults.chlorine}
                  onChange={(e) => setWaterTestResults({ ...waterTestResults, chlorine: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Test Date</Label>
                <Input
                  type="date"
                  value={waterTestResults.testDate}
                  onChange={(e) => setWaterTestResults({ ...waterTestResults, testDate: e.target.value })}
                />
              </div>
            </div>
            
            {/* Quality Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <Badge variant={waterTestResults.ecoli > 0 ? "destructive" : "secondary"} className="text-center">
                E.coli: {waterTestResults.ecoli > 0 ? 'Contaminated' : 'Clean'}
              </Badge>
              <Badge variant={waterTestResults.ph < 6.5 || waterTestResults.ph > 8.5 ? "destructive" : "secondary"} className="text-center">
                pH: {waterTestResults.ph < 6.5 || waterTestResults.ph > 8.5 ? 'Outside Range' : 'Normal'}
              </Badge>
              <Badge variant={waterTestResults.turbidity > 5 ? "destructive" : "secondary"} className="text-center">
                Turbidity: {waterTestResults.turbidity > 5 ? 'High' : 'Acceptable'}
              </Badge>
              <Badge variant={waterTestResults.chlorine < 0.2 || waterTestResults.chlorine > 2.0 ? "destructive" : "secondary"} className="text-center">
                Chlorine: {waterTestResults.chlorine < 0.2 || waterTestResults.chlorine > 2.0 ? 'Outside Range' : 'Normal'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sanitation Facilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5 text-green-600" />
                Sanitation Facilities
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addSanitationFacility}>
                <Plus className="h-4 w-4" />
                Add Facility
              </Button>
            </CardTitle>
            <CardDescription>
              Document sanitation facilities and their conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sanitationFacilities.map((facility, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Facility {index + 1}</h4>
                  {sanitationFacilities.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSanitationFacility(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Facility Type</Label>
                    <Select 
                      value={facility.facilityType} 
                      onValueChange={(value) => updateSanitationFacility(index, 'facilityType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LATRINE">Latrine</SelectItem>
                        <SelectItem value="TOILET">Toilet</SelectItem>
                        <SelectItem value="SHOWER">Shower</SelectItem>
                        <SelectItem value="WASTE_DISPOSAL">Waste Disposal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={facility.quantity}
                      onChange={(e) => updateSanitationFacility(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select 
                      value={facility.condition} 
                      onValueChange={(value) => updateSanitationFacility(index, 'condition', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                        <SelectItem value="NON_FUNCTIONAL">Non-Functional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Gender Separated</Label>
                    <div className="flex items-center pt-2">
                      <Checkbox
                        checked={facility.genderSeparated}
                        onCheckedChange={(checked) => updateSanitationFacility(index, 'genderSeparated', checked)}
                      />
                      <Label className="ml-2">Yes</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Accessible</Label>
                    <div className="flex items-center pt-2">
                      <Checkbox
                        checked={facility.accessible}
                        onCheckedChange={(checked) => updateSanitationFacility(index, 'accessible', checked)}
                      />
                      <Label className="ml-2">Yes</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hygiene Supplies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShowerHead className="h-5 w-5 text-teal-600" />
                Hygiene Supplies
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addHygieneSupply}>
                <Plus className="h-4 w-4" />
                Add Supply
              </Button>
            </CardTitle>
            <CardDescription>
              Track availability and needs for hygiene supplies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hygieneSupplies.map((supply, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Supply Item {index + 1}</h4>
                  {hygieneSupplies.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHygieneSupply(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Input
                      value={supply.itemType}
                      onChange={(e) => updateHygieneSupply(index, 'itemType', e.target.value)}
                      placeholder="e.g., Soap, Toothpaste"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Available Quantity</Label>
                    <Input
                      type="number"
                      value={supply.quantityAvailable}
                      onChange={(e) => updateHygieneSupply(index, 'quantityAvailable', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Needed Quantity</Label>
                    <Input
                      type="number"
                      value={supply.quantityNeeded}
                      onChange={(e) => updateHygieneSupply(index, 'quantityNeeded', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Last Distribution</Label>
                    <Input
                      type="date"
                      value={supply.lastDistribution}
                      onChange={(e) => updateHygieneSupply(index, 'lastDistribution', e.target.value)}
                    />
                  </div>
                </div>
                
                {supply.quantityNeeded > supply.quantityAvailable && (
                  <Badge variant="destructive" className="w-fit">
                    Shortage: {supply.quantityNeeded - supply.quantityAvailable} units needed
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Recommendations
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addRecommendation}>
                <Plus className="h-4 w-4" />
                Add Recommendation
              </Button>
            </CardTitle>
            <CardDescription>
              Specific recommendations to address identified issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1">
                  <Textarea
                    value={recommendation}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    placeholder={`Recommendation ${index + 1}...`}
                    className="min-h-[80px]"
                  />
                </div>
                {recommendations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecommendation(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional observations or comments about the WASH conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional observations, constraints, or recommendations..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving Assessment...' : 'Complete WASH Assessment'}
          </Button>
        </div>
      </form>
    </div>
  )
}