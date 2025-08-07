'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Users, Circle } from 'lucide-react'

interface Collaborator {
  id: string
  firstName: string
  lastName: string
  email: string
  color?: string
}

interface CollaborationIndicatorProps {
  collaborators: Collaborator[]
  typingUsers: Map<string, Set<string>>
  currentSectionId?: string
}

export default function CollaborationIndicator({
  collaborators,
  typingUsers,
  currentSectionId,
}: CollaborationIndicatorProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false)

  useEffect(() => {
    // Trigger pulse animation when collaborators change
    setPulseAnimation(true)
    const timer = setTimeout(() => setPulseAnimation(false), 1000)
    return () => clearTimeout(timer)
  }, [collaborators.length])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getTypingUsersForSection = () => {
    if (!currentSectionId || !typingUsers.has(currentSectionId)) {
      return []
    }
    
    const typingUserIds = Array.from(typingUsers.get(currentSectionId)!)
    return collaborators.filter(c => typingUserIds.includes(c.id))
  }

  const typingUsersInSection = getTypingUsersForSection()

  return (
    <div className="flex items-center gap-4">
      {/* Active Collaborators */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {collaborators.length} {collaborators.length === 1 ? 'user' : 'users'} online
          </span>
        </div>
        
        <div className="flex -space-x-2">
          <TooltipProvider>
            {collaborators.slice(0, 5).map((collaborator) => (
              <Tooltip key={collaborator.id}>
                <TooltipTrigger>
                  <Avatar
                    className={`h-8 w-8 border-2 border-white ${
                      pulseAnimation ? 'animate-pulse' : ''
                    }`}
                    style={{
                      borderColor: collaborator.color || '#e5e7eb',
                    }}
                  >
                    <AvatarFallback
                      style={{
                        backgroundColor: collaborator.color || '#e5e7eb',
                        color: 'white',
                        fontSize: '0.75rem',
                      }}
                    >
                      {getInitials(collaborator.firstName, collaborator.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{collaborator.firstName} {collaborator.lastName}</p>
                  <p className="text-xs text-gray-500">{collaborator.email}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          
          {collaborators.length > 5 && (
            <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                +{collaborators.length - 5}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Typing Indicators */}
      {typingUsersInSection.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">
              {typingUsersInSection.map(u => u.firstName).join(', ')}
              {typingUsersInSection.length === 1 ? ' is' : ' are'} typing
            </span>
            <div className="flex gap-1">
              <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <Circle className="h-2 w-2 fill-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <Badge variant="outline" className="gap-1">
        <Circle className="h-2 w-2 fill-green-500" />
        <span className="text-xs">Live</span>
      </Badge>
    </div>
  )
}