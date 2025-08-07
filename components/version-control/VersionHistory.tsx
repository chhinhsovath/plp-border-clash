'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Clock, GitBranch, RotateCcw, Eye, GitCommit, 
  ChevronDown, ChevronRight, User, Calendar, MessageSquare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Version {
  id: string
  version: number
  createdAt: string
  createdBy: string
  createdByUser?: {
    firstName: string
    lastName: string
    email: string
  }
  metadata?: {
    message?: string
    autoSave?: boolean
  }
  changes?: any
}

interface VersionHistoryProps {
  reportId: string
  currentVersion: number
  onRestore?: (versionId: string) => void
  onCompare?: (fromVersion: number, toVersion: number) => void
}

export default function VersionHistory({
  reportId,
  currentVersion,
  onRestore,
  onCompare,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareFrom, setCompareFrom] = useState<number | null>(null)
  const [compareTo, setCompareTo] = useState<number | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchVersions()
  }, [reportId])

  const fetchVersions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reports/${reportId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch versions')
      
      const data = await response.json()
      setVersions(data.data)
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedVersion || !onRestore) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/reports/${reportId}/versions/${selectedVersion.id}/restore`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to restore version')
      
      alert(`Successfully restored version ${selectedVersion.version}`)
      setShowRestoreDialog(false)
      onRestore(selectedVersion.id)
      fetchVersions() // Refresh the list
    } catch (error) {
      console.error('Error restoring version:', error)
      alert('Failed to restore version')
    }
  }

  const handleCompare = () => {
    if (compareFrom && compareTo && onCompare) {
      onCompare(compareFrom, compareTo)
    }
  }

  const toggleVersionExpanded = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(versionId)) {
        newSet.delete(versionId)
      } else {
        newSet.add(versionId)
      }
      return newSet
    })
  }

  const getChangesSummary = (changes: any) => {
    if (!changes) return null
    
    const summary = []
    if (changes.added?.length > 0) {
      summary.push(`${changes.added.length} added`)
    }
    if (changes.modified?.length > 0) {
      summary.push(`${changes.modified.length} modified`)
    }
    if (changes.removed?.length > 0) {
      summary.push(`${changes.removed.length} removed`)
    }
    
    return summary.join(', ')
  }

  if (loading) {
    return <div className="text-center py-4">Loading version history...</div>
  }

  return (
    <div className="space-y-4">
      {/* Compare Mode Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Version History
        </h3>
        <div className="flex gap-2">
          {compareMode ? (
            <>
              <Select
                value={compareFrom?.toString()}
                onValueChange={(v) => setCompareFrom(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.version.toString()}>
                      v{v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={compareTo?.toString()}
                onValueChange={(v) => setCompareTo(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.version.toString()}>
                      v{v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={!compareFrom || !compareTo}
              >
                Compare
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCompareMode(false)
                  setCompareFrom(null)
                  setCompareTo(null)
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCompareMode(true)}
            >
              Compare Versions
            </Button>
          )}
        </div>
      </div>

      {/* Version List */}
      <div className="space-y-2">
        {versions.map((version) => (
          <Card key={version.id} className="overflow-hidden">
            <CardHeader 
              className="py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleVersionExpanded(version.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                  >
                    {expandedVersions.has(version.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <GitCommit className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Version {version.version}</span>
                      {version.version === currentVersion && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                      {version.metadata?.autoSave && (
                        <Badge variant="outline" className="text-xs">Auto-save</Badge>
                      )}
                    </div>
                    {version.metadata?.message && (
                      <p className="text-sm text-gray-600 mt-1">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {version.metadata.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {version.createdByUser ? (
                      `${version.createdByUser.firstName} ${version.createdByUser.lastName}`
                    ) : (
                      'Unknown'
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedVersion(version)
                        setShowRestoreDialog(true)
                      }}
                      disabled={version.version === currentVersion}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {expandedVersions.has(version.id) && (
              <CardContent className="pt-0">
                {version.changes && (
                  <div className="space-y-2 text-sm">
                    {version.changes.added?.length > 0 && (
                      <div className="text-green-600">
                        + {version.changes.added.length} sections added
                      </div>
                    )}
                    {version.changes.modified?.length > 0 && (
                      <div className="text-blue-600">
                        ~ {version.changes.modified.length} sections modified
                      </div>
                    )}
                    {version.changes.removed?.length > 0 && (
                      <div className="text-red-600">
                        - {version.changes.removed.length} sections removed
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version {selectedVersion?.version}</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this version? This will create a backup of the current version and replace it with version {selectedVersion?.version}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}