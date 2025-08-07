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
  Baby,
  Search,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Ruler,
  Weight,
  AlertTriangle,
  Heart,
  Calendar
} from 'lucide-react'

interface Child {
  id: string
  individualCode: string
  fullLegalName: string
  age: number
  gender: string
  dateOfBirth: string
}

interface NutritionAssessment {
  weight: number
  height: number
  muac: number
  edema: boolean
  weightForAge?: string
  heightForAge?: string
  weightForHeight?: string
  nutritionStatus: 'NORMAL' | 'MAM' | 'SAM' | 'AT_RISK'
}

// WHO Growth Standards Z-scores
const calculateZScores = (weight: number, height: number, age: number, gender: string) => {
  // Simplified Z-score calculation (in production, use WHO standards tables)
  const weightForAge = ((weight - (age * 2 + 8)) / 2).toFixed(1)
  const heightForAge = ((height - (age * 6 + 75)) / 5).toFixed(1)
  const bmi = weight / Math.pow(height / 100, 2)
  const weightForHeight = ((bmi - 18) / 2).toFixed(1)
  
  return {
    weightForAge,
    heightForAge, 
    weightForHeight
  }
}

const getNutritionStatus = (muac: number, zScores: any, edema: boolean): string => {
  // MUAC criteria
  if (muac < 115 || edema) return 'SAM' // Severe Acute Malnutrition
  if (muac < 125) return 'MAM' // Moderate Acute Malnutrition
  
  // Z-score criteria
  if (parseFloat(zScores.weightForHeight) < -3) return 'SAM'
  if (parseFloat(zScores.weightForHeight) < -2) return 'MAM'
  if (parseFloat(zScores.weightForHeight) < -1) return 'AT_RISK'
  
  return 'NORMAL'
}

