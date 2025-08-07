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
  Home,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Users,
  Shield,
  Accessibility,
  AlertTriangle,
  Package
} from 'lucide-react'

interface NFIItem {
  itemType: string
  itemName: string
  quantityNeeded: number
  priority: string
  reason: string
}

interface Hazard {
  hazardType: string
  description: string
  severity: string
}

export default function ShelterAssessmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [households, setHouseholds] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    householdId: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    shelterType: '',
    shelterCondition: '',
    assessorName: '',
    priority: 'MEDIUM',
    notes: ''
  })

  const [structuralSafety, setStructuralSafety] = useState({
    foundation: '',
    walls: '',
    roof: '',
    doors: '',
    windows: ''
  })

  const [livingConditions, setLivingConditions] = useState({
    overcrowding: false,
    privacy: '',
    ventilation: '',
    lighting: '',
    flooring: ''
  })

  const [nfiNeeds, setNfiNeeds] = useState<NFIItem[]>([{
    itemType: '',
    itemName: '',
    quantityNeeded: 0,
    priority: 'MEDIUM',
    reason: ''
  }])

  const [hazards, setHazards] = useState<Hazard[]>([{
    hazardType: '',
    description: '',
    severity: 'MEDIUM'
  }])

  const [accessibility, setAccessibility] = useState({
    wheelchairAccessible: false,
    elderlyFriendly: false,
    childSafe: false,
    disabilityAccommodations: [] as string[]
  })

  const [recommendations, setRecommendations] = useState<string[]>([''])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    fetchHouseholds()
  }, [router])

  const fetchHouseholds = async () => {
    try {
      const response = await fetch('/api/households', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setHouseholds(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching households:', error)
    }
  }

  const addNFIItem = () => {
    setNfiNeeds([...nfiNeeds, {
      itemType: '',
      itemName: '',
      quantityNeeded: 0,
      priority: 'MEDIUM',
      reason: ''
    }])
  }

  const removeNFIItem = (index: number) => {
    setNfiNeeds(nfiNeeds.filter((_, i) => i !== index))
  }

  const updateNFIItem = (index: number, field: string, value: any) => {
    const updated = [...nfiNeeds]
    updated[index] = { ...updated[index], [field]: value }
    setNfiNeeds(updated)
  }

  const addHazard = () => {
    setHazards([...hazards, {
      hazardType: '',
      description: '',
      severity: 'MEDIUM'
    }])
  }

  const removeHazard = (index: number) => {
    setHazards(hazards.filter((_, i) => i !== index))
  }

  const updateHazard = (index: number, field: string, value: any) => {
    const updated = [...hazards]
    updated[index] = { ...updated[index], [field]: value }
    setHazards(updated)
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
      if (!formData.householdId || !formData.assessorName || !formData.shelterType) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/shelter/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          structuralSafety,
          livingConditions,
          nfiNeeds,
          hazards,
          accessibility,
          recommendations: recommendations.filter(r => r.trim())
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assessment')
      }

      setMessage({ 
        type: 'success', 
        text: 'Shelter assessment completed successfully!' 
      })

      setTimeout(() => {
        router.push('/shelter/assessments')
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
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
                onClick={() => router.push('/shelter')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Home className="h-6 w-6 text-indigo-600" />
                  Shelter Assessment
                </h1>
                <p className="text-sm text-gray-500">Shelter conditions and NFI needs assessment</p>
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
              <Users className="h-5 w-5 text-indigo-600" />
              Assessment Information
            </CardTitle>
            <CardDescription>
              Basic details about the shelter assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="householdId">Household *</Label>
                <Select value={formData.householdId} onValueChange={(value) => setFormData({ ...formData, householdId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select household" />
                  </SelectTrigger>
                  <SelectContent>
                    {households.map(household => (
                      <SelectItem key={household.id} value={household.id}>
                        {household.householdCode} - {household.headOfHousehold} ({household.familySize} members)
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
                <Label htmlFor="assessorName">Assessor Name *</Label>
                <Input
                  id="assessorName"
                  value={formData.assessorName}
                  onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shelterType">Shelter Type *</Label>
                <Select value={formData.shelterType} onValueChange={(value) => setFormData({ ...formData, shelterType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shelter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TENT">Tent</SelectItem>
                    <SelectItem value="PREFAB">Prefabricated Structure</SelectItem>
                    <SelectItem value="SHARED_BUILDING">Shared Building</SelectItem>
                    <SelectItem value="OPEN_AIR">Open Air</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shelterCondition">Overall Condition *</Label>
                <Select value={formData.shelterCondition} onValueChange={(value) => setFormData({ ...formData, shelterCondition: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="UNINHABITABLE">Uninhabitable</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(formData.priority)}>
                {formData.priority} Priority
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Structural Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Structural Safety Assessment
            </CardTitle>
            <CardDescription>
              Evaluate the structural integrity of the shelter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Foundation</Label>
                <Select value={structuralSafety.foundation} onValueChange={(value) => setStructuralSafety({ ...structuralSafety, foundation: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STABLE">Stable</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                    <SelectItem value="UNSAFE">Unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Walls</Label>
                <Select value={structuralSafety.walls} onValueChange={(value) => setStructuralSafety({ ...structuralSafety, walls: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STABLE">Stable</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                    <SelectItem value="UNSAFE">Unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Roof</Label>
                <Select value={structuralSafety.roof} onValueChange={(value) => setStructuralSafety({ ...structuralSafety, roof: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STABLE">Stable</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                    <SelectItem value="UNSAFE">Unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Doors</Label>
                <Select value={structuralSafety.doors} onValueChange={(value) => setStructuralSafety({ ...structuralSafety, doors: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                    <SelectItem value="MISSING">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Windows</Label>
                <Select value={structuralSafety.windows} onValueChange={(value) => setStructuralSafety({ ...structuralSafety, windows: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
                    <SelectItem value="MISSING">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Living Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              Living Conditions
            </CardTitle>
            <CardDescription>
              Assess the habitability and living environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Privacy Level</Label>
                <Select value={livingConditions.privacy} onValueChange={(value) => setLivingConditions({ ...livingConditions, privacy: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADEQUATE">Adequate</SelectItem>
                    <SelectItem value="LIMITED">Limited</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Ventilation</Label>
                <Select value={livingConditions.ventilation} onValueChange={(value) => setLivingConditions({ ...livingConditions, ventilation: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="ADEQUATE">Adequate</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Lighting</Label>
                <Select value={livingConditions.lighting} onValueChange={(value) => setLivingConditions({ ...livingConditions, lighting: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADEQUATE">Adequate</SelectItem>
                    <SelectItem value="INSUFFICIENT">Insufficient</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Flooring</Label>
                <Select value={livingConditions.flooring} onValueChange={(value) => setLivingConditions({ ...livingConditions, flooring: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONCRETE">Concrete</SelectItem>
                    <SelectItem value="WOOD">Wood</SelectItem>
                    <SelectItem value="DIRT">Dirt</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Overcrowding</Label>
                <div className="flex items-center pt-2">
                  <Checkbox
                    checked={livingConditions.overcrowding}
                    onCheckedChange={(checked) => setLivingConditions({ ...livingConditions, overcrowding: checked as boolean })}
                  />
                  <Label className="ml-2">Yes, overcrowded</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NFI Needs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Non-Food Item (NFI) Needs
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addNFIItem}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardTitle>
            <CardDescription>
              Document specific NFI needs and their urgency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nfiNeeds.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">NFI Item {index + 1}</h4>
                  {nfiNeeds.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNFIItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Input
                      value={item.itemType}
                      onChange={(e) => updateNFIItem(index, 'itemType', e.target.value)}
                      placeholder="e.g., Bedding, Cooking"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input
                      value={item.itemName}
                      onChange={(e) => updateNFIItem(index, 'itemName', e.target.value)}
                      placeholder="e.g., Blankets, Stove"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quantity Needed</Label>
                    <Input
                      type="number"
                      value={item.quantityNeeded}
                      onChange={(e) => updateNFIItem(index, 'quantityNeeded', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={item.priority} 
                      onValueChange={(value) => updateNFIItem(index, 'priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority Badge</Label>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Reason/Justification</Label>
                  <Textarea
                    value={item.reason}
                    onChange={(e) => updateNFIItem(index, 'reason', e.target.value)}
                    placeholder="Explain why this item is needed..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safety Hazards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Safety Hazards
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addHazard}>
                <Plus className="h-4 w-4" />
                Add Hazard
              </Button>
            </CardTitle>
            <CardDescription>
              Document any safety hazards present in or around the shelter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hazards.map((hazard, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Safety Hazard {index + 1}</h4>
                  {hazards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHazard(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Hazard Type</Label>
                    <Select 
                      value={hazard.hazardType} 
                      onValueChange={(value) => updateHazard(index, 'hazardType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STRUCTURAL">Structural</SelectItem>
                        <SelectItem value="FIRE">Fire</SelectItem>
                        <SelectItem value="FLOOD">Flood</SelectItem>
                        <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Severity Level</Label>
                    <Select 
                      value={hazard.severity} 
                      onValueChange={(value) => updateHazard(index, 'severity', value)}
                    >
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
                  
                  <div className="space-y-2">
                    <Label>Severity Badge</Label>
                    <Badge className={getSeverityColor(hazard.severity)}>
                      {hazard.severity} Risk
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={hazard.description}
                    onChange={(e) => updateHazard(index, 'description', e.target.value)}
                    placeholder="Describe the hazard and its potential impact..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-teal-600" />
              Accessibility Assessment
            </CardTitle>
            <CardDescription>
              Evaluate accessibility for persons with disabilities and vulnerable groups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={accessibility.wheelchairAccessible}
                    onCheckedChange={(checked) => setAccessibility({ ...accessibility, wheelchairAccessible: checked as boolean })}
                  />
                  <Label>Wheelchair Accessible</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={accessibility.elderlyFriendly}
                    onCheckedChange={(checked) => setAccessibility({ ...accessibility, elderlyFriendly: checked as boolean })}
                  />
                  <Label>Elderly-Friendly</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={accessibility.childSafe}
                    onCheckedChange={(checked) => setAccessibility({ ...accessibility, childSafe: checked as boolean })}
                  />
                  <Label>Child-Safe Environment</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Specific Disability Accommodations</Label>
              <Textarea
                value={accessibility.disabilityAccommodations.join(', ')}
                onChange={(e) => setAccessibility({ 
                  ...accessibility, 
                  disabilityAccommodations: e.target.value.split(',').map(item => item.trim()).filter(item => item) 
                })}
                placeholder="List specific accommodations (comma separated)..."
                className="min-h-[80px]"
              />
            </div>
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
              Specific recommendations to improve shelter conditions
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
              Any additional observations or comments about the shelter conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional observations, environmental factors, or recommendations..."
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
            {loading ? 'Saving Assessment...' : 'Complete Shelter Assessment'}
          </Button>
        </div>
      </form>
    </div>
  )
}