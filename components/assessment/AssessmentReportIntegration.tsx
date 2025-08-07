'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, Link, Plus, Eye, AlertCircle, CheckCircle, 
  BarChart3, Globe, Users, MapPin, Calendar
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
  createdAt: string
  data: {
    leadAgency: string
  }
}

interface AssessmentReportIntegrationProps {
  reportId: string
  sectionId?: string
  currentAssessments?: string[]
  onAssessmentLinked?: (assessmentId: string) => void
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

export default function AssessmentReportIntegration({
  reportId,
  sectionId,
  currentAssessments = [],
  onAssessmentLinked
}: AssessmentReportIntegrationProps) {
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([])
  const [linkedAssessments, setLinkedAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState('')

  useEffect(() => {
    fetchAssessments()
    fetchLinkedAssessments()
  }, [reportId])

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assessments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvailableAssessments(data.data)
      }
    } catch (error) {
      console.error('Error fetching assessments:', error)
    }
  }

  const fetchLinkedAssessments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/assessments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLinkedAssessments(data.data)
      }
    } catch (error) {
      console.error('Error fetching linked assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const linkAssessment = async () => {
    if (!selectedAssessment) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assessmentId: selectedAssessment,
          sectionId
        })
      })
      
      if (response.ok) {
        fetchLinkedAssessments()
        setShowLinkDialog(false)
        setSelectedAssessment('')
        onAssessmentLinked?.(selectedAssessment)
        alert('Assessment linked successfully')
      } else {
        throw new Error('Failed to link assessment')
      }
    } catch (error) {
      console.error('Error linking assessment:', error)
      alert('Failed to link assessment')
    }
  }

  const unlinkAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to unlink this assessment?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchLinkedAssessments()
        alert('Assessment unlinked successfully')
      } else {
        throw new Error('Failed to unlink assessment')
      }
    } catch (error) {
      console.error('Error unlinking assessment:', error)
      alert('Failed to unlink assessment')
    }
  }

  const insertAssessmentData = async (assessmentId: string, dataType: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/sections/${sectionId}/insert-assessment-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assessmentId,
          dataType
        })
      })
      
      if (response.ok) {
        alert(`Assessment ${dataType} data inserted successfully`)
        // Trigger a refresh of the parent component
        window.location.reload()
      } else {
        throw new Error('Failed to insert assessment data')
      }
    } catch (error) {
      console.error('Error inserting assessment data:', error)
      alert('Failed to insert assessment data')
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading assessments...</div>
  }

  const unlinkedAssessments = availableAssessments.filter(
    assessment => !linkedAssessments.some(linked => linked.id === assessment.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link className="h-5 w-5" />
          Linked Assessments
        </h3>
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Assessment to Report</DialogTitle>
              <DialogDescription>
                Select an assessment to link to this report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedAssessments.map(assessment => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(assessment.type)}
                        <span>{assessment.title}</span>
                        <Badge className={getTypeColor(assessment.type)}>
                          {assessment.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={linkAssessment} disabled={!selectedAssessment}>
                Link Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {linkedAssessments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No assessments linked to this report</p>
            <p className="text-sm text-gray-400 mt-1">
              Link assessments to reference their data in your report
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {linkedAssessments.map(assessment => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(assessment.type)}
                      <h4 className="font-semibold">{assessment.title}</h4>
                      <Badge className={getTypeColor(assessment.type)}>
                        {assessment.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {assessment.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {assessment.affectedPeople.toLocaleString()} affected
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(assessment.startDate), 'MMM dd')} - {format(new Date(assessment.endDate), 'MMM dd, yyyy')}
                      </div>
                      <div>
                        Lead: {assessment.data.leadAgency}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/assessments/${assessment.id}`, '_blank')}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unlinkAssessment(assessment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Unlink
                      </Button>
                    </div>
                    
                    {sectionId && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => insertAssessmentData(assessment.id, 'demographics')}
                        >
                          Insert Demographics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => insertAssessmentData(assessment.id, 'sectors')}
                        >
                          Insert Sectors Data
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => insertAssessmentData(assessment.id, 'findings')}
                        >
                          Insert Key Findings
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}