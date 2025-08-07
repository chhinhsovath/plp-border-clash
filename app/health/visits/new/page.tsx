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
  Heart,
  User,
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  AlertCircle,
  CheckCircle,
  Activity,
  Thermometer,
  Clock,
  Search,
  Plus,
  X,
  Users,
  Trash2
} from 'lucide-react'

interface Individual {
  id: string
  individualCode: string
  fullLegalName: string
  age: number
  gender: string
  chronicallyIll: boolean
  illnessDetails?: string
}

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
}

// Common ICD-10 codes for refugee/IDP settings
const commonDiagnoses = [
  { code: 'A09', desc: 'Diarrhea and gastroenteritis' },
  { code: 'J06.9', desc: 'Acute upper respiratory infection' },
  { code: 'J18.9', desc: 'Pneumonia' },
  { code: 'B34.9', desc: 'Viral infection' },
  { code: 'A90', desc: 'Dengue fever' },
  { code: 'B50', desc: 'Malaria' },
  { code: 'E86', desc: 'Dehydration' },
  { code: 'L08.9', desc: 'Skin and soft tissue infection' },
  { code: 'R50.9', desc: 'Fever' },
  { code: 'R51', desc: 'Headache' },
  { code: 'K52.9', desc: 'Gastroenteritis' },
  { code: 'N39.0', desc: 'Urinary tract infection' },
  { code: 'H10.9', desc: 'Conjunctivitis' },
  { code: 'E46', desc: 'Malnutrition' },
  { code: 'F43.9', desc: 'Stress and adjustment disorder' },
  // Chronic conditions
  { code: 'E11', desc: 'Type 2 diabetes' },
  { code: 'I10', desc: 'Hypertension' },
  { code: 'J44', desc: 'COPD' },
  { code: 'J45', desc: 'Asthma' },
  { code: 'G40', desc: 'Epilepsy' }
]

const commonSymptoms = [
  'Fever', 'Cough', 'Headache', 'Diarrhea', 'Vomiting', 'Abdominal pain',
  'Chest pain', 'Shortness of breath', 'Skin rash', 'Joint pain', 'Fatigue',
  'Loss of appetite', 'Sore throat', 'Runny nose', 'Body aches', 'Dizziness',
  'Nausea', 'Weakness', 'Dehydration', 'Difficulty sleeping'
]

const commonMedications = [
  { name: 'Paracetamol', dosages: ['500mg', '250mg', '120mg/5ml'] },
  { name: 'Amoxicillin', dosages: ['500mg', '250mg', '125mg/5ml'] },
  { name: 'ORS (Oral Rehydration Salts)', dosages: ['1 sachet'] },
  { name: 'Ibuprofen', dosages: ['400mg', '200mg', '100mg/5ml'] },
  { name: 'Metronidazole', dosages: ['500mg', '250mg'] },
  { name: 'Albendazole', dosages: ['400mg', '200mg'] },
  { name: 'Artemether/Lumefantrine', dosages: ['20/120mg'] },
  { name: 'Vitamin A', dosages: ['200,000 IU', '100,000 IU'] },
  { name: 'Iron + Folic Acid', dosages: ['60mg/400mcg'] },
  { name: 'Zinc', dosages: ['20mg', '10mg'] }
]

