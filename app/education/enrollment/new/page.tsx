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
import { 
  ArrowLeft,
  Save,
  GraduationCap,
  User,
  Search,
  Calendar,
  School,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Users,
  MapPin,
  Clock,
  Award,
  AlertTriangle,
  XCircle
} from 'lucide-react'

interface Child {
  id: string
  individualCode: string
  fullLegalName: string
  age: number
  gender: string
  dateOfBirth: string
  householdId: string
}

const gradesByAge = {
  5: 'Kindergarten',
  6: 'Grade 1',
  7: 'Grade 2',
  8: 'Grade 3',
  9: 'Grade 4',
  10: 'Grade 5',
  11: 'Grade 6',
  12: 'Grade 7',
  13: 'Grade 8',
  14: 'Grade 9',
  15: 'Grade 10',
  16: 'Grade 11',
  17: 'Grade 12'
}

const nonEnrollmentReasons = [
  { value: 'CHILD_LABOR', label: 'Child Labor', severity: 'high' },
  { value: 'CARETAKER_DUTIES', label: 'Caretaker for Siblings/Family', severity: 'high' },
  { value: 'FEAR_SAFETY', label: 'Fear for Safety', severity: 'high' },
  { value: 'NO_SPACE', label: 'No Space in School', severity: 'medium' },
  { value: 'DISABILITY', label: 'Disability (No Support Available)', severity: 'high' },
  { value: 'PARENT_RELUCTANCE', label: 'Parent/Guardian Reluctance', severity: 'medium' },
  { value: 'DISTANCE', label: 'School Too Far', severity: 'medium' },
  { value: 'NO_DOCUMENTATION', label: 'Missing Documentation', severity: 'low' },
  { value: 'LANGUAGE_BARRIER', label: 'Language Barrier', severity: 'medium' },
  { value: 'ECONOMIC_HARDSHIP', label: 'Economic Hardship', severity: 'high' },
  { value: 'HEALTH_ISSUES', label: 'Health Issues', severity: 'high' },
  { value: 'EARLY_MARRIAGE', label: 'Early Marriage', severity: 'high' }
]

const learningSpaces = [
  { id: 'LS001', name: 'Primary School A', type: 'FORMAL', capacity: 200, enrolled: 150 },
  { id: 'LS002', name: 'Primary School B', type: 'FORMAL', capacity: 180, enrolled: 165 },
  { id: 'LS003', name: 'Community Learning Center', type: 'NON_FORMAL', capacity: 100, enrolled: 75 },
  { id: 'LS004', name: 'Child Friendly Space 1', type: 'INFORMAL', capacity: 50, enrolled: 40 },
  { id: 'LS005', name: 'Child Friendly Space 2', type: 'INFORMAL', capacity: 50, enrolled: 35 },
  { id: 'LS006', name: 'Accelerated Learning Program', type: 'ACCELERATED', capacity: 60, enrolled: 45 }
]

