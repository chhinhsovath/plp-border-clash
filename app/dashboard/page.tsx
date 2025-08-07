'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Activity,
  Target,
  Award,
  Package,
  Shield,
  Heart,
  Home,
  BarChart3,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
}

interface Report {
  id: string
  title: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
  author: string
  updatedAt: string
  description: string
}

const mockReports: Report[] = [
  {
    id: '1',
    title: 'Emergency Response Assessment - Q1 2025',
    status: 'PUBLISHED',
    author: 'Admin User',
    updatedAt: '2025-01-15',
    description: 'Comprehensive assessment of emergency response activities'
  },
  {
    id: '2',
    title: 'Border Region Needs Assessment',
    status: 'IN_REVIEW',
    author: 'Admin User',
    updatedAt: '2025-01-14',
    description: 'Assessment of humanitarian needs in border regions'
  },
  {
    id: '3',
    title: 'Monthly Activity Report - January 2025',
    status: 'DRAFT',
    author: 'Admin User',
    updatedAt: '2025-01-13',
    description: 'Summary of activities and interventions'
  }
]

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch(status) {
    case 'PUBLISHED': return 'default'
    case 'IN_REVIEW': return 'secondary'
    case 'APPROVED': return 'outline'
    case 'ARCHIVED': return 'secondary'
    default: return 'outline'
  }
}

const StatusIcon = ({ status }: { status: string }) => {
  switch(status) {
    case 'DRAFT': return <Edit className="h-3 w-3" />
    case 'IN_REVIEW': return <Clock className="h-3 w-3" />
    case 'APPROVED': return <CheckCircle className="h-3 w-3" />
    case 'PUBLISHED': return <CheckCircle className="h-3 w-3" />
    case 'ARCHIVED': return <XCircle className="h-3 w-3" />
    default: return null
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>(mockReports)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check authentication
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userStr || !token) {
      router.push('/')
      return
    }
    
    setUser(JSON.parse(userStr))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/')
  }

  const handleDataCollection = () => {
    router.push('/data-collection')
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'ALL' || report.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: reports.length,
    published: reports.filter(r => r.status === 'PUBLISHED').length,
    inReview: reports.filter(r => r.status === 'IN_REVIEW').length,
    draft: reports.filter(r => r.status === 'DRAFT').length
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar - Desktop */}
      <div className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HRS Platform
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-1 mx-auto"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true, path: '/dashboard' },
            { icon: Package, label: 'Data Collection', active: false, path: '/data-collection' },
            { icon: FileText, label: 'Reports', active: false, path: '/reports' },
            { icon: Users, label: 'Users', active: false, path: '/users' },
            { icon: Settings, label: 'Settings', active: false, path: '/settings' }
          ].map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "default" : "ghost"}
              className={`w-full justify-start ${!sidebarOpen && 'justify-center'} ${
                item.active && 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
              onClick={() => item.path === '/data-collection' ? handleDataCollection() : router.push(item.path)}
            >
              <item.icon className={`h-5 w-5 ${sidebarOpen && 'mr-3'}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className={`h-4 w-4 ${sidebarOpen && 'mr-3'}`} />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HRS Platform
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Same navigation as desktop */}
            <nav className="flex-1 p-4 space-y-2">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: Package, label: 'Data Collection', active: false },
                { icon: FileText, label: 'Reports', active: false },
                { icon: Users, label: 'Users', active: false },
                { icon: Settings, label: 'Settings', active: false }
              ].map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    item.active && 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                  onClick={() => {
                    if (item.label === 'Data Collection') {
                      handleDataCollection()
                    }
                    setMobileMenuOpen(false)
                  }}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="pl-12 lg:pl-0">
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-500 mt-1">Welcome back, {user.firstName}</p>
              </div>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => router.push('/reports/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={handleDataCollection}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Data Collection</p>
                    <p className="text-2xl font-bold text-blue-900">Active</p>
                  </div>
                  <Package className="h-10 w-10 text-blue-600" />
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  8 modules available
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Published</p>
                    <p className="text-2xl font-bold text-green-900">{stats.published}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div className="mt-4 text-sm text-green-600">
                  Active reports
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600">In Review</p>
                    <p className="text-2xl font-bold text-amber-900">{stats.inReview}</p>
                  </div>
                  <Clock className="h-10 w-10 text-amber-600" />
                </div>
                <div className="mt-4 text-sm text-amber-600">
                  Pending approval
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Drafts</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.draft}</p>
                  </div>
                  <Edit className="h-10 w-10 text-purple-600" />
                </div>
                <div className="mt-4 text-sm text-purple-600">
                  Work in progress
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>Manage and track your humanitarian reports</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map((report) => (
                    <Card key={report.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Badge variant={getStatusBadgeVariant(report.status)} className="mb-2">
                            <StatusIcon status={report.status} />
                            <span className="ml-1">{report.status.replace('_', ' ')}</span>
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardTitle className="text-base">{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{report.author}</span>
                          <span>{new Date(report.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadgeVariant(report.status)}>
                            <StatusIcon status={report.status} />
                            <span className="ml-1">{report.status.replace('_', ' ')}</span>
                          </Badge>
                          <h3 className="font-semibold">{report.title}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{report.author}</span>
                          <span>•</span>
                          <span>{new Date(report.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}