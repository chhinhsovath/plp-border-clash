import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export interface ErrorDetails {
  message: string
  code?: string
  statusCode: number
  details?: any
  stack?: string
  timestamp: string
  path?: string
  method?: string
}

export class AppError extends Error {
  public statusCode: number
  public code?: string
  public details?: any
  public isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Format error for API response with detailed info in development
 */
export function formatError(
  error: unknown,
  request?: Request
): { response: NextResponse; logMessage: string } {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const timestamp = new Date().toISOString()
  
  let errorDetails: ErrorDetails = {
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp,
    path: request?.url,
    method: request?.method
  }
  
  let logMessage = ''
  
  // Handle different error types
  if (error instanceof AppError) {
    errorDetails = {
      ...errorDetails,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
      stack: isDevelopment ? error.stack : undefined
    }
    logMessage = `AppError: ${error.message} | Code: ${error.code} | Status: ${error.statusCode}`
  } 
  else if (error instanceof ZodError) {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
    
    errorDetails = {
      ...errorDetails,
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {
        errors: formattedErrors,
        issues: isDevelopment ? error.issues : undefined
      },
      stack: isDevelopment ? error.stack : undefined
    }
    logMessage = `ZodError: ${JSON.stringify(formattedErrors, null, 2)}`
  }
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let message = 'Database operation failed'
    let statusCode = 400
    
    switch (error.code) {
      case 'P2002':
        message = `Unique constraint violation on ${error.meta?.target}`
        break
      case 'P2025':
        message = 'Record not found'
        statusCode = 404
        break
      case 'P2003':
        message = 'Foreign key constraint violation'
        break
      case 'P2014':
        message = 'Required relation not found'
        break
      default:
        message = `Database error: ${error.code}`
    }
    
    errorDetails = {
      ...errorDetails,
      message,
      statusCode,
      code: `PRISMA_${error.code}`,
      details: isDevelopment ? {
        prismaCode: error.code,
        meta: error.meta,
        clientVersion: error.clientVersion
      } : undefined,
      stack: isDevelopment ? error.stack : undefined
    }
    logMessage = `PrismaError: ${error.code} - ${message} | Meta: ${JSON.stringify(error.meta)}`
  }
  else if (error instanceof Prisma.PrismaClientValidationError) {
    errorDetails = {
      ...errorDetails,
      message: 'Invalid database query',
      statusCode: 400,
      code: 'PRISMA_VALIDATION_ERROR',
      details: isDevelopment ? {
        message: error.message
      } : undefined,
      stack: isDevelopment ? error.stack : undefined
    }
    logMessage = `PrismaValidationError: ${error.message.substring(0, 500)}`
  }
  else if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('JWT') || error.message.includes('token')) {
      errorDetails.statusCode = 401
      errorDetails.code = 'AUTH_ERROR'
    } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
      errorDetails.statusCode = 403
      errorDetails.code = 'FORBIDDEN'
    }
    
    errorDetails = {
      ...errorDetails,
      message: isDevelopment ? error.message : 'An error occurred',
      stack: isDevelopment ? error.stack : undefined,
      details: isDevelopment ? {
        name: error.name,
        cause: (error as any).cause
      } : undefined
    }
    logMessage = `Error: ${error.name} - ${error.message}`
  }
  else {
    errorDetails = {
      ...errorDetails,
      message: isDevelopment ? String(error) : 'An unexpected error occurred',
      details: isDevelopment ? { raw: error } : undefined
    }
    logMessage = `UnknownError: ${String(error)}`
  }
  
  // Create detailed console output for development
  if (isDevelopment) {
    console.log('\n' + '='.repeat(80))
    console.log('🔴 ERROR DETAILS FOR DEBUGGING')
    console.log('='.repeat(80))
    console.log('Timestamp:', timestamp)
    console.log('Request:', `${request?.method} ${request?.url}`)
    console.log('Status:', errorDetails.statusCode)
    console.log('Code:', errorDetails.code || 'N/A')
    console.log('Message:', errorDetails.message)
    
    if (errorDetails.details) {
      console.log('\n📋 Additional Details:')
      console.log(JSON.stringify(errorDetails.details, null, 2))
    }
    
    if (errorDetails.stack) {
      console.log('\n📚 Stack Trace:')
      console.log(errorDetails.stack)
    }
    
    console.log('\n💡 Copy this error object for Claude Code:')
    console.log(JSON.stringify({
      error: errorDetails.message,
      code: errorDetails.code,
      details: errorDetails.details,
      path: errorDetails.path,
      method: errorDetails.method
    }, null, 2))
    console.log('='.repeat(80) + '\n')
  } else {
    // Production: Log to server but don't expose details
    console.error(`[${timestamp}] ${logMessage}`)
  }
  
  // Create response with appropriate level of detail
  const responseBody = isDevelopment 
    ? {
        error: errorDetails.message,
        code: errorDetails.code,
        statusCode: errorDetails.statusCode,
        details: errorDetails.details,
        stack: errorDetails.stack,
        timestamp: errorDetails.timestamp,
        path: errorDetails.path,
        method: errorDetails.method,
        environment: 'development',
        tip: 'Check terminal console for detailed error information'
      }
    : {
        error: errorDetails.message,
        code: errorDetails.code,
        statusCode: errorDetails.statusCode,
        timestamp: errorDetails.timestamp
      }
  
  return {
    response: NextResponse.json(responseBody, { status: errorDetails.statusCode }),
    logMessage
  }
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      const request = args[0] as Request
      const { response } = formatError(error, request)
      return response
    }
  }) as T
}

/**
 * Create error response helper
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): NextResponse {
  const error = new AppError(message, statusCode, code, details)
  const { response } = formatError(error)
  return response
}

/**
 * Validation error helper
 */
export function validationError(errors: Record<string, string>): NextResponse {
  return errorResponse(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    { errors }
  )
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string): NextResponse {
  return errorResponse(
    `${resource} not found`,
    404,
    'NOT_FOUND',
    { resource }
  )
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse {
  return errorResponse(message, 401, 'UNAUTHORIZED')
}

/**
 * Forbidden error helper
 */
export function forbiddenError(message: string = 'Forbidden'): NextResponse {
  return errorResponse(message, 403, 'FORBIDDEN')
}