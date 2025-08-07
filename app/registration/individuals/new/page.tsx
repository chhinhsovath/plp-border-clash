'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  User,
  Users,
  MapPin,
  Calendar,
  Phone,
  AlertCircle,
  Shield,
  Heart,
  Baby,
  Home,
  Activity,
  CheckCircle,
  ChevronRight
} from 'lucide-react'

interface Site {
  id: string
  siteCode: string
  name: string
}

interface Household {
  id: string
  householdCode: string
  size: number
}

export default function IndividualRegistration() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeTab, setActiveTab] = useState(0)
  
  // Form data
  const [formData, setFormData] = useState({
    // Basic Information
    fullLegalName: '',
    commonlyUsedName: '',
    dateOfBirth: '',
    gender: 'MALE',
    
    // Demographics
    nationality: '',
    ethnicGroup: '',
    motherTongue: '',
    preDisplacementAddress: '',
    villageOfOrigin: '',
    contactNumber: '',
    
    // Location
    currentSiteId: '',
    zoneBlock: '',
    shelterNumber: '',
    householdId: '',
    isHeadOfHousehold: false,
    createNewHousehold: true,
    
    // Vulnerability Indicators
    unaccompaniedMinor: false,
    separatedChild: false,
    singleHeadedHH: false,
    pregnant: false,
    pregnancyDueDate: '',
    lactatingMother: false,
    hasDisability: false,
    disabilityDetails: '',
    elderly: false,
    chronicallyIll: false,
    illnessDetails: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    
    // Fetch sites
    fetchSites()
    fetchHouseholds()
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

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const handleDateOfBirthChange = (value: string) => {
    setFormData(prev => {
      const age = calculateAge(value)
      return {
        ...prev,
        dateOfBirth: value,
        elderly: age >= 60,
        unaccompaniedMinor: age < 18 && prev.unaccompaniedMinor
      }
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // Validate required fields
      if (!formData.fullLegalName || !formData.dateOfBirth || !formData.currentSiteId) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/registration/individuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          householdId: formData.createNewHousehold ? null : formData.householdId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register individual')
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully registered ${formData.fullLegalName} with ID: ${data.data.individualCode}` 
      })
      
      // Clear form for next registration
      setTimeout(() => {
        if (window.confirm('Would you like to register another individual?')) {
          // Reset form but keep site and household info
          setFormData(prev => ({
            ...prev,
            fullLegalName: '',
            commonlyUsedName: '',
            dateOfBirth: '',
            contactNumber: '',
            shelterNumber: '',
            // Reset vulnerability flags
            unaccompaniedMinor: false,
            separatedChild: false,
            singleHeadedHH: false,
            pregnant: false,
            pregnancyDueDate: '',
            lactatingMother: false,
            hasDisability: false,
            disabilityDetails: '',
            elderly: false,
            chronicallyIll: false,
            illnessDetails: ''
          }))
          setActiveTab(0)
          setMessage(null)
        } else {
          router.push('/registration/individuals')
        }
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { name: 'Basic Information', icon: User },
    { name: 'Demographics', icon: Users },
    { name: 'Location', icon: MapPin },
    { name: 'Vulnerability', icon: Shield }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '20px 30px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => router.push('/registration')}
              style={{
                padding: '10px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                Individual Registration
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Register new individuals in the humanitarian database
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            <Save size={18} />
            {loading ? 'Registering...' : 'Register Individual'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          maxWidth: '1200px',
          margin: '20px auto',
          padding: '15px',
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
      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px' }}>
          {/* Tabs Navigation */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            height: 'fit-content'
          }}>
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(index)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    background: activeTab === index ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                    color: activeTab === index ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    fontWeight: activeTab === index ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} />
                  {tab.name}
                  {activeTab === index && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                </button>
              )
            })}
          </div>

          {/* Form Content */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px'
          }}>
            {/* Basic Information Tab */}
            {activeTab === 0 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#111827' }}>
                  Basic Information
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullLegalName}
                      onChange={(e) => setFormData({ ...formData, fullLegalName: e.target.value })}
                      placeholder="As per documentation"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      Commonly Used Name
                    </label>
                    <input
                      type="text"
                      value={formData.commonlyUsedName}
                      onChange={(e) => setFormData({ ...formData, commonlyUsedName: e.target.value })}
                      placeholder="Nickname or preferred name"
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    {formData.dateOfBirth && (
                      <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                        Age: {calculateAge(formData.dateOfBirth)} years
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab(1)}
                  style={{
                    marginTop: '30px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Next: Demographics
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Demographics Tab */}
            {activeTab === 1 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#111827' }}>
                  Demographics & Contact
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Nationality *
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="e.g., Cambodian"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      Ethnic Group
                    </label>
                    <input
                      type="text"
                      value={formData.ethnicGroup}
                      onChange={(e) => setFormData({ ...formData, ethnicGroup: e.target.value })}
                      placeholder="Optional"
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      Mother Tongue
                    </label>
                    <input
                      type="text"
                      value={formData.motherTongue}
                      onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                      placeholder="Primary language"
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="If available"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Village of Origin
                    </label>
                    <input
                      type="text"
                      value={formData.villageOfOrigin}
                      onChange={(e) => setFormData({ ...formData, villageOfOrigin: e.target.value })}
                      placeholder="Original village/town before displacement"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Pre-Displacement Address
                    </label>
                    <textarea
                      value={formData.preDisplacementAddress}
                      onChange={(e) => setFormData({ ...formData, preDisplacementAddress: e.target.value })}
                      placeholder="Full address before displacement"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button
                    onClick={() => setActiveTab(0)}
                    style={{
                      padding: '12px 24px',
                      background: 'white',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setActiveTab(2)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Next: Location
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 2 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#111827' }}>
                  Location & Household
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Current Site *
                    </label>
                    <select
                      value={formData.currentSiteId}
                      onChange={(e) => setFormData({ ...formData, currentSiteId: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">Select site</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>
                          {site.name} ({site.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Zone/Block
                    </label>
                    <input
                      type="text"
                      value={formData.zoneBlock}
                      onChange={(e) => setFormData({ ...formData, zoneBlock: e.target.value })}
                      placeholder="e.g., Zone A, Block 3"
                      style={{
                        width: '100%',
                        padding: '12px',
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
                      <Home size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Shelter Number
                    </label>
                    <input
                      type="text"
                      value={formData.shelterNumber}
                      onChange={(e) => setFormData({ ...formData, shelterNumber: e.target.value })}
                      placeholder="e.g., T-123"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{
                      padding: '15px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      marginBottom: '20px'
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
                          name="householdOption"
                          checked={formData.createNewHousehold}
                          onChange={() => setFormData({ ...formData, createNewHousehold: true, householdId: '' })}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Create new household</span>
                      </label>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="householdOption"
                          checked={!formData.createNewHousehold}
                          onChange={() => setFormData({ ...formData, createNewHousehold: false })}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Add to existing household</span>
                      </label>
                    </div>

                    {!formData.createNewHousehold && (
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          color: '#374151',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          Select Household
                        </label>
                        <select
                          value={formData.householdId}
                          onChange={(e) => setFormData({ ...formData, householdId: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: 'white'
                          }}
                        >
                          <option value="">Select household</option>
                          {households.map(household => (
                            <option key={household.id} value={household.id}>
                              {household.householdCode} (Size: {household.size})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '15px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.isHeadOfHousehold}
                        onChange={(e) => setFormData({ ...formData, isHeadOfHousehold: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        Head of Household
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button
                    onClick={() => setActiveTab(1)}
                    style={{
                      padding: '12px 24px',
                      background: 'white',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setActiveTab(3)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Next: Vulnerability Assessment
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Vulnerability Tab */}
            {activeTab === 3 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '25px', color: '#111827' }}>
                  Vulnerability Assessment
                </h2>
                
                <div style={{
                  padding: '15px',
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  marginBottom: '25px'
                }}>
                  <p style={{ fontSize: '14px', color: '#92400e' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    Please carefully assess all vulnerability indicators. This information is crucial for protection and assistance prioritization.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Child Protection */}
                  <div style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#374151' }}>
                      <Baby size={18} style={{ display: 'inline', marginRight: '8px' }} />
                      Child Protection
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.unaccompaniedMinor}
                          onChange={(e) => setFormData({ ...formData, unaccompaniedMinor: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Unaccompanied Minor (under 18, no adult caregiver)</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.separatedChild}
                          onChange={(e) => setFormData({ ...formData, separatedChild: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Separated Child (separated from parents but with adult)</span>
                      </label>
                    </div>
                  </div>

                  {/* Women & Family */}
                  <div style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#374151' }}>
                      <Heart size={18} style={{ display: 'inline', marginRight: '8px' }} />
                      Women & Family
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.singleHeadedHH}
                          onChange={(e) => setFormData({ ...formData, singleHeadedHH: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Single-Headed Household</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.pregnant}
                          onChange={(e) => setFormData({ ...formData, pregnant: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Pregnant</span>
                      </label>
                      
                      {formData.pregnant && (
                        <div style={{ marginLeft: '28px' }}>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            Estimated Due Date
                          </label>
                          <input
                            type="date"
                            value={formData.pregnancyDueDate}
                            onChange={(e) => setFormData({ ...formData, pregnancyDueDate: e.target.value })}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      )}
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.lactatingMother}
                          onChange={(e) => setFormData({ ...formData, lactatingMother: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Lactating Mother</span>
                      </label>
                    </div>
                  </div>

                  {/* Health & Disability */}
                  <div style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#374151' }}>
                      <Activity size={18} style={{ display: 'inline', marginRight: '8px' }} />
                      Health & Disability
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.hasDisability}
                          onChange={(e) => setFormData({ ...formData, hasDisability: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Person with Disability</span>
                      </label>
                      
                      {formData.hasDisability && (
                        <div style={{ marginLeft: '28px' }}>
                          <textarea
                            value={formData.disabilityDetails}
                            onChange={(e) => setFormData({ ...formData, disabilityDetails: e.target.value })}
                            placeholder="Describe the disability and support needs"
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      )}
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.elderly}
                          disabled={formData.dateOfBirth && calculateAge(formData.dateOfBirth) >= 60}
                          onChange={(e) => setFormData({ ...formData, elderly: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>
                          Elderly (60+ years)
                          {formData.elderly && ' - Auto-detected'}
                        </span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.chronicallyIll}
                          onChange={(e) => setFormData({ ...formData, chronicallyIll: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Chronically Ill</span>
                      </label>
                      
                      {formData.chronicallyIll && (
                        <div style={{ marginLeft: '28px' }}>
                          <textarea
                            value={formData.illnessDetails}
                            onChange={(e) => setFormData({ ...formData, illnessDetails: e.target.value })}
                            placeholder="Describe the chronic condition(s)"
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button
                    onClick={() => setActiveTab(2)}
                    style={{
                      padding: '12px 24px',
                      background: 'white',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Save size={18} />
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}