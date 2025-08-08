'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
      copied: false
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      console.group('🔴 React Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.log('\n💡 For Claude Code debugging, copy this:')
      console.log(JSON.stringify({
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }, null, 2))
      console.groupEnd()
    }
    
    this.setState({
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    })
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  copyError = () => {
    const { error, errorInfo } = this.state
    const errorData = {
      error: {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      },
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  render() {
    const { hasError, error, errorInfo, showDetails, copied } = this.state
    const { children, fallback } = this.props
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 border-b border-red-200 p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h1 className="text-xl font-semibold text-red-900">
                      Something went wrong
                    </h1>
                    <p className="mt-2 text-sm text-red-700">
                      {error?.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  
                  {isDevelopment && (
                    <>
                      <button
                        onClick={this.copyError}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? 'Copied!' : 'Copy Error'}
                      </button>
                      
                      <button
                        onClick={this.toggleDetails}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {showDetails ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show Details
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Development Error Details */}
                {isDevelopment && showDetails && (
                  <div className="mt-4 space-y-4">
                    {/* Error Name */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Error Type</h3>
                      <p className="text-sm text-gray-900 font-mono">{error?.name}</p>
                    </div>

                    {/* Stack Trace */}
                    {error?.stack && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Stack Trace</h3>
                        <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap font-mono">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component Stack */}
                    {errorInfo?.componentStack && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Component Stack</h3>
                        <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap font-mono">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Tips for Debugging */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">
                        💡 Debugging Tips
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Check the browser console for detailed error logs</li>
                        <li>• Check the terminal for server-side error details</li>
                        <li>• Use the "Copy Error" button to share with Claude Code</li>
                        <li>• The error details above show the exact component and line</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Production Message */}
                {!isDevelopment && (
                  <div className="text-sm text-gray-600">
                    <p>We apologize for the inconvenience. Please try refreshing the page.</p>
                    <p className="mt-2">If the problem persists, please contact support.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook version for functional components
 */
export function useAsyncError() {
  const [, setError] = React.useState()
  
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error
      })
    },
    [setError]
  )
}