export default function ClinicalVisitForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Individual[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Individual | null>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  
  const [formData, setFormData] = useState({
    individualId: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: new Date().toTimeString().slice(0, 5),
    symptoms: '',
    temperature: '',
    bloodPressure: '',
    pulse: '',
    respiratoryRate: '',
    weight: '',
    diagnosis: '',
    diagnosisDesc: '',
    treatmentPlan: '',
    clinicianName: '',
    followUpDate: '',
    admitToWard: false,
    referToHospital: false,
    referralReason: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
  }, [router])

  const searchPatients = async () => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/registration/individuals?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  const selectPatient = (patient: Individual) => {
    setSelectedPatient(patient)
    setFormData({ ...formData, individualId: patient.id })
    setSearchResults([])
    setSearchTerm('')
  }

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom))
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom])
    }
  }

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }])
  }

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const calculateVitalSigns = () => {
    const temp = parseFloat(formData.temperature)
    const pulse = parseInt(formData.pulse)
    const resp = parseInt(formData.respiratoryRate)
    
    let alerts = []
    if (temp > 38.5) alerts.push('High fever')
    if (temp < 35.5 && temp > 0) alerts.push('Hypothermia')
    if (pulse > 100) alerts.push('Tachycardia')
    if (pulse < 60 && pulse > 0) alerts.push('Bradycardia')
    if (resp > 24) alerts.push('Tachypnea')
    
    return alerts
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.individualId || !formData.diagnosis) {
        throw new Error('Please select a patient and provide diagnosis')
      }

      const visitDateTime = `${formData.visitDate}T${formData.visitTime}`
      const symptomsText = selectedSymptoms.join(', ') + (formData.symptoms ? `, ${formData.symptoms}` : '')

      const response = await fetch('/api/health/clinical-visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          individualId: formData.individualId,
          visitDate: visitDateTime,
          symptoms: symptomsText,
          diagnosis: formData.diagnosis,
          diagnosisDesc: formData.diagnosisDesc,
          treatmentPlan: formData.treatmentPlan,
          medications: medications.filter(m => m.name),
          clinicianName: formData.clinicianName,
          followUpDate: formData.followUpDate,
          vitalSigns: {
            temperature: formData.temperature,
            bloodPressure: formData.bloodPressure,
            pulse: formData.pulse,
            respiratoryRate: formData.respiratoryRate,
            weight: formData.weight
          },
          admitToWard: formData.admitToWard,
          referToHospital: formData.referToHospital,
          referralReason: formData.referralReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record clinical visit')
      }

      setMessage({ 
        type: 'success', 
        text: `Clinical visit recorded successfully for ${selectedPatient?.fullLegalName}` 
      })
      
      setTimeout(() => {
        router.push('/health/visits')
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const vitalAlerts = calculateVitalSigns()

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
                onClick={() => router.push('/health')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="h-6 w-6 text-green-600" />
                  Clinical Visit Form
                </h1>
                <p className="text-sm text-gray-500">
                  Record patient consultation and treatment
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedPatient}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Visit'}
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
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Patient Information
            </CardTitle>
            <CardDescription>
              Search and select patient for clinical visit
            </CardDescription>
          </CardHeader>
          <CardContent>
          {!selectedPatient ? (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Patient *
              </Label>
              <div className="relative max-w-md">
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    searchPatients()
                  }}
                  placeholder="Search by name or ID..."
                />
                
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {searchResults.map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => selectPatient(patient)}
                        className="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{patient.fullLegalName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {patient.individualCode} • {patient.gender} • Age {patient.age}
                          {patient.chronicallyIll && ' • Chronic condition'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="text-lg font-semibold text-blue-900">
                  {selectedPatient.fullLegalName}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {selectedPatient.individualCode} • {selectedPatient.gender} • Age {selectedPatient.age}
                </div>
                {selectedPatient.chronicallyIll && (
                  <Badge variant="secondary" className="mt-2">
                    Chronic: {selectedPatient.illnessDetails}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null)
                  setFormData({ ...formData, individualId: '' })
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Change Patient
              </Button>
            </div>
          )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Vital Signs & Symptoms */}
          <div className="space-y-6">
            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-600" />
                  Vital Signs
                </CardTitle>
                <CardDescription>
                  Record patient's vital signs and measurements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              
              {vitalAlerts.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Abnormal Vital Signs:</strong> {vitalAlerts.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature (°C)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    placeholder="37.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Blood Pressure</Label>
                  <Input
                    value={formData.bloodPressure}
                    onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                    placeholder="120/80"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Pulse (bpm)
                  </Label>
                  <Input
                    type="number"
                    value={formData.pulse}
                    onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                    placeholder="72"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resp. Rate (/min)</Label>
                  <Input
                    type="number"
                    value={formData.respiratoryRate}
                    onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                    placeholder="16"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="Enter weight"
                  />
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Symptoms */}
            <Card>
              <CardHeader>
                <CardTitle>Presenting Symptoms</CardTitle>
                <CardDescription>
                  Select common symptoms or add custom ones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map(symptom => (
                    <Button
                      key={symptom}
                      type="button"
                      variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSymptom(symptom)}
                      className={`rounded-full ${selectedSymptoms.includes(symptom) 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {symptom}
                    </Button>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label>Additional Symptoms</Label>
                  <Textarea
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    placeholder="Additional symptoms or details..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Diagnosis & Treatment */}
          <div className="space-y-6">
            {/* Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Diagnosis
                </CardTitle>
                <CardDescription>
                  Select ICD-10 diagnosis and add clinical notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ICD-10 Code *</Label>
                  <Select 
                    value={formData.diagnosis} 
                    onValueChange={(value) => {
                      const selected = commonDiagnoses.find(d => d.code === value)
                      setFormData({ 
                        ...formData, 
                        diagnosis: value,
                        diagnosisDesc: selected?.desc || ''
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagnosis" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonDiagnoses.map(diag => (
                        <SelectItem key={diag.code} value={diag.code}>
                          {diag.code} - {diag.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Clinical Notes</Label>
                  <Textarea
                    value={formData.diagnosisDesc}
                    onChange={(e) => setFormData({ ...formData, diagnosisDesc: e.target.value })}
                    placeholder="Additional diagnostic notes..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Treatment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-green-600" />
                  Treatment Plan
                </CardTitle>
                <CardDescription>
                  Treatment instructions and medications prescribed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Treatment Instructions *</Label>
                  <Textarea
                    value={formData.treatmentPlan}
                    onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                    placeholder="Rest, fluids, medication regimen, etc..."
                    required
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Medications</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMedication}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Medication
                    </Button>
                  </div>

                {medications.map((med, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                      <Input
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        placeholder="Medication name"
                        list="medications"
                        className="text-sm"
                      />
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className="text-sm"
                      />
                      <Input
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="Frequency"
                        className="text-sm"
                      />
                      <Input
                        value={med.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="Duration"
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                </div>

                <datalist id="medications">
                  {commonMedications.map(med => 
                    med.dosages.map(dose => (
                      <option key={`${med.name}-${dose}`} value={med.name} />
                    ))
                  )}
                </datalist>
              </CardContent>
            </Card>

            {/* Follow-up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Follow-up & Referral
                </CardTitle>
                <CardDescription>
                  Schedule follow-up and manage referrals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Clinician Name *</Label>
                    <Input
                      value={formData.clinicianName}
                      onChange={(e) => setFormData({ ...formData, clinicianName: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="admit-ward"
                      checked={formData.admitToWard}
                      onCheckedChange={(checked) => setFormData({ ...formData, admitToWard: checked as boolean })}
                    />
                    <Label htmlFor="admit-ward" className="cursor-pointer">
                      Admit to Ward
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="refer-hospital"
                      checked={formData.referToHospital}
                      onCheckedChange={(checked) => setFormData({ ...formData, referToHospital: checked as boolean })}
                    />
                    <Label htmlFor="refer-hospital" className="cursor-pointer">
                      Refer to Hospital
                    </Label>
                  </div>

                  {formData.referToHospital && (
                    <div className="space-y-2">
                      <Label>Referral Reason</Label>
                      <Textarea
                        value={formData.referralReason}
                        onChange={(e) => setFormData({ ...formData, referralReason: e.target.value })}
                        placeholder="Reason for referral..."
                        className="min-h-[60px]"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}