import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { prisma } from '@/lib/db/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const reportId = formData.get('reportId') as string | null
    const sectionId = formData.get('sectionId') as string | null
    const metadata = formData.get('metadata') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760')
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const uniqueFilename = `${uuidv4()}.${fileExt}`
    const path = `humanitarian-reports/${organizationId}/${uniqueFilename}`

    // Upload to Vercel Blob
    const blob = await put(path, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    // Generate thumbnail URL for images
    let thumbnailUrl = null
    if (file.type.startsWith('image/')) {
      // For now, we'll use the same URL. In production, you'd generate a smaller version
      thumbnailUrl = blob.url
    }

    // Parse metadata if provided
    let parsedMetadata = {}
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata)
      } catch (e) {
        console.error('Invalid metadata JSON:', e)
      }
    }

    // Save to database
    const mediaFile = await prisma.mediaFile.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: blob.url,
        thumbnailUrl,
        organizationId,
        sectionId,
        metadata: parsedMetadata
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPLOAD_FILE',
        entity: 'MediaFile',
        entityId: mediaFile.id,
        metadata: {
          filename: file.name,
          size: file.size,
          reportId,
          sectionId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: mediaFile
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// GET /api/media/upload - Get media files for organization
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')
    const mimeType = searchParams.get('mimeType')

    const where: any = { organizationId }
    if (sectionId) where.sectionId = sectionId
    if (mimeType) where.mimeType = { startsWith: mimeType }

    const mediaFiles = await prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: mediaFiles
    })
  } catch (error) {
    console.error('Error fetching media files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media files' },
      { status: 500 }
    )
  }
}