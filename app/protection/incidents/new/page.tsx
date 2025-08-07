'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  Shield,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Phone,
  AlertCircle,
  CheckCircle,
  UserX,
  ChevronRight,
  Send
} from 'lucide-react'

interface Individual {
  id: string
  individualCode: string
  fullLegalName: string
  age: number
  gender: string
}

export default function ProtectionIncidentReport() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredIndividuals, setFilteredIndividuals] = useState<Individual[]>([])
  
  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    incidentType: '',
    location: '',
    description: '',
    victimId: '',
    victimSearch: '',
    perpetratorId: '',
    perpetratorSearch: '',
    perpetratorDesc: '',
    isPerpetrator Known: false,
    referralStatus: '',
    actionTaken: '',
    followUpNotes: '',
    urgentResponse: false,
    confidential: true
  })

  const incidentTypes = [
    { value: 'SGBV', label: 'Sexual and Gender-Based Violence', severity: 'critical' },
    { value: 'PHYSICAL_ASSAULT', label: 'Physical Assault', severity: 'high' },
    { value: 'TRAFFICKING', label: 'Human Trafficking', severity: 'critical' },
    { value: 'CHILD_ABUSE', label: 'Child Abuse', severity: 'critical' },
    { value: 'HARASSMENT', label: 'Harassment', severity: 'medium' },
    { value: 'THEFT', label: 'Theft', severity: 'low' },
    { value: 'OTHER', label: 'Other', severity: 'medium' }
  ]

  const referralOptions = [
    { value: 'REFERRED_HEALTH', label: 'Referred to Health Team', icon: '🏥' },
    { value: 'REFERRED_POLICE', label: 'Referred to Police/Security', icon: '👮' },
    { value: 'REFERRED_LEGAL', label: 'Referred to Legal Aid', icon: '⚖️' },
    { value: 'REFERRED_PSYCHOSOCIAL', label: 'Referred to Psychosocial Support', icon: '🧠' },
    { value: 'NO_REFERRAL', label: 'No Referral Needed', icon: '✓' }
  ]

  const commonLocations = [
    'Water Point A', 'Water Point B', 'Water Point C',
    'Distribution Center', 'Market Area', 'Health Clinic',
    'Community Center', 'School', 'Latrines - Zone A',
    'Latrines - Zone B', 'Camp Entrance', 'Registration Area',
    'Women\'s Safe Space', 'Child Friendly Space'
  ]

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    
    fetchIndividuals()
  }, [router])

  const fetchIndividuals = async () => {
    try {
      const response = await fetch('/api/registration/individuals?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setIndividuals(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching individuals:', error)
    }
  }

  const searchIndividuals = (search: string, field: 'victim' | 'perpetrator') => {
    if (search.length < 2) {
      setFilteredIndividuals([])
      return
    }

    const filtered = individuals.filter(ind => 
      ind.fullLegalName.toLowerCase().includes(search.toLowerCase()) ||
      ind.individualCode.toLowerCase().includes(search.toLowerCase())
    )
    
    setFilteredIndividuals(filtered.slice(0, 5))
  }

  const selectIndividual = (individual: Individual, type: 'victim' | 'perpetrator') => {
    if (type === 'victim') {
      setFormData({
        ...formData,
        victimId: individual.id,
        victimSearch: `${individual.fullLegalName} (${individual.individualCode})`
      })
    } else {
      setFormData({
        ...formData,
        perpetratorId: individual.id,
        perpetratorSearch: `${individual.fullLegalName} (${individual.individualCode})`,
        isPerpetrator Known: true
      })
    }
    setFilteredIndividuals([])
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // Validate required fields
      if (!formData.dateTime || !formData.incidentType || !formData.location || !formData.victimId) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/protection/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          dateTime: formData.dateTime,
          incidentType: formData.incidentType,
          location: formData.location,
          description: formData.description,
          victimId: formData.victimId,
          perpetratorId: formData.isPerpetrator Known ? formData.perpetratorId : null,
          perpetratorDesc: !formData.isPerpetrator Known ? formData.perpetratorDesc : null,
          referralStatus: formData.referralStatus,
          actionTaken: formData.actionTaken,
          followUpNotes: formData.followUpNotes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report incident')
      }

      setMessage({ 
        type: 'success', 
        text: `Incident reported successfully. Reference: ${data.data.incidentCode}` 
      })
      
      // Clear form after successful submission
      setTimeout(() => {
        router.push('/protection/incidents')
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#f59e0b'
      case 'low': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 30px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => router.push('/protection')}
              style={{
                padding: '10px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280'
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={24} style={{ color: '#dc2626' }} />
                Protection Incident Report
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Report and document protection incidents for immediate response
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Send size={18} />
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>

      {/* Confidentiality Notice */}
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '15px 30px',
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <AlertCircle size={20} style={{ color: '#92400e' }} />
        <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
          <strong>Confidential:</strong> This form contains sensitive protection information. 
          Handle with care and ensure victim safety and consent.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px',
          padding: '15px 30px',
          borderRadius: '8px',
          background: message.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Left Column - Incident Details */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '25px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                Incident Details
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Incident Type *
                    </label>
                    <select
                      value={formData.incidentType}
                      onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">Select type</option>
                      {incidentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Location of Incident *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter or select location"
                    required
                    list="locations"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <datalist id="locations">
                    {commonLocations.map(loc => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Description of Incident *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide detailed description of what happened..."
                    required
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  background: '#fee2e2',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.urgentResponse}
                    onChange={(e) => setFormData({ ...formData, urgentResponse: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#991b1b' }}>
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px' }} />
                    Urgent Response Required
                  </span>
                </label>
              </div>
            </div>

            {/* Referral and Action */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '25px',
              marginTop: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                Referral & Response
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '12px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Referral Status
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {referralOptions.map(option => (
                      <label
                        key={option.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: formData.referralStatus === option.value ? '#eff6ff' : 'white'
                        }}
                      >
                        <input
                          type="radio"
                          name="referral"
                          value={option.value}
                          checked={formData.referralStatus === option.value}
                          onChange={(e) => setFormData({ ...formData, referralStatus: e.target.value })}
                        />
                        <span style={{ fontSize: '16px' }}>{option.icon}</span>
                        <span style={{ fontSize: '14px' }}>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Immediate Action Taken
                  </label>
                  <textarea
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    placeholder="Describe any immediate actions taken..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Follow-up Notes
                  </label>
                  <textarea
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                    placeholder="Any follow-up requirements or notes..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - People Involved */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '25px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                People Involved
              </h2>

              {/* Victim Information */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Victim/Survivor *
                </label>
                <input
                  type="text"
                  value={formData.victimSearch}
                  onChange={(e) => {
                    setFormData({ ...formData, victimSearch: e.target.value })
                    searchIndividuals(e.target.value, 'victim')
                  }}
                  placeholder="Search by name or ID..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                
                {/* Search Results */}
                {filteredIndividuals.length > 0 && formData.victimSearch && (
                  <div style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '400px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {filteredIndividuals.map(ind => (
                      <div
                        key={ind.id}
                        onClick={() => selectIndividual(ind, 'victim')}
                        style={{
                          padding: '10px',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f3f4f6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {ind.fullLegalName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {ind.individualCode} • {ind.gender} • Age {ind.age}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.victimId && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    Selected: {formData.victimSearch}
                  </div>
                )}
              </div>

              {/* Perpetrator Information */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <UserX size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Alleged Perpetrator
                </label>

                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}>
                    <input
                      type="radio"
                      name="perpKnown"
                      checked={formData.isPerpetrator Known}
                      onChange={() => setFormData({ ...formData, isPerpetrator Known: true })}
                    />
                    <span style={{ fontSize: '14px' }}>Known Individual (in database)</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="perpKnown"
                      checked={!formData.isPerpetrator Known}
                      onChange={() => setFormData({ ...formData, isPerpetrator Known: false, perpetratorId: '' })}
                    />
                    <span style={{ fontSize: '14px' }}>Unknown / Description Only</span>
                  </label>
                </div>

                {formData.isPerpetrator Known ? (
                  <div>
                    <input
                      type="text"
                      value={formData.perpetratorSearch}
                      onChange={(e) => {
                        setFormData({ ...formData, perpetratorSearch: e.target.value })
                        searchIndividuals(e.target.value, 'perpetrator')
                      }}
                      placeholder="Search perpetrator by name or ID..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    
                    {formData.perpetratorId && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#fee2e2',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}>
                        Selected: {formData.perpetratorSearch}
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={formData.perpetratorDesc}
                    onChange={(e) => setFormData({ ...formData, perpetratorDesc: e.target.value })}
                    placeholder="Describe the perpetrator (physical appearance, relationship to victim, etc.)"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                )}
              </div>
            </div>

            {/* Incident Severity Indicator */}
            {formData.incidentType && (() => {
              const incident = incidentTypes.find(t => t.value === formData.incidentType)
              if (!incident) return null
              
              const getBadgeVariant = (severity: string) => {
                switch(severity) {
                  case 'critical': return 'destructive'
                  case 'high': return 'destructive'
                  case 'medium': return 'secondary'
                  case 'low': return 'outline'
                  default: return 'secondary'
                }
              }
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Incident Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {incident.label}
                      </div>
                      <Badge variant={getBadgeVariant(incident.severity)}>
                        {incident.severity.toUpperCase()} SEVERITY
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}