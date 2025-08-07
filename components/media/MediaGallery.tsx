'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Upload, Image, File, Trash2, Download, Eye, X } from 'lucide-react'

interface MediaFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  metadata?: any
  createdAt: string
}

interface MediaGalleryProps {
  sectionId?: string
  onSelect?: (file: MediaFile) => void
  allowMultiple?: boolean
  acceptedTypes?: string[]
}

export default function MediaGallery({
  sectionId,
  onSelect,
  allowMultiple = false,
  acceptedTypes = ['image/*']
}: MediaGalleryProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [])

  const handleFileUpload = async (fileList: FileList) => {
    setUploading(true)
    const token = localStorage.getItem('token')

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const formData = new FormData()
        formData.append('file', file)
        if (sectionId) formData.append('sectionId', sectionId)

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          setFiles(prev => [data.data, ...prev])
          
          if (onSelect && !allowMultiple) {
            onSelect(data.data)
            setUploadDialog(false)
          }
        } else {
          const error = await response.json()
          alert(`Failed to upload ${file.name}: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (file: MediaFile) => {
    if (allowMultiple) {
      const newSelection = new Set(selectedFiles)
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id)
      } else {
        newSelection.add(file.id)
      }
      setSelectedFiles(newSelection)
    } else {
      if (onSelect) {
        onSelect(file)
      }
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/media/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
        setSelectedFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(fileId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-8 w-8" />
    }
    return <File className="h-8 w-8" />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Media Library</h3>
        <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Drag and drop files or click to browse
              </DialogDescription>
            </DialogHeader>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your files here, or click to browse
              </p>
              <Input
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button asChild disabled={uploading}>
                  <span>{uploading ? 'Uploading...' : 'Browse Files'}</span>
                </Button>
              </Label>
              <p className="text-xs text-gray-500 mt-2">
                Maximum file size: 10MB. Supported formats: Images, PDF, Word, Excel
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <Card
            key={file.id}
            className={`cursor-pointer hover:shadow-lg transition-shadow ${
              selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleFileSelect(file)}
          >
            <CardContent className="p-4">
              <div className="aspect-square mb-2 bg-gray-100 rounded flex items-center justify-center">
                {file.mimeType.startsWith('image/') && file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.originalName}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  getFileIcon(file.mimeType)
                )}
              </div>
              <p className="text-sm font-medium truncate">{file.originalName}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewFile(file)
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(file.url, '_blank')
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFile(file.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.originalName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewFile?.mimeType.startsWith('image/') ? (
              <img
                src={previewFile.url}
                alt={previewFile.originalName}
                className="w-full h-auto"
              />
            ) : (
              <div className="text-center py-8">
                <File className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Preview not available for this file type
                </p>
                <Button
                  className="mt-4"
                  onClick={() => window.open(previewFile!.url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>
          {previewFile?.metadata && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">Metadata</h4>
              <pre className="text-xs">{JSON.stringify(previewFile.metadata, null, 2)}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}