import { NextRequest, NextResponse } from 'next/server'
import { formatError, AppError } from './error-handler'
import { z } from 'zod'

export interface RouteContext {
  params?: Record<string, string>
  searchParams?: URLSearchParams
  user?: any
  token?: string
}

/**
 * Enhanced API route wrapper with automatic error handling and logging
 */
export function createAPIRoute<TBody = any, TResponse = any>(
  config: {
    name: string
    schema?: z.ZodSchema<TBody>
    requireAuth?: boolean
    handler: (
      request: NextRequest,
      body: TBody | null,
      context: RouteContext
    ) => Promise<NextResponse<TResponse>>
  }
) {
  return async (
    request: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ): Promise<NextResponse> => {
    const startTime = Date.now()
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Log request in development
    if (isDevelopment) {
      console.log('\n' + '━'.repeat(80))
      console.log(`📨 API Request: ${config.name}`)
      console.log('━'.repeat(80))
      console.log('Method:', request.method)
      console.log('URL:', request.url)
      console.log('Headers:', Object.fromEntries(request.headers.entries()))
      if (params) {
        console.log('Params:', params)
      }
    }
    
    try {
      // Parse search params
      const url = new URL(request.url)
      const searchParams = url.searchParams
      
      // Check authentication if required
      let user = null
      let token = null
      if (config.requireAuth) {
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
        }
        
        token = authHeader.substring(7)
        // Here you would verify the token and get the user
        // For now, we'll just pass the token
        // user = await verifyToken(token)
      }
      
      // Parse and validate body if needed
      let body: TBody | null = null
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        try {
          const rawBody = await request.json()
          
          if (isDevelopment) {
            console.log('Body:', JSON.stringify(rawBody, null, 2))
          }
          
          if (config.schema) {
            const validation = config.schema.safeParse(rawBody)
            if (!validation.success) {
              if (isDevelopment) {
                console.log('❌ Validation Failed:')
                console.log(JSON.stringify(validation.error.format(), null, 2))
              }
              throw validation.error
            }
            body = validation.data
          } else {
            body = rawBody
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw error
          }
          // JSON parsing error
          throw new AppError('Invalid JSON body', 400, 'INVALID_JSON')
        }
      }
      
      // Call the handler
      const context: RouteContext = {
        params,
        searchParams,
        user,
        token
      }
      
      const response = await config.handler(request, body, context)
      
      // Log response in development
      if (isDevelopment) {
        const duration = Date.now() - startTime
        const responseClone = response.clone()
        const responseBody = await responseClone.json().catch(() => null)
        
        console.log('\n' + '─'.repeat(40))
        console.log('✅ Response:', response.status)
        console.log('Duration:', `${duration}ms`)
        if (responseBody) {
          console.log('Body:', JSON.stringify(responseBody, null, 2).substring(0, 500))
        }
        console.log('━'.repeat(80) + '\n')
      }
      
      return response
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (isDevelopment) {
        console.log('\n' + '─'.repeat(40))
        console.log('❌ Error occurred after', `${duration}ms`)
      }
      
      const { response } = formatError(error, request)
      return response
    }
  }
}

/**
 * Batch API routes creator
 */
export function createAPIRoutes(
  routes: Record<string, Parameters<typeof createAPIRoute>[0]>
): Record<string, ReturnType<typeof createAPIRoute>> {
  const handlers: Record<string, ReturnType<typeof createAPIRoute>> = {}
  
  for (const [method, config] of Object.entries(routes)) {
    handlers[method] = createAPIRoute(config)
  }
  
  return handlers
}

/**
 * Type-safe API response helper
 */
export function apiResponse<T>(
  data: T,
  options?: {
    status?: number
    headers?: HeadersInit
    message?: string
  }
): NextResponse {
  const response = {
    success: true,
    data,
    message: options?.message,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers
  })
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  },
  options?: {
    status?: number
    headers?: HeadersInit
    message?: string
  }
): NextResponse {
  const response = {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    },
    message: options?.message,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers
  })
}

/**
 * No content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Redirect response
 */
export function redirectResponse(url: string, permanent = false): NextResponse {
  return NextResponse.redirect(url, permanent ? 308 : 307)
}