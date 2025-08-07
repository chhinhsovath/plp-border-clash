'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ChartBuilder from '@/components/charts/ChartBuilder'
import StatisticsEditor from '@/components/statistics/StatisticsEditor'
import MapEditor from '@/components/map/MapEditor'
import MediaGallery from '@/components/media/MediaGallery'
import CollaborationIndicator from '@/components/collaboration/CollaborationIndicator'
import { useSocket } from '@/hooks/useSocket'
import { 
  Save, ArrowLeft, Plus, Trash2, Eye, EyeOff, 
  ChevronUp, ChevronDown, Settings, FileText,
  BarChart, Table, Map, Image, Grid, List, Share2, Globe
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Section {
  id: string
  title: string
  type: string
  content: any
  order: number
  isVisible: boolean
}

interface Report {
  id: string
  title: string
  description: string
  status: string
  sections: Section[]
}

export default function ReportEditor() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string
  
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [newSectionDialog, setNewSectionDialog] = useState(false)
  const [newSectionData, setNewSectionData] = useState({
    title: '',
    type: 'TEXT'
  })
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)

  // Real-time collaboration
  const {
    connected,
    collaborators,
    typingUsers,
    editSection: broadcastEdit,
    startTyping,
    stopTyping,
  } = useSocket({
    reportId,
    onSectionUpdated: (data) => {
      // Update section content when another user edits it
      setReport(prev => prev ? {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === data.sectionId ? { ...s, content: data.content } : s
        )
      } : null)
    },
    onCollaboratorJoined: (data) => {
      console.log(`${data.user.firstName} joined the report`)
    },
    onCollaboratorLeft: (data) => {
      console.log(`${data.userName} left the report`)
    },
  })

  // Debounced typing indicator
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleTyping = useCallback((sectionId: string) => {
    startTyping(sectionId)
    
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    const timeout = setTimeout(() => {
      stopTyping(sectionId)
    }, 1000)
    
    setTypingTimeout(timeout)
  }, [startTyping, stopTyping, typingTimeout])

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch report')
      
      const data = await response.json()
      setReport(data.data)
      if (data.data.sections.length > 0) {
        setActiveSection(data.data.sections[0].id)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveReport = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: report?.title,
          description: report?.description
        })
      })
      
      if (!response.ok) throw new Error('Failed to save report')
      
      // Save sections
      for (const section of report?.sections || []) {
        await fetch(`/api/reports/${reportId}/sections/${section.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: section.title,
            content: section.content,
            order: section.order,
            isVisible: section.isVisible
          })
        })
      }
      
      alert('Report saved successfully!')
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const addSection = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSectionData)
      })
      
      if (!response.ok) throw new Error('Failed to add section')
      
      const data = await response.json()
      setReport(prev => prev ? {
        ...prev,
        sections: [...prev.sections, data.data]
      } : null)
      
      setNewSectionDialog(false)
      setNewSectionData({ title: '', type: 'TEXT' })
      setActiveSection(data.data.id)
    } catch (error) {
      console.error('Error adding section:', error)
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to delete section')
      
      setReport(prev => prev ? {
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      } : null)
      
      if (activeSection === sectionId) {
        setActiveSection(report?.sections[0]?.id || null)
      }
    } catch (error) {
      console.error('Error deleting section:', error)
    }
  }

  const updateSectionContent = (sectionId: string, content: any) => {
    setReport(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, content } : s
      )
    } : null)
    
    // Broadcast the change to other collaborators
    broadcastEdit(sectionId, content)
    
    // Handle typing indicator
    if (activeSection === sectionId) {
      handleTyping(sectionId)
    }
  }

  const updateSectionTitle = (sectionId: string, title: string) => {
    setReport(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, title } : s
      )
    } : null)
  }

  const toggleSectionVisibility = (sectionId: string) => {
    setReport(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s
      )
    } : null)
  }

  const moveSectionUp = (index: number) => {
    if (index === 0) return
    
    setReport(prev => {
      if (!prev) return null
      const newSections = [...prev.sections]
      const temp = newSections[index]
      newSections[index] = newSections[index - 1]
      newSections[index - 1] = temp
      
      // Update order values
      newSections[index].order = index
      newSections[index - 1].order = index - 1
      
      return { ...prev, sections: newSections }
    })
  }

  const moveSectionDown = (index: number) => {
    if (!report || index === report.sections.length - 1) return
    
    setReport(prev => {
      if (!prev) return null
      const newSections = [...prev.sections]
      const temp = newSections[index]
      newSections[index] = newSections[index + 1]
      newSections[index + 1] = temp
      
      // Update order values
      newSections[index].order = index
      newSections[index + 1].order = index + 1
      
      return { ...prev, sections: newSections }
    })
  }

  const exportReport = async (format: 'pdf' | 'word' | 'excel' | 'html') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/export/${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to export as ${format.toUpperCase()}`)
      }
      
      // Get the blob from response
      const blob = await response.blob()
      
      // Determine file extension
      let extension = ''
      let mimeType = ''
      switch (format) {
        case 'pdf':
          extension = 'pdf'
          mimeType = 'application/pdf'
          break
        case 'word':
          extension = 'docx'
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'excel':
          extension = 'xlsx'
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'html':
          extension = 'html'
          mimeType = 'text/html'
          break
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${report?.title || 'report'}.${extension}`
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      alert(`Report exported successfully as ${format.toUpperCase()}!`)
    } catch (error) {
      console.error(`Error exporting report as ${format}:`, error)
      alert(`Failed to export report as ${format.toUpperCase()}`)
    }
  }

  const generateShareLink = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/export/html`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate share link')
      }
      
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setShowShareDialog(true)
    } catch (error) {
      console.error('Error generating share link:', error)
      alert('Failed to generate share link')
    }
  }

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    }
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'TEXT': return <FileText className="h-4 w-4" />
      case 'CHART': return <BarChart className="h-4 w-4" />
      case 'TABLE': return <Table className="h-4 w-4" />
      case 'MAP': return <Map className="h-4 w-4" />
      case 'IMAGE_GALLERY': return <Image className="h-4 w-4" />
      case 'STATISTICS': return <Grid className="h-4 w-4" />
      case 'ASSESSMENT_DATA': return <List className="h-4 w-4" />
      case 'RECOMMENDATIONS': return <List className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!report) {
    return <div className="flex items-center justify-center min-h-screen">Report not found</div>
  }

  const currentSection = report.sections.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{report.title}</h1>
                <p className="text-sm text-gray-600">Status: {report.status}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportReport('pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport('word')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Word
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport('excel')}
              >
                <Table className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport('html')}
              >
                <Globe className="h-4 w-4 mr-2" />
                HTML
              </Button>
              <Button
                variant="outline"
                onClick={generateShareLink}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/reports/${reportId}/preview`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={saveReport} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
        {/* Collaboration bar */}
        {connected && collaborators.length > 0 && (
          <div className="border-t bg-gray-50 px-4 sm:px-6 lg:px-8 py-2">
            <CollaborationIndicator
              collaborators={collaborators}
              typingUsers={typingUsers}
              currentSectionId={activeSection || undefined}
            />
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Sections List */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Sections</CardTitle>
                <Dialog open={newSectionDialog} onOpenChange={setNewSectionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Section</DialogTitle>
                      <DialogDescription>
                        Create a new section for your report
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="section-title">Section Title</Label>
                        <Input
                          id="section-title"
                          value={newSectionData.title}
                          onChange={(e) => setNewSectionData({
                            ...newSectionData,
                            title: e.target.value
                          })}
                          placeholder="Enter section title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="section-type">Section Type</Label>
                        <select
                          id="section-type"
                          className="w-full border rounded px-3 py-2"
                          value={newSectionData.type}
                          onChange={(e) => setNewSectionData({
                            ...newSectionData,
                            type: e.target.value
                          })}
                        >
                          <option value="TEXT">Text</option>
                          <option value="CHART">Chart</option>
                          <option value="TABLE">Table</option>
                          <option value="MAP">Map</option>
                          <option value="IMAGE_GALLERY">Image Gallery</option>
                          <option value="STATISTICS">Statistics</option>
                          <option value="ASSESSMENT_DATA">Assessment Data</option>
                          <option value="RECOMMENDATIONS">Recommendations</option>
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addSection}>Add Section</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {report.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                        activeSection === section.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {getSectionIcon(section.type)}
                        <span className="text-sm truncate">{section.title}</span>
                        {!section.isVisible && <EyeOff className="h-3 w-3 text-gray-400" />}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveSectionUp(index)
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveSectionDown(index)
                          }}
                          disabled={index === report.sections.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            {currentSection ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Input
                        value={currentSection.title}
                        onChange={(e) => updateSectionTitle(currentSection.id, e.target.value)}
                        className="text-xl font-bold mb-2"
                      />
                      <p className="text-sm text-gray-600">Type: {currentSection.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleSectionVisibility(currentSection.id)}
                      >
                        {currentSection.isVisible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSection(currentSection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentSection.type === 'TEXT' && (
                    <RichTextEditor
                      content={currentSection.content?.text || ''}
                      onChange={(content) => updateSectionContent(currentSection.id, { text: content })}
                    />
                  )}
                  
                  {currentSection.type === 'STATISTICS' && (
                    <StatisticsEditor
                      data={currentSection.content?.statistics || []}
                      onChange={(statistics) => updateSectionContent(currentSection.id, { statistics })}
                      editable={true}
                    />
                  )}
                  
                  {currentSection.type === 'CHART' && (
                    <ChartBuilder
                      initialData={currentSection.content?.chart}
                      onChange={(chart) => updateSectionContent(currentSection.id, { chart })}
                      editable={true}
                    />
                  )}
                  
                  {currentSection.type === 'TABLE' && (
                    <div className="space-y-4">
                      <RichTextEditor
                        content={currentSection.content?.text || '<table><tr><th>Column 1</th><th>Column 2</th></tr><tr><td>Data 1</td><td>Data 2</td></tr></table>'}
                        onChange={(content) => updateSectionContent(currentSection.id, { text: content })}
                      />
                    </div>
                  )}
                  
                  {currentSection.type === 'MAP' && (
                    <MapEditor
                      data={currentSection.content?.map || {}}
                      onChange={(map) => updateSectionContent(currentSection.id, { map })}
                      editable={true}
                    />
                  )}
                  
                  {currentSection.type === 'IMAGE_GALLERY' && (
                    <MediaGallery
                      sectionId={currentSection.id}
                      onSelect={(file) => {
                        const currentImages = currentSection.content?.images || []
                        updateSectionContent(currentSection.id, { 
                          images: [...currentImages, file]
                        })
                      }}
                      allowMultiple={true}
                      acceptedTypes={['image/*']}
                    />
                  )}
                  
                  {currentSection.type === 'ASSESSMENT_DATA' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">Assessment data editor coming soon...</p>
                      {/* TODO: Implement assessment data editor */}
                    </div>
                  )}
                  
                  {currentSection.type === 'RECOMMENDATIONS' && (
                    <RichTextEditor
                      content={currentSection.content?.text || ''}
                      onChange={(content) => updateSectionContent(currentSection.id, { text: content })}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No section selected. Add a section to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
            <DialogDescription>
              Share this report with others using the link below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {shareUrl && (
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyShareLink}>
                  Copy
                </Button>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Anyone with this link can view the report in read-only mode.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}