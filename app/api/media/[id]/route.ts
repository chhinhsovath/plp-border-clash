import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { prisma } from '@/lib/db/prisma'

// DELETE /api/media/[id] - Delete a media file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the media file
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!mediaFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      )
    }

    // Delete from Vercel Blob
    try {
      await del(mediaFile.url, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      })
    } catch (error) {
      console.error('Error deleting from blob storage:', error)
      // Continue even if blob deletion fails
    }

    // Delete from database
    await prisma.mediaFile.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_FILE',
        entity: 'MediaFile',
        entityId: params.id,
        metadata: {
          filename: mediaFile.originalName,
          size: mediaFile.size
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Media file deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting media file:', error)
    return NextResponse.json(
      { error: 'Failed to delete media file' },
      { status: 500 }
    )
  }
}

// GET /api/media/[id] - Get a specific media file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const organizationId = request.headers.get('x-organization-id')
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!mediaFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mediaFile
    })
  } catch (error) {
    console.error('Error fetching media file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media file' },
      { status: 500 }
    )
  }
}