'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Save,
  Package,
  Users,
  Calendar,
  Search,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Utensils,
  Home,
  Heart,
  Droplets,
  Plus,
  Minus,
  QrCode,
  UserCheck,
  FileText
} from 'lucide-react'

interface Household {
  id: string
  householdCode: string
  size: number
  members?: Individual[]
}

interface Individual {
  id: string
  individualCode: string
  fullLegalName: string
  isHeadOfHousehold: boolean
}

interface DistributionItem {
  item: string
  quantity: number
  unit: string
}

const foodItems = [
  { name: 'Rice', unit: 'kg', standard: 12 },
  { name: 'Wheat Flour', unit: 'kg', standard: 10 },
  { name: 'Cooking Oil', unit: 'liters', standard: 2 },
  { name: 'Lentils', unit: 'kg', standard: 3 },
  { name: 'Sugar', unit: 'kg', standard: 1 },
  { name: 'Salt', unit: 'kg', standard: 0.5 },
  { name: 'High Energy Biscuits', unit: 'packets', standard: 5 },
  { name: 'Canned Fish', unit: 'cans', standard: 4 },
  { name: 'Fortified Blended Food', unit: 'kg', standard: 2 }
]

const nfiItems = [
  { name: 'Blanket', unit: 'pieces', standard: 2 },
  { name: 'Sleeping Mat', unit: 'pieces', standard: 1 },
  { name: 'Mosquito Net', unit: 'pieces', standard: 1 },
  { name: 'Kitchen Set', unit: 'set', standard: 1 },
  { name: 'Jerry Can (20L)', unit: 'pieces', standard: 2 },
  { name: 'Bucket (10L)', unit: 'pieces', standard: 1 },
  { name: 'Tarpaulin', unit: 'pieces', standard: 1 },
  { name: 'Solar Lamp', unit: 'pieces', standard: 1 },
  { name: 'Hygiene Kit', unit: 'kit', standard: 1 },
  { name: 'Dignity Kit', unit: 'kit', standard: 1 }
]

const hygieneItems = [
  { name: 'Soap', unit: 'bars', standard: 4 },
  { name: 'Sanitary Pads', unit: 'packets', standard: 2 },
  { name: 'Toothpaste', unit: 'tubes', standard: 1 },
  { name: 'Toothbrush', unit: 'pieces', standard: 2 },
  { name: 'Shampoo', unit: 'bottles', standard: 1 },
  { name: 'Laundry Detergent', unit: 'kg', standard: 1 },
  { name: 'Hand Sanitizer', unit: 'bottles', standard: 1 },
  { name: 'Towel', unit: 'pieces', standard: 1 }
]

