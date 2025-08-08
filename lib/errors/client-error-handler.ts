/**
 * Client-side error handler with detailed development information
 */

export interface ClientError {
  message: string
  code?: string
  statusCode?: number
  details?: any
  stack?: string
  timestamp: string
  url?: string
  method?: string
}

/**
 * Enhanced fetch wrapper that provides detailed error information
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      let errorData: any = {}
      
      if (contentType?.includes('application/json')) {
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: await response.text() }
        }
      } else {
        errorData = { message: await response.text() }
      }
      
      // In development, log detailed error info
      if (isDevelopment) {
        console.group(`🔴 API Error: ${options?.method || 'GET'} ${url}`)
        console.log('Status:', response.status, response.statusText)
        console.log('Response:', errorData)
        
        if (errorData.details) {
          console.log('Details:', errorData.details)
        }
        
        if (errorData.stack) {
          console.log('Server Stack:', errorData.stack)
        }
        
        console.log('\n💡 For Claude Code debugging, copy this:')
        console.log(JSON.stringify({
          endpoint: url,
          method: options?.method || 'GET',
          status: response.status,
          error: errorData
        }, null, 2))
        console.groupEnd()
      }
      
      throw new APIError(
        errorData.error || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.code,
        errorData.details,
        url,
        options?.method
      )
    }
    
    return response
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    
    // Network or other errors
    if (isDevelopment) {
      console.group(`🔴 Network/Fetch Error: ${options?.method || 'GET'} ${url}`)
      console.error('Error:', error)
      console.log('\n💡 For Claude Code debugging:')
      console.log(JSON.stringify({
        endpoint: url,
        method: options?.method || 'GET',
        error: error instanceof Error ? error.message : String(error),
        type: 'network_error'
      }, null, 2))
      console.groupEnd()
    }
    
    throw new APIError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'NETWORK_ERROR',
      { originalError: error instanceof Error ? error.message : error },
      url,
      options?.method
    )
  }
}

/**
 * Custom API Error class with detailed information
 */
export class APIError extends Error {
  public statusCode: number
  public code?: string
  public details?: any
  public url?: string
  public method?: string
  public timestamp: string
  
  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    url?: string,
    method?: string
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.url = url
    this.method = method
    this.timestamp = new Date().toISOString()
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      url: this.url,
      method: this.method,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    }
  }
}

/**
 * API client with built-in error handling
 */
export class APIClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  
  constructor(baseURL: string = '') {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }
  
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }
  
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetchWithErrorHandling(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options?.headers
      }
    })
    
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return response.json()
    }
    
    return response.text() as any
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET'
    })
  }
  
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }
  
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }
  
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    })
  }
}

/**
 * Hook for handling errors in React components
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      console.group(`🔴 Component Error${context ? `: ${context}` : ''}`)
      
      if (error instanceof APIError) {
        console.log('API Error:', error.toJSON())
      } else if (error instanceof Error) {
        console.log('Error:', error.message)
        console.log('Stack:', error.stack)
      } else {
        console.log('Unknown Error:', error)
      }
      
      console.log('\n💡 For Claude Code debugging:')
      console.log(JSON.stringify({
        context,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          ...(error instanceof APIError ? error.toJSON() : {})
        } : String(error),
        timestamp: new Date().toISOString()
      }, null, 2))
      console.groupEnd()
    }
    
    // You can also send to error tracking service here
    // sendToErrorTracking(error, context)
  }
  
  return { handleError }
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: unknown): {
  title: string
  message: string
  details?: string
} {
  if (error instanceof APIError) {
    let title = 'Request Failed'
    let message = error.message
    
    switch (error.statusCode) {
      case 400:
        title = 'Invalid Request'
        break
      case 401:
        title = 'Authentication Required'
        message = 'Please log in to continue'
        break
      case 403:
        title = 'Access Denied'
        message = 'You do not have permission to perform this action'
        break
      case 404:
        title = 'Not Found'
        break
      case 500:
        title = 'Server Error'
        message = 'Something went wrong on our end. Please try again later.'
        break
      case 0:
        title = 'Connection Error'
        message = 'Unable to connect to the server. Please check your internet connection.'
        break
    }
    
    return {
      title,
      message,
      details: process.env.NODE_ENV === 'development' 
        ? JSON.stringify(error.details, null, 2) 
        : undefined
    }
  }
  
  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
  
  return {
    title: 'Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? String(error) : undefined
  }
}

// Export singleton API client
export const apiClient = new APIClient('/api')