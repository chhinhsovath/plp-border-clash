'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, Search, Filter, Grid, List, MoreVertical, 
  MapPin, Calendar, Users, Building2, Eye, Edit, 
  Trash2, Download, Copy, AlertCircle, FileText,
  BarChart3, Globe, CheckCircle
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface Assessment {
  id: string
  title: string
  type: string
  location: string
  startDate: string
  endDate: string
  affectedPeople: number
  households?: number
  createdAt: string
  updatedAt: string
  createdBy: {
    firstName: string
    lastName: string
    email: string
  }
  report?: {
    id: string
    title: string
    status: string
  }
  data: {
    leadAgency: string
    participatingOrganizations?: string[]
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'RAPID': return <AlertCircle className="h-4 w-4" />
    case 'DETAILED': return <FileText className="h-4 w-4" />
    case 'SECTORAL': return <BarChart3 className="h-4 w-4" />
    case 'MULTI_SECTORAL': return <Globe className="h-4 w-4" />
    case 'MONITORING': return <CheckCircle className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'RAPID': return 'bg-red-100 text-red-800'
    case 'DETAILED': return 'bg-blue-100 text-blue-800'
    case 'SECTORAL': return 'bg-green-100 text-green-800'
    case 'MULTI_SECTORAL': return 'bg-purple-100 text-purple-800'
    case 'MONITORING': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assessments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch assessments')
      }
      
      const data = await response.json()
      setAssessments(data.data)
    } catch (error) {
      console.error('Error fetching assessments:', error)
      alert('Failed to load assessments')
    } finally {
      setLoading(false)
    }
  }

  const deleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchAssessments()
        alert('Assessment deleted successfully')
      } else {
        throw new Error('Failed to delete assessment')
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('Failed to delete assessment')
    }
  }

  const handleDuplicate = async (assessmentId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${assessmentId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to duplicate assessment')
      }
      
      const data = await response.json()
      router.push(`/assessments/${data.data.id}/edit`)
    } catch (error) {
      console.error('Error duplicating assessment:', error)
      alert('Failed to duplicate assessment')
    }
  }

  const handleExport = async (assessmentId: string, format: 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assessments/${assessmentId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to export assessment')
      }
      
      const blob = await response.blob()
      const assessment = assessments.find(a => a.id === assessmentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${assessment?.title}-assessment.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting assessment:', error)
      alert('Failed to export assessment')
    }
  }

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          assessment.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          assessment.data.leadAgency.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'ALL' || assessment.type === typeFilter
    return matchesSearch && matchesType
  })

  const sortedAssessments = [...filteredAssessments].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'type':
        return a.type.localeCompare(b.type)
      case 'location':
        return a.location.localeCompare(b.location)
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'updatedAt':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Assessments</h1>
              <p className="text-gray-600 mt-1">Manage humanitarian needs assessments</p>
            </div>
            <Button onClick={() => router.push('/assessments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Rapid Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessments.filter(a => a.type === 'RAPID').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Detailed Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessments.filter(a => a.type === 'DETAILED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Affected People</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessments.reduce((sum, a) => sum + a.affectedPeople, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search assessments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="RAPID">Rapid</SelectItem>
                  <SelectItem value="DETAILED">Detailed</SelectItem>
                  <SelectItem value="SECTORAL">Sectoral</SelectItem>
                  <SelectItem value="MULTI_SECTORAL">Multi-Sectoral</SelectItem>
                  <SelectItem value="MONITORING">Monitoring</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Last Updated</SelectItem>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Display */}
        {sortedAssessments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || typeFilter !== 'ALL' 
                ? 'Try adjusting your filters'
                : 'Get started by creating your first assessment'}
            </p>
            {!searchTerm && typeFilter === 'ALL' && (
              <Button onClick={() => router.push('/assessments/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAssessments.map(assessment => (
              <Card 
                key={assessment.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/assessments/${assessment.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(assessment.type)}
                        <Badge className={getTypeColor(assessment.type)}>
                          {assessment.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-2">{assessment.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/assessments/${assessment.id}`)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/assessments/${assessment.id}/edit`)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(assessment.id)
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleExport(assessment.id, 'pdf')
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleExport(assessment.id, 'excel')
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAssessment(assessment.id)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {assessment.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-3 w-3" />
                      {assessment.data.leadAgency}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-3 w-3" />
                      {assessment.affectedPeople.toLocaleString()} affected people
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(assessment.startDate), 'MMM dd')} - {format(new Date(assessment.endDate), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Updated {formatDistanceToNow(new Date(assessment.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Lead Agency</th>
                      <th className="text-left p-3">Affected People</th>
                      <th className="text-left p-3">Updated</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAssessments.map((assessment) => (
                      <tr key={assessment.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{assessment.title}</div>
                          <div className="text-sm text-gray-600">
                            {assessment.createdBy.firstName} {assessment.createdBy.lastName}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getTypeColor(assessment.type)}>
                            {getTypeIcon(assessment.type)}
                            <span className="ml-1">{assessment.type.replace('_', ' ')}</span>
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{assessment.location}</td>
                        <td className="p-3 text-sm">{assessment.data.leadAgency}</td>
                        <td className="p-3 text-sm">{assessment.affectedPeople.toLocaleString()}</td>
                        <td className="p-3 text-sm">
                          {formatDistanceToNow(new Date(assessment.updatedAt), { addSuffix: true })}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/assessments/${assessment.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/assessments/${assessment.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDuplicate(assessment.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(assessment.id, 'pdf')}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(assessment.id, 'excel')}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export Excel
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteAssessment(assessment.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}