export default function DistributionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [distributionType, setDistributionType] = useState<'FOOD' | 'NFI' | 'HYGIENE'>('FOOD')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Household[]>([])
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [distributionItems, setDistributionItems] = useState<DistributionItem[]>([])
  const [verificationMethod, setVerificationMethod] = useState<'SIGNATURE' | 'FINGERPRINT' | 'QR_CODE'>('SIGNATURE')
  
  const [formData, setFormData] = useState({
    householdId: '',
    distributionDate: new Date().toISOString().split('T')[0],
    distributionTime: new Date().toTimeString().slice(0, 5),
    distributionPoint: '',
    distributedBy: '',
    collectorName: '',
    collectorRelation: 'HEAD_OF_HOUSEHOLD',
    verificationCode: '',
    notes: ''
  })

  const distributionPoints = [
    'Distribution Center A',
    'Distribution Center B', 
    'Community Center',
    'Health Clinic',
    'School Compound',
    'Market Area'
  ]

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    
    // Initialize items based on type
    initializeItems()
  }, [distributionType, router])

  const initializeItems = () => {
    let items: DistributionItem[] = []
    const itemList = distributionType === 'FOOD' ? foodItems : 
                    distributionType === 'NFI' ? nfiItems : hygieneItems
    
    items = itemList.map(item => ({
      item: item.name,
      quantity: 0,
      unit: item.unit
    }))
    
    setDistributionItems(items)
  }

  const searchHouseholds = async () => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/households?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Error searching households:', error)
    }
  }

  const selectHousehold = async (household: Household) => {
    setSelectedHousehold(household)
    setFormData({ ...formData, householdId: household.id })
    setSearchResults([])
    setSearchTerm('')
    
    // Auto-calculate standard rations based on household size
    calculateStandardRations(household.size)
  }

  const calculateStandardRations = (householdSize: number) => {
    const itemList = distributionType === 'FOOD' ? foodItems : 
                    distributionType === 'NFI' ? nfiItems : hygieneItems
    
    const updatedItems = itemList.map(item => ({
      item: item.name,
      quantity: Math.ceil(item.standard * (distributionType === 'FOOD' ? householdSize / 5 : 1)),
      unit: item.unit
    }))
    
    setDistributionItems(updatedItems)
  }

  const updateItemQuantity = (index: number, change: number) => {
    const updated = [...distributionItems]
    updated[index].quantity = Math.max(0, updated[index].quantity + change)
    setDistributionItems(updated)
  }

  const setItemQuantity = (index: number, value: string) => {
    const updated = [...distributionItems]
    updated[index].quantity = Math.max(0, parseFloat(value) || 0)
    setDistributionItems(updated)
  }

  const calculateTotalWeight = () => {
    return distributionItems
      .filter(item => item.unit === 'kg')
      .reduce((total, item) => total + item.quantity, 0)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.householdId || !formData.distributionPoint) {
        throw new Error('Please select household and distribution point')
      }

      const activeItems = distributionItems.filter(item => item.quantity > 0)
      if (activeItems.length === 0) {
        throw new Error('Please select at least one item to distribute')
      }

      const endpoint = distributionType === 'FOOD' ? '/api/distribution/food' :
                      distributionType === 'NFI' ? '/api/distribution/nfi' :
                      '/api/distribution/hygiene'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          householdId: formData.householdId,
          distributionDate: `${formData.distributionDate}T${formData.distributionTime}`,
          distributionPoint: formData.distributionPoint,
          items: activeItems,
          distributedBy: formData.distributedBy,
          collectorName: formData.collectorName,
          collectorRelation: formData.collectorRelation,
          verificationMethod,
          verificationCode: formData.verificationCode,
          notes: formData.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record distribution')
      }

      setMessage({ 
        type: 'success', 
        text: `Distribution recorded successfully for ${selectedHousehold?.householdCode}` 
      })
      
      // Reset for next distribution
      setTimeout(() => {
        setSelectedHousehold(null)
        setFormData({
          ...formData,
          householdId: '',
          collectorName: '',
          verificationCode: '',
          notes: ''
        })
        initializeItems()
        setMessage(null)
      }, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const totalWeight = calculateTotalWeight()
  const totalItems = distributionItems.reduce((sum, item) => sum + (item.quantity > 0 ? 1 : 0), 0)

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
                onClick={() => router.push('/distribution')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-6 w-6 text-amber-600" />
                  Distribution Tracking
                </h1>
                <p className="text-sm text-gray-500">
                  Record food, NFI, and hygiene distributions
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={loading || !selectedHousehold}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Processing...' : 'Complete Distribution'}
            </Button>
          </div>
        </div>
      </div>

      {/* Distribution Type Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Tabs value={distributionType} onValueChange={(value) => {
          setDistributionType(value as 'FOOD' | 'NFI' | 'HYGIENE')
          initializeItems()
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger 
              value="FOOD" 
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              <Utensils className="h-6 w-6" />
              <span className="font-semibold">Food Ration</span>
            </TabsTrigger>
            <TabsTrigger 
              value="NFI" 
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
            >
              <Home className="h-6 w-6" />
              <span className="font-semibold">Non-Food Items</span>
            </TabsTrigger>
            <TabsTrigger 
              value="HYGIENE" 
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-900"
            >
              <Droplets className="h-6 w-6" />
              <span className="font-semibold">Hygiene Kit</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Beneficiary & Details */}
          <div className="space-y-6">
            {/* Household Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Beneficiary Household
                </CardTitle>
                <CardDescription>
                  Search and select household for distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
              
              {!selectedHousehold ? (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Household *
                  </Label>
                  <div className="relative">
                    <Input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        searchHouseholds()
                      }}
                      placeholder="Search by household code..."
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {searchResults.map(household => (
                          <div
                            key={household.id}
                            onClick={() => selectHousehold(household)}
                            className="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0"
                          >
                            <div className="font-medium text-sm">{household.householdCode}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Household Size: {household.size} members
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-lg font-semibold text-blue-900">
                      {selectedHousehold.householdCode}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      Size: {selectedHousehold.size} members
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      Standard ration calculated for {selectedHousehold.size} people
                    </Badge>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHousehold(null)
                      setFormData({ ...formData, householdId: '' })
                      initializeItems()
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Change Household
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Distribution Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Distribution Details
                </CardTitle>
                <CardDescription>
                  Collection and distribution information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Distribution Point *</Label>
                  <Select value={formData.distributionPoint} onValueChange={(value) => setFormData({ ...formData, distributionPoint: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributionPoints.map(point => (
                        <SelectItem key={point} value={point}>{point}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Collector Name *
                  </Label>
                  <Input
                    value={formData.collectorName}
                    onChange={(e) => setFormData({ ...formData, collectorName: e.target.value })}
                    placeholder="Person collecting items"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Relation to Household</Label>
                  <Select value={formData.collectorRelation} onValueChange={(value) => setFormData({ ...formData, collectorRelation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEAD_OF_HOUSEHOLD">Head of Household</SelectItem>
                      <SelectItem value="SPOUSE">Spouse</SelectItem>
                      <SelectItem value="ADULT_MEMBER">Adult Member</SelectItem>
                      <SelectItem value="REPRESENTATIVE">Representative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Distributed By *</Label>
                  <Input
                    value={formData.distributedBy}
                    onChange={(e) => setFormData({ ...formData, distributedBy: e.target.value })}
                    placeholder="Staff name"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-orange-600" />
                  Verification Method
                </CardTitle>
                <CardDescription>
                  Choose verification method for collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="signature"
                      name="verification"
                      checked={verificationMethod === 'SIGNATURE'}
                      onChange={() => setVerificationMethod('SIGNATURE')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="signature" className="flex items-center gap-2 cursor-pointer font-normal">
                      <FileText className="h-4 w-4" />
                      Signature
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="fingerprint"
                      name="verification"
                      checked={verificationMethod === 'FINGERPRINT'}
                      onChange={() => setVerificationMethod('FINGERPRINT')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="fingerprint" className="flex items-center gap-2 cursor-pointer font-normal">
                      <UserCheck className="h-4 w-4" />
                      Fingerprint
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="qr-code"
                      name="verification"
                      checked={verificationMethod === 'QR_CODE'}
                      onChange={() => setVerificationMethod('QR_CODE')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="qr-code" className="flex items-center gap-2 cursor-pointer font-normal">
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </Label>
                  </div>
                </div>

                {verificationMethod === 'QR_CODE' && (
                  <div className="space-y-2">
                    <Label>QR Code</Label>
                    <Input
                      value={formData.verificationCode}
                      onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                      placeholder="Scan or enter QR code"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      Distribution Items
                    </CardTitle>
                    <CardDescription>
                      Select quantities for each item
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {totalItems} items • {totalWeight > 0 && `${totalWeight.toFixed(1)} kg`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {distributionItems.map((item, index) => (
                    <div
                      key={item.item}
                      className={`p-3 rounded-lg border ${
                        item.quantity > 0 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 mb-2">
                        {item.item}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, -1)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Minus className="h-4 w-4 text-red-600" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setItemQuantity(index, e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, 1)}
                          className="h-8 w-8 p-0 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 text-green-600" />
                        </Button>
                        <span className="text-xs text-gray-500 ml-1">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="space-y-2 mt-6">
                  <Label>Notes / Special Instructions</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}