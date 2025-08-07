'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import io, { Socket } from 'socket.io-client'

interface UseSocketOptions {
  reportId?: string
  onCollaboratorJoined?: (data: any) => void
  onCollaboratorLeft?: (data: any) => void
  onSectionUpdated?: (data: any) => void
  onCursorMoved?: (data: any) => void
  onSelectionChanged?: (data: any) => void
  onUserTyping?: (data: any) => void
  onUserStoppedTyping?: (data: any) => void
  onCommentAdded?: (data: any) => void
}

export function useSocket(options: UseSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      console.error('No token found for socket connection')
      return
    }

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socketInstance
    setSocket(socketInstance)

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected')
      setConnected(true)
      
      // Join report room if reportId is provided
      if (options.reportId) {
        socketInstance.emit('join-report', options.reportId)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setConnected(false)
    })

    socketInstance.on('error', (error: any) => {
      console.error('Socket error:', error)
    })

    // Collaboration events
    socketInstance.on('current-collaborators', (data: { collaborators: any[] }) => {
      setCollaborators(data.collaborators)
    })

    socketInstance.on('collaborator-joined', (data: any) => {
      setCollaborators(data.collaborators)
      options.onCollaboratorJoined?.(data)
    })

    socketInstance.on('collaborator-left', (data: any) => {
      setCollaborators(prev => prev.filter(c => c.id !== data.userId))
      options.onCollaboratorLeft?.(data)
      
      // Remove typing indicator for this user
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        newMap.forEach((users, sectionId) => {
          users.delete(data.userId)
          if (users.size === 0) {
            newMap.delete(sectionId)
          }
        })
        return newMap
      })
    })

    // Content update events
    socketInstance.on('section-updated', (data: any) => {
      options.onSectionUpdated?.(data)
    })

    // Cursor and selection events
    socketInstance.on('cursor-moved', (data: any) => {
      options.onCursorMoved?.(data)
    })

    socketInstance.on('selection-changed', (data: any) => {
      options.onSelectionChanged?.(data)
    })

    // Typing indicators
    socketInstance.on('user-typing', (data: any) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        if (!newMap.has(data.sectionId)) {
          newMap.set(data.sectionId, new Set())
        }
        newMap.get(data.sectionId)!.add(data.userId)
        return newMap
      })
      options.onUserTyping?.(data)
    })

    socketInstance.on('user-stopped-typing', (data: any) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        if (newMap.has(data.sectionId)) {
          newMap.get(data.sectionId)!.delete(data.userId)
          if (newMap.get(data.sectionId)!.size === 0) {
            newMap.delete(data.sectionId)
          }
        }
        return newMap
      })
      options.onUserStoppedTyping?.(data)
    })

    // Comment events
    socketInstance.on('comment-added', (data: any) => {
      options.onCommentAdded?.(data)
    })

    // Cleanup
    return () => {
      if (options.reportId) {
        socketInstance.emit('leave-report', options.reportId)
      }
      socketInstance.disconnect()
    }
  }, []) // Only run once on mount

  // Methods to emit events
  const editSection = useCallback((sectionId: string, content: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('edit-section', {
        sectionId,
        content,
        timestamp: Date.now(),
      })
    }
  }, [])

  const updateCursor = useCallback((sectionId: string, position: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-update', { sectionId, position })
    }
  }, [])

  const updateSelection = useCallback((sectionId: string, start: number, end: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('selection-update', { sectionId, start, end })
    }
  }, [])

  const startTyping = useCallback((sectionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', sectionId)
    }
  }, [])

  const stopTyping = useCallback((sectionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', sectionId)
    }
  }, [])

  const addComment = useCallback((sectionId: string, content: string, parentId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('add-comment', { sectionId, content, parentId })
    }
  }, [])

  const joinReport = useCallback((reportId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-report', reportId)
    }
  }, [])

  const leaveReport = useCallback((reportId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-report', reportId)
    }
  }, [])

  return {
    socket,
    connected,
    collaborators,
    typingUsers,
    editSection,
    updateCursor,
    updateSelection,
    startTyping,
    stopTyping,
    addComment,
    joinReport,
    leaveReport,
  }
}