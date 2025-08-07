'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, FileText, Edit, Trash2, Copy, Globe, Lock, Users } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  category: string
  isPublic: boolean
  usageCount: number
  structure: any
  createdAt: string
  updatedAt: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [newTemplateDialog, setNewTemplateDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [newTemplateData, setNewTemplateData] = useState({
    name: '',
    description: '',
    category: 'Assessment',
    isPublic: false
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Default template structure
      const structure = {
        sections: [
          {
            title: 'Executive Summary',
            type: 'TEXT',
            defaultContent: { text: '' }
          },
          {
            title: 'Situation Overview',
            type: 'TEXT',
            defaultContent: { text: '' }
          },
          {
            title: 'Key Statistics',
            type: 'STATISTICS',
            defaultContent: { statistics: [] }
          },
          {
            title: 'Geographic Coverage',
            type: 'MAP',
            defaultContent: { map: {} }
          },
          {
            title: 'Recommendations',
            type: 'RECOMMENDATIONS',
            defaultContent: { text: '' }
          }
        ]
      }
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTemplateData,
          structure
        })
      })
      
      if (response.ok) {
        fetchTemplates()
        setNewTemplateDialog(false)
        setNewTemplateData({
          name: '',
          description: '',
          category: 'Assessment',
          isPublic: false
        })
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const duplicateTemplate = async (templateId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const createReportFromTemplate = async (templateId: string) => {
    const reportTitle = prompt('Enter report title:')
    if (!reportTitle) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: reportTitle,
          templateId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/reports/${data.data.id}/edit`)
      }
    } catch (error) {
      console.error('Error creating report from template:', error)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories = ['all', 'Assessment', 'Report', 'Emergency', 'Monitoring', 'Custom']

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Assessment': return '📋'
      case 'Report': return '📄'
      case 'Emergency': return '🚨'
      case 'Monitoring': return '📊'
      case 'Custom': return '⚙️'
      default: return '📄'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
              <p className="text-sm text-gray-600 mt-1">Create and manage report templates</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
              <Dialog open={newTemplateDialog} onOpenChange={setNewTemplateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Template</DialogTitle>
                    <DialogDescription>
                      Create a reusable template for reports
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplateData.name}
                        onChange={(e) => setNewTemplateData({
                          ...newTemplateData,
                          name: e.target.value
                        })}
                        placeholder="Enter template name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Input
                        id="template-description"
                        value={newTemplateData.description}
                        onChange={(e) => setNewTemplateData({
                          ...newTemplateData,
                          description: e.target.value
                        })}
                        placeholder="Brief description of the template"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <select
                        id="template-category"
                        className="w-full border rounded px-3 py-2"
                        value={newTemplateData.category}
                        onChange={(e) => setNewTemplateData({
                          ...newTemplateData,
                          category: e.target.value
                        })}
                      >
                        <option value="Assessment">Assessment</option>
                        <option value="Report">Report</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Monitoring">Monitoring</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="template-public"
                        checked={newTemplateData.isPublic}
                        onChange={(e) => setNewTemplateData({
                          ...newTemplateData,
                          isPublic: e.target.checked
                        })}
                      />
                      <Label htmlFor="template-public" className="cursor-pointer">
                        Make this template public (visible to all organizations)
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createTemplate}>Create Template</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No templates found</p>
              <p className="text-sm text-gray-400 mt-2">Create your first template to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                    </div>
                    {template.isPublic ? (
                      <Globe className="h-4 w-4 text-blue-500" title="Public template" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" title="Private template" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{template.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Used:</span>
                      <span className="font-medium">{template.usageCount} times</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sections:</span>
                      <span className="font-medium">
                        {template.structure?.sections?.length || 0} sections
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => createReportFromTemplate(template.id)}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateTemplate(template.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/templates/${template.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}