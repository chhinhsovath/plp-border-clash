'use client'

import { useEffect, useState } from 'react'
import { devLog } from '@/lib/utils/dev-logger'

/**
 * Hook to display detailed errors in development mode
 * Makes it easy to copy errors for Claude Code debugging
 */
export function useDevError() {
  const [lastError, setLastError] = useState<any>(null)
  const [showErrorPanel, setShowErrorPanel] = useState(false)
  const isDevelopment = process.env.NODE_ENV === 'development'

  const logError = (error: any, context?: string) => {
    if (!isDevelopment) return

    devLog.error(context || 'Component Error', {
      error,
      timestamp: new Date().toISOString(),
      url: window.location.href
    })

    setLastError({
      error,
      context,
      timestamp: new Date().toISOString()
    })
    setShowErrorPanel(true)
  }

  const clearError = () => {
    setLastError(null)
    setShowErrorPanel(false)
  }

  const copyError = () => {
    if (!lastError) return

    const errorData = {
      context: lastError.context,
      error: lastError.error instanceof Error ? {
        message: lastError.error.message,
        name: lastError.error.name,
        stack: lastError.error.stack
      } : lastError.error,
      timestamp: lastError.timestamp,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
    alert('Error copied to clipboard!')
  }

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (showErrorPanel) {
      const timer = setTimeout(() => {
        setShowErrorPanel(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [showErrorPanel])

  return {
    logError,
    clearError,
    copyError,
    ErrorPanel: isDevelopment && showErrorPanel && lastError ? (
      <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-red-900">
            Development Error
          </h3>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
        
        <p className="text-sm text-red-700 mb-2">
          {lastError.context || 'An error occurred'}
        </p>
        
        <div className="bg-white border border-red-200 rounded p-2 mb-2">
          <pre className="text-xs text-gray-800 overflow-x-auto">
            {lastError.error instanceof Error 
              ? lastError.error.message 
              : JSON.stringify(lastError.error, null, 2)
            }
          </pre>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={copyError}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Copy for Claude
          </button>
          <button
            onClick={() => console.log(lastError)}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Log to Console
          </button>
        </div>
      </div>
    ) : null
  }
}

/**
 * Hook for form validation errors with development details
 */
export function useFormDevError() {
  const { logError, ErrorPanel } = useDevError()
  
  const handleFormError = (errors: any, formName?: string) => {
    if (process.env.NODE_ENV !== 'development') return
    
    const errorCount = Object.keys(errors).length
    if (errorCount === 0) return
    
    console.group(`📋 Form Validation Errors: ${formName || 'Form'}`)
    console.log(`Found ${errorCount} validation error(s):`)
    
    Object.entries(errors).forEach(([field, error]: [string, any]) => {
      console.log(`  ${field}:`, error.message || error)
    })
    
    console.log('\n💡 For Claude Code:')
    console.log(JSON.stringify({
      form: formName,
      errors,
      timestamp: new Date().toISOString()
    }, null, 2))
    console.groupEnd()
    
    logError(errors, `Form validation failed: ${formName}`)
  }
  
  return {
    handleFormError,
    ErrorPanel
  }
}