export default function EducationEnrollmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [enrollmentType, setEnrollmentType] = useState<'ENROLL' | 'NOT_ENROLL'>('ENROLL')
  
  const [formData, setFormData] = useState({
    individualId: '',
    academicYear: new Date().getFullYear().toString(),
    enrollmentStatus: 'ENROLLED',
    learningSpaceId: '',
    grade: '',
    lastGradeCompleted: '',
    previousSchool: '',
    nonEnrollmentReason: '',
    additionalReasons: '',
    supportNeeded: [] as string[],
    transportProvided: false,
    mealsProvided: false,
    uniformProvided: false,
    suppliesProvided: false,
    guardianConsent: false,
    enrollmentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
  }, [router])

  useEffect(() => {
    if (selectedChild && enrollmentType === 'ENROLL') {
      const suggestedGrade = gradesByAge[selectedChild.age as keyof typeof gradesByAge] || ''
      setFormData(prev => ({ ...prev, grade: suggestedGrade }))
    }
  }, [selectedChild, enrollmentType])

  const searchChildren = async () => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/registration/individuals?search=${searchTerm}&minAge=5&maxAge=18`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data?.filter((ind: any) => ind.age >= 5 && ind.age <= 18) || [])
      }
    } catch (error) {
      console.error('Error searching children:', error)
    }
  }

  const selectChild = (child: Child) => {
    setSelectedChild(child)
    setFormData({ ...formData, individualId: child.id })
    setSearchResults([])
    setSearchTerm('')
  }

  const toggleSupport = (support: string) => {
    if (formData.supportNeeded.includes(support)) {
      setFormData({
        ...formData,
        supportNeeded: formData.supportNeeded.filter(s => s !== support)
      })
    } else {
      setFormData({
        ...formData,
        supportNeeded: [...formData.supportNeeded, support]
      })
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.individualId) {
        throw new Error('Please select a child')
      }

      if (enrollmentType === 'ENROLL' && (!formData.learningSpaceId || !formData.grade)) {
        throw new Error('Please select learning space and grade')
      }

      if (enrollmentType === 'NOT_ENROLL' && !formData.nonEnrollmentReason) {
        throw new Error('Please provide reason for non-enrollment')
      }

      const submissionData = {
        ...formData,
        enrollmentStatus: enrollmentType === 'ENROLL' ? 'ENROLLED' : 'NOT_ENROLLED',
        childAge: selectedChild?.age,
        childName: selectedChild?.fullLegalName
      }

      const response = await fetch('/api/education/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submissionData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process enrollment')
      }

      setMessage({ 
        type: 'success', 
        text: enrollmentType === 'ENROLL' 
          ? `${selectedChild?.fullLegalName} successfully enrolled in ${formData.grade}`
          : `Non-enrollment documented for ${selectedChild?.fullLegalName}` 
      })
      
      setTimeout(() => {
        router.push('/education/enrollment')
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch(severity) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'default'
    }
  }

  const getSpaceTypeColor = (type: string) => {
    switch(type) {
      case 'FORMAL': return 'text-blue-600'
      case 'NON_FORMAL': return 'text-green-600'
      case 'INFORMAL': return 'text-purple-600'
      case 'ACCELERATED': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const calculateCapacityPercentage = (enrolled: number, capacity: number) => {
    return Math.round((enrolled / capacity) * 100)
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
                onClick={() => router.push('/education')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-indigo-600" />
                  Education Enrollment
                </h1>
                <p className="text-sm text-gray-500">
                  Enroll children in learning programs
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedChild}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Processing...' : 'Submit'}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Child Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Child Information
            </CardTitle>
            <CardDescription>
              Search and select child (ages 5-18) for enrollment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedChild ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Child *
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
                            {child.individualCode} • {child.gender} • Age: {child.age} • DOB: {new Date(child.dateOfBirth).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div>
                  <div className="text-lg font-semibold text-indigo-900">
                    {selectedChild.fullLegalName}
                  </div>
                  <div className="text-sm text-indigo-700 mt-1">
                    {selectedChild.individualCode} • {selectedChild.gender} • Age: {selectedChild.age} years
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    Suggested Grade: {gradesByAge[selectedChild.age as keyof typeof gradesByAge] || 'N/A'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedChild(null)
                    setFormData({ ...formData, individualId: '', grade: '' })
                  }}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Change Child
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrollment Type */}
        <Tabs value={enrollmentType} onValueChange={(value) => setEnrollmentType(value as 'ENROLL' | 'NOT_ENROLL')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ENROLL" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Enroll in School
            </TabsTrigger>
            <TabsTrigger value="NOT_ENROLL" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Not Enrolling
            </TabsTrigger>
          </TabsList>

          {/* Enrollment Tab */}
          <TabsContent value="ENROLL" className="space-y-6">
            {/* Learning Space Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5 text-green-600" />
                  Learning Space Selection
                </CardTitle>
                <CardDescription>
                  Choose appropriate learning space and grade level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Academic Year *</Label>
                    <Input
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      placeholder="2024"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Enrollment Date *</Label>
                    <Input
                      type="date"
                      value={formData.enrollmentDate}
                      onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Learning Space *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {learningSpaces.map(space => {
                      const percentage = calculateCapacityPercentage(space.enrolled, space.capacity)
                      const isSelected = formData.learningSpaceId === space.id
                      
                      return (
                        <div
                          key={space.id}
                          onClick={() => setFormData({ ...formData, learningSpaceId: space.id })}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">{space.name}</div>
                              <div className={`text-sm font-medium ${getSpaceTypeColor(space.type)}`}>
                                {space.type.replace('_', ' ')}
                              </div>
                            </div>
                            <Badge variant={percentage > 90 ? 'destructive' : percentage > 70 ? 'secondary' : 'default'}>
                              {percentage}% Full
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            {space.enrolled} / {space.capacity} students
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Grade Level *</Label>
                    <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(gradesByAge).map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Last Grade Completed</Label>
                    <Select value={formData.lastGradeCompleted} onValueChange={(value) => setFormData({ ...formData, lastGradeCompleted: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        {Object.values(gradesByAge).map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Previous School</Label>
                    <Input
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      placeholder="Name of previous school"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Support Services
                </CardTitle>
                <CardDescription>
                  Indicate support services being provided
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="transport"
                        checked={formData.transportProvided}
                        onCheckedChange={(checked) => setFormData({ ...formData, transportProvided: checked as boolean })}
                      />
                      <Label htmlFor="transport" className="cursor-pointer">
                        Transportation Provided
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="meals"
                        checked={formData.mealsProvided}
                        onCheckedChange={(checked) => setFormData({ ...formData, mealsProvided: checked as boolean })}
                      />
                      <Label htmlFor="meals" className="cursor-pointer">
                        School Meals Provided
                      </Label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="uniform"
                        checked={formData.uniformProvided}
                        onCheckedChange={(checked) => setFormData({ ...formData, uniformProvided: checked as boolean })}
                      />
                      <Label htmlFor="uniform" className="cursor-pointer">
                        Uniform Provided
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="supplies"
                        checked={formData.suppliesProvided}
                        onCheckedChange={(checked) => setFormData({ ...formData, suppliesProvided: checked as boolean })}
                      />
                      <Label htmlFor="supplies" className="cursor-pointer">
                        School Supplies Provided
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Support Needed</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Psychosocial Support', 'Special Education', 'Language Support', 'Remedial Classes', 'Counseling'].map(support => (
                      <Button
                        key={support}
                        type="button"
                        variant={formData.supportNeeded.includes(support) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSupport(support)}
                        className="rounded-full"
                      >
                        {support}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Checkbox
                    id="consent"
                    checked={formData.guardianConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, guardianConsent: checked as boolean })}
                  />
                  <Label htmlFor="consent" className="cursor-pointer font-medium text-green-900">
                    Guardian/Parent Consent Obtained
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Non-Enrollment Tab */}
          <TabsContent value="NOT_ENROLL" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Non-Enrollment Documentation
                </CardTitle>
                <CardDescription>
                  Document reasons for non-enrollment for follow-up
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Children not enrolled in school require immediate follow-up and intervention
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Primary Reason for Non-Enrollment *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nonEnrollmentReasons.map(reason => (
                      <div
                        key={reason.value}
                        onClick={() => setFormData({ ...formData, nonEnrollmentReason: reason.value })}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.nonEnrollmentReason === reason.value 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{reason.label}</span>
                          <Badge variant={getSeverityBadge(reason.severity) as any}>
                            {reason.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Details</Label>
                  <Textarea
                    value={formData.additionalReasons}
                    onChange={(e) => setFormData({ ...formData, additionalReasons: e.target.value })}
                    placeholder="Provide additional context about the barriers to education..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Support Required to Enable Enrollment</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Financial Support', 'Transportation', 'Documentation', 'Safety Assurance', 'Disability Support', 'Family Counseling'].map(support => (
                      <Button
                        key={support}
                        type="button"
                        variant={formData.supportNeeded.includes(support) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSupport(support)}
                        className="rounded-full"
                      >
                        {support}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional observations or comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}