export default function NutritionAssessmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [previousAssessments, setPreviousAssessments] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    individualId: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    muac: '',
    edema: false,
    appetiteTest: '',
    medicalComplications: false,
    complicationDetails: '',
    referralNeeded: false,
    referralType: '',
    assessorName: '',
    notes: ''
  })

  const [nutritionIndicators, setNutritionIndicators] = useState<NutritionAssessment | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
  }, [router])

  useEffect(() => {
    // Calculate nutrition indicators when measurements change
    if (formData.weight && formData.height && formData.muac && selectedChild) {
      const weight = parseFloat(formData.weight)
      const height = parseFloat(formData.height)
      const muac = parseFloat(formData.muac)
      const age = selectedChild.age
      
      const zScores = calculateZScores(weight, height, age, selectedChild.gender)
      const status = getNutritionStatus(muac, zScores, formData.edema)
      
      setNutritionIndicators({
        weight,
        height,
        muac,
        edema: formData.edema,
        weightForAge: zScores.weightForAge,
        heightForAge: zScores.heightForAge,
        weightForHeight: zScores.weightForHeight,
        nutritionStatus: status as any
      })
      
      // Auto-set referral if SAM detected
      if (status === 'SAM') {
        setFormData(prev => ({
          ...prev,
          referralNeeded: true,
          referralType: 'THERAPEUTIC_FEEDING'
        }))
      }
    }
  }, [formData.weight, formData.height, formData.muac, formData.edema, selectedChild])

  const searchChildren = async () => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    try {
      // Search for children under 5 years
      const response = await fetch(`/api/registration/individuals?search=${searchTerm}&maxAge=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data?.filter((ind: any) => ind.age < 5) || [])
      }
    } catch (error) {
      console.error('Error searching children:', error)
    }
  }

  const selectChild = async (child: Child) => {
    setSelectedChild(child)
    setFormData({ ...formData, individualId: child.id })
    setSearchResults([])
    setSearchTerm('')
    
    // Fetch previous assessments
    try {
      const response = await fetch(`/api/nutrition/assessments?individualId=${child.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreviousAssessments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching previous assessments:', error)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.individualId || !formData.weight || !formData.height || !formData.muac) {
        throw new Error('Please complete all required measurements')
      }

      const response = await fetch('/api/nutrition/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          muac: parseFloat(formData.muac),
          ageAtAssessment: selectedChild?.age,
          nutritionStatus: nutritionIndicators?.nutritionStatus,
          zScores: {
            weightForAge: nutritionIndicators?.weightForAge,
            heightForAge: nutritionIndicators?.heightForAge,
            weightForHeight: nutritionIndicators?.weightForHeight
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record assessment')
      }

      setMessage({ 
        type: 'success', 
        text: `Nutrition assessment completed for ${selectedChild?.fullLegalName}. Status: ${nutritionIndicators?.nutritionStatus}` 
      })
      
      // Reset form after successful submission
      setTimeout(() => {
        if (nutritionIndicators?.nutritionStatus === 'SAM' || nutritionIndicators?.nutritionStatus === 'MAM') {
          if (window.confirm('Would you like to refer this child to a feeding program?')) {
            router.push(`/nutrition/referrals/new?childId=${selectedChild?.id}`)
          }
        } else {
          router.push('/nutrition/assessments')
        }
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status?: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch(status) {
      case 'NORMAL': return 'default'
      case 'AT_RISK': return 'secondary'
      case 'MAM': return 'outline'
      case 'SAM': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'NORMAL': return 'text-green-600'
      case 'AT_RISK': return 'text-yellow-600'
      case 'MAM': return 'text-orange-600'
      case 'SAM': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getMUACColorClass = (muac: number) => {
    if (muac >= 135) return 'border-green-500'
    if (muac >= 125) return 'border-yellow-500'
    if (muac >= 115) return 'border-orange-500'
    return 'border-red-500'
  }

  const getMUACTextColor = (muac: number) => {
    if (muac >= 135) return 'text-green-600'
    if (muac >= 125) return 'text-yellow-600'
    if (muac >= 115) return 'text-orange-600'
    return 'text-red-600'
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
                onClick={() => router.push('/nutrition')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Baby className="h-6 w-6 text-pink-600" />
                  Nutrition Assessment
                </h1>
                <p className="text-sm text-gray-500">
                  Screen children under 5 for malnutrition
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedChild || !nutritionIndicators}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </div>
      </div>

      {/* Alert for SAM/MAM */}
      {nutritionIndicators && (nutritionIndicators.nutritionStatus === 'SAM' || nutritionIndicators.nutritionStatus === 'MAM') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className={nutritionIndicators.nutritionStatus === 'SAM' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
            <AlertTriangle className={`h-4 w-4 ${nutritionIndicators.nutritionStatus === 'SAM' ? 'text-red-600' : 'text-orange-600'}`} />
            <AlertDescription>
              <strong className={nutritionIndicators.nutritionStatus === 'SAM' ? 'text-red-900' : 'text-orange-900'}>
                {nutritionIndicators.nutritionStatus === 'SAM' ? 'Severe Acute Malnutrition Detected' : 'Moderate Acute Malnutrition Detected'}
              </strong>
              <div className="text-sm mt-1">
                Immediate referral to {nutritionIndicators.nutritionStatus === 'SAM' ? 'therapeutic' : 'supplementary'} feeding program required
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Child Selection & History */}
          <div className="space-y-6">
            {/* Child Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Child</CardTitle>
                <CardDescription>
                  Search for children under 5 years
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedChild ? (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search Child (Under 5) *
                    </Label>
                    <div className="relative">
                      <Input
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          searchChildren()
                        }}
                        placeholder="Search by name or ID..."
                      />
                      
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {searchResults.map(child => (
                            <div
                              key={child.id}
                              onClick={() => selectChild(child)}
                              className="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{child.fullLegalName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {child.individualCode} • {child.gender} • Age: {child.age} years
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                      <div className="text-lg font-semibold text-pink-900">
                        {selectedChild.fullLegalName}
                      </div>
                      <div className="text-sm text-pink-700 mt-1">
                        {selectedChild.individualCode} • {selectedChild.gender} • Age: {selectedChild.age} years
                      </div>
                      <div className="text-xs text-pink-700 mt-1">
                        DOB: {new Date(selectedChild.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedChild(null)
                        setFormData({ ...formData, individualId: '' })
                        setNutritionIndicators(null)
                        setPreviousAssessments([])
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Change Child
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous Assessments */}
            {previousAssessments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Previous Assessments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {previousAssessments.slice(0, 3).map((assessment, index) => (
                    <div
                      key={assessment.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                          {new Date(assessment.assessmentDate).toLocaleDateString()}
                        </span>
                        <Badge variant={getStatusVariant(assessment.nutritionStatus)}>
                          {assessment.nutritionStatus}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        Weight: {assessment.weight}kg • Height: {assessment.height}cm • MUAC: {assessment.muacScore}mm
                      </div>
                      {index === 0 && previousAssessments.length > 1 && (
                        <div className="mt-2 text-xs">
                          {assessment.weight > previousAssessments[1].weight ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Weight gain: +{(assessment.weight - previousAssessments[1].weight).toFixed(1)}kg
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Weight loss: {(assessment.weight - previousAssessments[1].weight).toFixed(1)}kg
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Measurements & Assessment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Anthropometric Measurements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Anthropometric Measurements
                </CardTitle>
                <CardDescription>
                  Record child's physical measurements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      Weight (kg) *
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="0.0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Height (cm) *
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="0.0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      MUAC (mm) *
                    </Label>
                    <Input
                      type="number"
                      value={formData.muac}
                      onChange={(e) => setFormData({ ...formData, muac: e.target.value })}
                      placeholder="0"
                      className={`border-2 ${formData.muac ? getMUACColorClass(parseFloat(formData.muac)) : ''}`}
                      required
                    />
                    {formData.muac && (
                      <div className={`text-xs ${getMUACTextColor(parseFloat(formData.muac))}`}>
                        {parseFloat(formData.muac) < 115 ? 'Severe (Red)' :
                         parseFloat(formData.muac) < 125 ? 'Moderate (Orange)' :
                         parseFloat(formData.muac) < 135 ? 'At Risk (Yellow)' : 'Normal (Green)'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edema"
                    checked={formData.edema}
                    onCheckedChange={(checked) => setFormData({ ...formData, edema: checked as boolean })}
                  />
                  <Label htmlFor="edema" className="cursor-pointer font-medium">
                    Bilateral Pitting Edema Present
                  </Label>
                  {formData.edema && (
                    <Badge variant="destructive">
                      Automatic SAM
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Status */}
            {nutritionIndicators && (
              <Card>
                <CardHeader>
                  <CardTitle>Nutrition Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg border-2 ${
                    nutritionIndicators.nutritionStatus === 'SAM' ? 'bg-red-50 border-red-300' :
                    nutritionIndicators.nutritionStatus === 'MAM' ? 'bg-orange-50 border-orange-300' :
                    nutritionIndicators.nutritionStatus === 'AT_RISK' ? 'bg-yellow-50 border-yellow-300' :
                    'bg-green-50 border-green-300'
                  }`}>
                    <div className={`text-2xl font-bold ${getStatusColor(nutritionIndicators.nutritionStatus)}`}>
                      {nutritionIndicators.nutritionStatus}
                    </div>
                    <div className="text-sm text-gray-700 mt-2">
                      {nutritionIndicators.nutritionStatus === 'SAM' && 'Severe Acute Malnutrition - Immediate intervention required'}
                      {nutritionIndicators.nutritionStatus === 'MAM' && 'Moderate Acute Malnutrition - Supplementary feeding recommended'}
                      {nutritionIndicators.nutritionStatus === 'AT_RISK' && 'At Risk - Close monitoring required'}
                      {nutritionIndicators.nutritionStatus === 'NORMAL' && 'Normal nutritional status'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Weight-for-Age</div>
                      <div className="text-lg font-semibold">{nutritionIndicators.weightForAge} SD</div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Height-for-Age</div>
                      <div className="text-lg font-semibold">{nutritionIndicators.heightForAge} SD</div>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Weight-for-Height</div>
                      <div className="text-lg font-semibold">{nutritionIndicators.weightForHeight} SD</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Assessment</CardTitle>
                <CardDescription>
                  Complete assessment details and observations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Appetite Test Result</Label>
                  <Select value={formData.appetiteTest} onValueChange={(value) => setFormData({ ...formData, appetiteTest: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASS">Pass - Good appetite</SelectItem>
                      <SelectItem value="FAIL">Fail - Poor appetite</SelectItem>
                      <SelectItem value="NOT_TESTED">Not tested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="complications"
                      checked={formData.medicalComplications}
                      onCheckedChange={(checked) => setFormData({ ...formData, medicalComplications: checked as boolean })}
                    />
                    <Label htmlFor="complications" className="cursor-pointer font-medium">
                      Medical Complications Present
                    </Label>
                  </div>
                  
                  {formData.medicalComplications && (
                    <Textarea
                      value={formData.complicationDetails}
                      onChange={(e) => setFormData({ ...formData, complicationDetails: e.target.value })}
                      placeholder="Describe complications..."
                      className="min-h-[80px]"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assessor Name *</Label>
                  <Input
                    value={formData.assessorName}
                    onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional observations..."
                    className="min-h-[80px]"
                  />
                </div>

                {formData.referralNeeded && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <strong className="text-red-900">Referral Required</strong>
                      <Select 
                        value={formData.referralType} 
                        onValueChange={(value) => setFormData({ ...formData, referralType: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select referral type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THERAPEUTIC_FEEDING">Therapeutic Feeding Program (OTP/SC)</SelectItem>
                          <SelectItem value="SUPPLEMENTARY_FEEDING">Supplementary Feeding Program</SelectItem>
                          <SelectItem value="HEALTH_FACILITY">Health Facility</SelectItem>
                          <SelectItem value="HOSPITAL">Hospital Admission</SelectItem>
                        </SelectContent>
                      </Select>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}