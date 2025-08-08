'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  ChevronRight,
  Loader2
} from 'lucide-react'
import { createIndividualSchema, type CreateIndividualInput } from '@/lib/schemas'
import { getDefaultValues } from '@/lib/validation/form-utils'

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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeTab, setActiveTab] = useState(0)
  
  // Initialize form with Zod schema
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset
  } = useForm<CreateIndividualInput>({
    resolver: zodResolver(createIndividualSchema),
    defaultValues: getDefaultValues(createIndividualSchema)
  })
  
  // Watch specific fields for conditional logic
  const dateOfBirth = watch('dateOfBirth')
  const pregnant = watch('pregnant')
  const hasDisability = watch('hasDisability')
  const chronicallyIll = watch('chronicallyIll')
  const createNewHousehold = watch('createNewHousehold')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    
    fetchSites()
    fetchHouseholds()
  }, [router])

  useEffect(() => {
    // Auto-calculate elderly status based on age
    if (dateOfBirth) {
      const age = calculateAge(dateOfBirth)
      setValue('elderly', age >= 60)
      
      // Set unaccompanied minor only if age < 18
      if (age < 18) {
        // Keep existing value
      } else {
        setValue('unaccompaniedMinor', false)
      }
    }
  }, [dateOfBirth, setValue])

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

  const onSubmit = async (data: CreateIndividualInput) => {
    try {
      const response = await fetch('/api/registration/individuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Individual registered successfully with code: ${result.data.individualCode}`
        })
        
        // Reset form after successful submission
        reset()
        
        // Redirect after 3 seconds
        setTimeout(() => {
          router.push('/data-collection')
        }, 3000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to register individual'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred while registering'
      })
    }
  }

  const tabs = [
    { name: 'Basic Information', icon: User },
    { name: 'Location', icon: MapPin },
    { name: 'Vulnerability', icon: Shield },
    { name: 'Additional Info', icon: Activity }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/data-collection')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold">Individual Registration</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === index
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    {...register('fullLegalName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full legal name"
                  />
                  {errors.fullLegalName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullLegalName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commonly Used Name
                  </label>
                  <input
                    {...register('commonlyUsedName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter commonly used name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    {...register('dateOfBirth')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                  )}
                  {dateOfBirth && (
                    <p className="mt-1 text-sm text-gray-500">
                      Age: {calculateAge(dateOfBirth)} years
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    {...register('gender')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality *
                  </label>
                  <input
                    {...register('nationality')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter nationality"
                  />
                  {errors.nationality && (
                    <p className="mt-1 text-sm text-red-600">{errors.nationality.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ethnic Group
                  </label>
                  <input
                    {...register('ethnicGroup')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter ethnic group"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mother Tongue
                  </label>
                  <input
                    {...register('motherTongue')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter mother tongue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    {...register('contactNumber')}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact number"
                  />
                  {errors.contactNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactNumber.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Site *
                  </label>
                  <select
                    {...register('currentSiteId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.siteCode})
                      </option>
                    ))}
                  </select>
                  {errors.currentSiteId && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentSiteId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone/Block
                  </label>
                  <input
                    {...register('zoneBlock')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter zone or block"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shelter Number
                  </label>
                  <input
                    {...register('shelterNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter shelter number"
                  />
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <input
                      {...register('createNewHousehold')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Create new household
                    </label>
                  </div>
                  
                  {!createNewHousehold && (
                    <select
                      {...register('householdId')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select household</option>
                      {households.map(household => (
                        <option key={household.id} value={household.id}>
                          {household.householdCode} (Size: {household.size})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pre-Displacement Address
                  </label>
                  <input
                    {...register('preDisplacementAddress')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter previous address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village of Origin
                  </label>
                  <input
                    {...register('villageOfOrigin')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter village of origin"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      {...register('isHeadOfHousehold')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Is head of household
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vulnerability Tab */}
          {activeTab === 2 && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      {...register('unaccompaniedMinor')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Unaccompanied Minor
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('separatedChild')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Separated Child
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('singleHeadedHH')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Single-Headed Household
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('pregnant')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Pregnant
                    </label>
                  </div>

                  {pregnant && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pregnancy Due Date
                      </label>
                      <input
                        {...register('pregnancyDueDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      {...register('lactatingMother')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Lactating Mother
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('hasDisability')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Has Disability
                    </label>
                  </div>

                  {hasDisability && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disability Details
                      </label>
                      <textarea
                        {...register('disabilityDetails')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the disability"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      {...register('elderly')}
                      type="checkbox"
                      disabled
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Elderly (60+) - Auto-calculated
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('chronicallyIll')}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Chronically Ill
                    </label>
                  </div>

                  {chronicallyIll && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Illness Details
                      </label>
                      <textarea
                        {...register('illnessDetails')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the illness"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info Tab */}
          {activeTab === 3 && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education Level
                  </label>
                  <select
                    {...register('educationLevel')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select education level</option>
                    <option value="NONE">None</option>
                    <option value="PRIMARY">Primary</option>
                    <option value="SECONDARY">Secondary</option>
                    <option value="TERTIARY">Tertiary</option>
                    <option value="VOCATIONAL">Vocational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional notes or observations"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={() => router.push('/data-collection')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex gap-3">
              {activeTab > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab - 1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
              )}
              
              {activeTab < tabs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Register Individual
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}