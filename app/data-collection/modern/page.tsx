'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  Shield,
  Heart,
  Package,
  Droplets,
  GraduationCap,
  Baby,
  Home,
  Activity,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserPlus,
  ClipboardList,
  Stethoscope,
  ShoppingBag,
  AlertTriangle,
  BarChart3,
  PieChart,
  Map,
  Calendar,
  Plus,
  ArrowRight,
  Target
} from 'lucide-react'

interface ModuleCard {
  id: string
  title: string
  description: string
  icon: any
  color: string
  bgColor: string
  routes: {
    new?: string
    list?: string
    reports?: string
  }
  stats?: {
    total: number
    recent: number
    pending?: number
  }
}

export default function ModernDataCollectionDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<any>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  const modules: ModuleCard[] = [
    {
      id: 'registration',
      title: 'Registration',
      description: 'Register individuals and households in the system',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      routes: {
        new: '/registration/individuals/new',
        list: '/registration/individuals',
        reports: '/reports/registration'
      },
      stats: statistics?.overview || { total: 0, recent: 0 }
    },
    {
      id: 'protection',
      title: 'Protection',
      description: 'Report and track protection incidents',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      routes: {
        new: '/protection/incidents/new',
        list: '/protection/incidents',
        reports: '/reports/protection'
      },
      stats: statistics?.protection || { total: 0, recent: 0, pending: 0 }
    },
    {
      id: 'health',
      title: 'Health',
      description: 'Clinical visits and medical records',
      icon: Heart,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      routes: {
        new: '/health/visits/new',
        list: '/health/visits',
        reports: '/reports/health'
      },
      stats: statistics?.health || { total: 0, recent: 0 }
    },
    {
      id: 'nutrition',
      title: 'Nutrition',
      description: 'Child nutrition screening and assessment',
      icon: Baby,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 border-pink-200',
      routes: {
        new: '/nutrition/assessment/new',
        list: '/nutrition/assessments',
        reports: '/reports/nutrition'
      },
      stats: statistics?.nutrition || { total: 0, recent: 0 }
    },
    {
      id: 'distribution',
      title: 'Distribution',
      description: 'Food, NFI, and hygiene distributions',
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      routes: {
        new: '/distribution/new',
        list: '/distribution/history',
        reports: '/reports/distribution'
      },
      stats: statistics?.distributions || { total: 0, recent: 0 }
    },
    {
      id: 'wash',
      title: 'WASH',
      description: 'Water, sanitation, and hygiene assessments',
      icon: Droplets,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 border-cyan-200',
      routes: {
        new: '/wash/assessment/new',
        list: '/wash/assessments',
        reports: '/reports/wash'
      },
      stats: statistics?.wash || { total: 0, recent: 0 }
    },
    {
      id: 'education',
      title: 'Education',
      description: 'School enrollment and attendance tracking',
      icon: GraduationCap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      routes: {
        new: '/education/enrollment/new',
        list: '/education/students',
        reports: '/reports/education'
      },
      stats: statistics?.education || { total: 0, recent: 0 }
    },
    {
      id: 'shelter',
      title: 'Shelter',
      description: 'Shelter conditions and NFI needs',
      icon: Home,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      routes: {
        new: '/shelter/assessment/new',
        list: '/shelter/assessments',
        reports: '/reports/shelter'
      },
      stats: statistics?.shelter || { total: 0, recent: 0 }
    }
  ]

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    
    fetchStatistics()
    fetchRecentActivities()
  }, [router])

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/data/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch('/api/audit/recent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecentActivities(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const getActivityIcon = (action: string) => {
    if (action.includes('REGISTER')) return UserPlus
    if (action.includes('DISTRIBUTION')) return Package
    if (action.includes('CLINICAL')) return Stethoscope
    if (action.includes('PROTECTION')) return Shield
    if (action.includes('ASSESSMENT')) return ClipboardList
    return Activity
  }

  const getActivityColor = (action: string) => {
    if (action.includes('REGISTER')) return 'text-blue-600'
    if (action.includes('DISTRIBUTION')) return 'text-amber-600'
    if (action.includes('CLINICAL')) return 'text-green-600'
    if (action.includes('PROTECTION')) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <Target className="h-8 w-8 inline-block mr-2" />
                <span className="text-2xl font-bold">Data Collection Hub</span>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Humanitarian Operations
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/reports/new')}
                className="hidden sm:flex"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="hidden sm:flex"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Individuals</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {statistics.overview?.totalIndividuals || 0}
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-blue-600" />
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{statistics.overview?.newThisWeek || 0} this week
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600">Total Households</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {statistics.overview?.totalHouseholds || 0}
                    </p>
                  </div>
                  <Home className="h-12 w-12 text-amber-600" />
                </div>
                <div className="mt-4 text-sm text-amber-600">
                  Avg size: {statistics.overview?.averageHouseholdSize || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Vulnerable Cases</p>
                    <p className="text-3xl font-bold text-red-900">
                      {statistics.vulnerability?.total || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
                <div className="mt-4 text-sm text-red-600">
                  Needs attention
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Sites</p>
                    <p className="text-3xl font-bold text-green-900">
                      {statistics.overview?.totalSites || 0}
                    </p>
                  </div>
                  <Map className="h-12 w-12 text-green-600" />
                </div>
                <div className="mt-4 text-sm text-green-600">
                  Operational sites
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">Data Collection</TabsTrigger>
            <TabsTrigger value="activities">Recent Activity</TabsTrigger>
            <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          </TabsList>

          {/* Data Collection Modules */}
          <TabsContent value="modules" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Collection Modules</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {modules.map(module => {
                  const Icon = module.icon
                  return (
                    <Card 
                      key={module.id}
                      className={`${module.bgColor} hover:shadow-lg transition-all duration-200 cursor-pointer group hover:-translate-y-1`}
                      onClick={() => module.routes.new && router.push(module.routes.new)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className={`p-3 rounded-lg bg-white/50 ${module.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {module.title}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          {module.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {module.stats && (
                          <div className="flex justify-between items-center text-sm mb-4">
                            <span className="text-gray-600">Total: <strong>{module.stats.total}</strong></span>
                            <span className="text-gray-600">Recent: <strong>{module.stats.recent}</strong></span>
                            {module.stats.pending !== undefined && (
                              <Badge variant="destructive" className="text-xs">
                                {module.stats.pending} pending
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          {module.routes.new && (
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(module.routes.new!)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              New
                            </Button>
                          )}
                          {module.routes.list && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(module.routes.list!)
                              }}
                            >
                              View All
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Critical Alerts */}
            {statistics?.alerts && statistics.alerts.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.alerts.map((alert: any, index: number) => (
                      <Alert key={index} className="border-red-300 bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>{alert.title}:</strong> {alert.description}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recent Activities */}
          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent System Activity
                </CardTitle>
                <CardDescription>
                  Latest actions performed in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.length > 0 ? recentActivities.slice(0, 10).map((activity, index) => {
                    const ActivityIcon = getActivityIcon(activity.action)
                    const colorClass = getActivityColor(activity.action)
                    
                    return (
                      <div key={index} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50">
                        <div className={`p-2 rounded-lg bg-gray-100 ${colorClass}`}>
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.description || activity.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.user?.username || 'System'} • {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent activities</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Actions */}
          <TabsContent value="quick-actions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/registration/individuals/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Register Individual</h3>
                      <p className="text-sm text-blue-600">Add new person to database</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/distribution/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-600 rounded-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900">Record Distribution</h3>
                      <p className="text-sm text-amber-600">Food, NFI, or hygiene kits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/health/visits/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-600 rounded-lg">
                      <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Clinical Visit</h3>
                      <p className="text-sm text-green-600">Medical consultation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/protection/incidents/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-600 rounded-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-900">Report Incident</h3>
                      <p className="text-sm text-red-600">Protection concern</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/nutrition/assessment/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-pink-600 rounded-lg">
                      <Baby className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-pink-900">Nutrition Screen</h3>
                      <p className="text-sm text-pink-600">Child malnutrition check</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push('/education/enrollment/new')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-600 rounded-lg">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-900">School Enrollment</h3>
                      <p className="text-sm text-purple-600">Education registration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}