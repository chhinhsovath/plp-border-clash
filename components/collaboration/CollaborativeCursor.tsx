'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CursorPosition {
  userId: string
  userName: string
  sectionId: string
  position: number
  color: string
}

interface CollaborativeCursorProps {
  cursors: CursorPosition[]
  currentSectionId: string
}

export default function CollaborativeCursor({
  cursors,
  currentSectionId,
}: CollaborativeCursorProps) {
  const [visibleCursors, setVisibleCursors] = useState<CursorPosition[]>([])

  useEffect(() => {
    // Filter cursors for current section
    const sectionCursors = cursors.filter(c => c.sectionId === currentSectionId)
    setVisibleCursors(sectionCursors)
  }, [cursors, currentSectionId])

  return (
    <AnimatePresence>
      {visibleCursors.map((cursor) => (
        <motion.div
          key={cursor.userId}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-none z-50"
          style={{
            left: `${cursor.position}px`,
            top: 0,
          }}
        >
          <div
            className="relative"
            style={{
              color: cursor.color,
            }}
          >
            {/* Cursor line */}
            <div
              className="w-0.5 h-5 animate-pulse"
              style={{
                backgroundColor: cursor.color,
              }}
            />
            
            {/* User label */}
            <div
              className="absolute -top-6 left-0 whitespace-nowrap px-2 py-1 rounded text-xs text-white font-medium shadow-sm"
              style={{
                backgroundColor: cursor.color,
              }}
            >
              {cursor.userName}
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// Selection highlight component
interface SelectionHighlight {
  userId: string
  userName: string
  sectionId: string
  start: number
  end: number
  color: string
}

interface CollaborativeSelectionProps {
  selections: SelectionHighlight[]
  currentSectionId: string
}

export function CollaborativeSelection({
  selections,
  currentSectionId,
}: CollaborativeSelectionProps) {
  const [visibleSelections, setVisibleSelections] = useState<SelectionHighlight[]>([])

  useEffect(() => {
    // Filter selections for current section
    const sectionSelections = selections.filter(s => s.sectionId === currentSectionId)
    setVisibleSelections(sectionSelections)
  }, [selections, currentSectionId])

  return (
    <>
      {visibleSelections.map((selection) => (
        <div
          key={selection.userId}
          className="absolute pointer-events-none"
          style={{
            left: `${selection.start}px`,
            width: `${selection.end - selection.start}px`,
            height: '100%',
            backgroundColor: selection.color,
            opacity: 0.2,
          }}
        >
          <div
            className="absolute -top-5 left-0 text-xs px-1 py-0.5 rounded text-white"
            style={{
              backgroundColor: selection.color,
              fontSize: '10px',
            }}
          >
            {selection.userName}
          </div>
        </div>
      ))}
    </>
  )
}