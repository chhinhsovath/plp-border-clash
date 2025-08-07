import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { NextApiRequest } from 'next'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'

interface SocketWithAuth extends Socket {
  userId?: string
  organizationId?: string
  reportId?: string
}

interface CollaboratorCursor {
  userId: string
  userName: string
  sectionId: string
  position: number
  color: string
}

interface ReportEdit {
  sectionId: string
  content: any
  userId: string
  timestamp: number
}

const activeCollaborators = new Map<string, Set<string>>() // reportId -> Set of userIds
const userCursors = new Map<string, CollaboratorCursor>() // userId -> cursor position

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  })

  // Authentication middleware
  io.use(async (socket: SocketWithAuth, next) => {
    try {
      const token = socket.handshake.auth.token
      
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationId: true,
          role: true,
        }
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = user.id
      socket.organizationId = user.organizationId
      socket.data = { user }
      
      next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: SocketWithAuth) => {
    console.log(`User ${socket.userId} connected`)

    // Join a report room for collaboration
    socket.on('join-report', async (reportId: string) => {
      try {
        // Verify user has access to the report
        const report = await prisma.report.findFirst({
          where: {
            id: reportId,
            organizationId: socket.organizationId,
          }
        })

        if (!report) {
          socket.emit('error', { message: 'Report not found or access denied' })
          return
        }

        socket.reportId = reportId
        socket.join(`report:${reportId}`)

        // Track active collaborators
        if (!activeCollaborators.has(reportId)) {
          activeCollaborators.set(reportId, new Set())
        }
        activeCollaborators.get(reportId)!.add(socket.userId!)

        // Get all active collaborators for this report
        const collaboratorIds = Array.from(activeCollaborators.get(reportId)!)
        const collaborators = await prisma.user.findMany({
          where: { id: { in: collaboratorIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        })

        // Notify all users in the report about the new collaborator
        io.to(`report:${reportId}`).emit('collaborator-joined', {
          userId: socket.userId,
          user: socket.data.user,
          collaborators,
        })

        // Send current collaborators to the joining user
        socket.emit('current-collaborators', { collaborators })

      } catch (error) {
        console.error('Error joining report:', error)
        socket.emit('error', { message: 'Failed to join report' })
      }
    })

    // Leave report room
    socket.on('leave-report', (reportId: string) => {
      handleLeaveReport(socket, reportId)
    })

    // Handle section editing
    socket.on('edit-section', async (data: ReportEdit) => {
      if (!socket.reportId) {
        socket.emit('error', { message: 'Not in a report room' })
        return
      }

      try {
        // Verify section belongs to the report
        const section = await prisma.section.findFirst({
          where: {
            id: data.sectionId,
            reportId: socket.reportId,
          }
        })

        if (!section) {
          socket.emit('error', { message: 'Section not found' })
          return
        }

        // Broadcast the edit to all other collaborators
        socket.to(`report:${socket.reportId}`).emit('section-updated', {
          ...data,
          userId: socket.userId,
          userName: `${socket.data.user.firstName} ${socket.data.user.lastName}`,
          timestamp: Date.now(),
        })

        // Save to database (debounced in production)
        await prisma.section.update({
          where: { id: data.sectionId },
          data: { content: data.content }
        })

        // Create version history entry
        await prisma.reportVersion.create({
          data: {
            reportId: socket.reportId,
            version: 0, // Will be incremented
            changes: {
              sectionId: data.sectionId,
              content: data.content,
              userId: socket.userId,
            },
            createdBy: socket.userId!,
          }
        })

      } catch (error) {
        console.error('Error editing section:', error)
        socket.emit('error', { message: 'Failed to save edit' })
      }
    })

    // Handle cursor position updates
    socket.on('cursor-update', (data: { sectionId: string; position: number }) => {
      if (!socket.reportId || !socket.userId) return

      const cursor: CollaboratorCursor = {
        userId: socket.userId,
        userName: `${socket.data.user.firstName} ${socket.data.user.lastName}`,
        sectionId: data.sectionId,
        position: data.position,
        color: generateUserColor(socket.userId),
      }

      userCursors.set(socket.userId, cursor)

      // Broadcast cursor position to other collaborators
      socket.to(`report:${socket.reportId}`).emit('cursor-moved', cursor)
    })

    // Handle selection updates
    socket.on('selection-update', (data: { sectionId: string; start: number; end: number }) => {
      if (!socket.reportId) return

      socket.to(`report:${socket.reportId}`).emit('selection-changed', {
        userId: socket.userId,
        userName: `${socket.data.user.firstName} ${socket.data.user.lastName}`,
        ...data,
        color: generateUserColor(socket.userId!),
      })
    })

    // Handle typing indicators
    socket.on('typing-start', (sectionId: string) => {
      if (!socket.reportId) return

      socket.to(`report:${socket.reportId}`).emit('user-typing', {
        userId: socket.userId,
        userName: `${socket.data.user.firstName} ${socket.data.user.lastName}`,
        sectionId,
      })
    })

    socket.on('typing-stop', (sectionId: string) => {
      if (!socket.reportId) return

      socket.to(`report:${socket.reportId}`).emit('user-stopped-typing', {
        userId: socket.userId,
        sectionId,
      })
    })

    // Handle comments
    socket.on('add-comment', async (data: {
      sectionId: string
      content: string
      parentId?: string
    }) => {
      if (!socket.reportId || !socket.userId) return

      try {
        const comment = await prisma.comment.create({
          data: {
            content: data.content,
            reportId: socket.reportId,
            sectionId: data.sectionId,
            authorId: socket.userId,
            parentId: data.parentId,
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        })

        io.to(`report:${socket.reportId}`).emit('comment-added', comment)
      } catch (error) {
        console.error('Error adding comment:', error)
        socket.emit('error', { message: 'Failed to add comment' })
      }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`)
      
      if (socket.reportId) {
        handleLeaveReport(socket, socket.reportId)
      }

      // Remove cursor
      if (socket.userId) {
        userCursors.delete(socket.userId)
      }
    })
  })

  function handleLeaveReport(socket: SocketWithAuth, reportId: string) {
    socket.leave(`report:${reportId}`)
    
    // Remove from active collaborators
    if (activeCollaborators.has(reportId)) {
      activeCollaborators.get(reportId)!.delete(socket.userId!)
      
      if (activeCollaborators.get(reportId)!.size === 0) {
        activeCollaborators.delete(reportId)
      }
    }

    // Notify others that user left
    socket.to(`report:${reportId}`).emit('collaborator-left', {
      userId: socket.userId,
      userName: `${socket.data.user.firstName} ${socket.data.user.lastName}`,
    })

    // Remove cursor
    if (socket.userId) {
      userCursors.delete(socket.userId)
    }
  }

  function generateUserColor(userId: string): string {
    // Generate a consistent color for each user based on their ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ]
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  return io
}