/**
 * Enhanced development logger that provides clear, copyable error messages
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class DevLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isClient = typeof window !== 'undefined'
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const location = this.isClient ? 'CLIENT' : 'SERVER'
    
    return `[${timestamp}] [${location}] [${level.toUpperCase()}] ${message}`
  }
  
  private getIcon(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍'
      case 'info': return 'ℹ️'
      case 'warn': return '⚠️'
      case 'error': return '🔴'
    }
  }
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level !== 'error') {
      return
    }
    
    const icon = this.getIcon(level)
    const formattedMessage = this.formatMessage(level, message, context)
    
    // Use appropriate console method
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    
    if (context && Object.keys(context).length > 0) {
      console.group(`${icon} ${message}`)
      console[consoleMethod](formattedMessage)
      
      // Log each context item separately for clarity
      Object.entries(context).forEach(([key, value]) => {
        if (value instanceof Error) {
          console.log(`${key}:`, {
            message: value.message,
            name: value.name,
            stack: value.stack
          })
        } else if (typeof value === 'object' && value !== null) {
          console.log(`${key}:`, JSON.stringify(value, null, 2))
        } else {
          console.log(`${key}:`, value)
        }
      })
      
      // Add copyable version for Claude Code
      if (level === 'error' || level === 'warn') {
        console.log('\n💡 Copy for Claude Code:')
        console.log(JSON.stringify({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
          location: this.isClient ? 'client' : 'server'
        }, null, 2))
      }
      
      console.groupEnd()
    } else {
      console[consoleMethod](`${icon} ${formattedMessage}`)
    }
  }
  
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }
  
  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }
  
  /**
   * Log API requests with detailed information
   */
  api(method: string, url: string, details?: {
    body?: any
    response?: any
    error?: any
    duration?: number
    status?: number
  }) {
    if (!this.isDevelopment) return
    
    const isError = details?.error || (details?.status && details.status >= 400)
    
    console.group(`${isError ? '🔴' : '🌐'} API ${method} ${url}`)
    
    if (details?.body) {
      console.log('Request Body:', JSON.stringify(details.body, null, 2))
    }
    
    if (details?.status) {
      console.log('Status:', details.status)
    }
    
    if (details?.duration) {
      console.log('Duration:', `${details.duration}ms`)
    }
    
    if (details?.response) {
      console.log('Response:', JSON.stringify(details.response, null, 2))
    }
    
    if (details?.error) {
      console.error('Error:', details.error)
      console.log('\n💡 Copy for Claude Code:')
      console.log(JSON.stringify({
        method,
        url,
        ...details,
        error: details.error instanceof Error ? {
          message: details.error.message,
          name: details.error.name,
          stack: details.error.stack
        } : details.error
      }, null, 2))
    }
    
    console.groupEnd()
  }
  
  /**
   * Log database queries with details
   */
  db(operation: string, details?: {
    model?: string
    query?: any
    result?: any
    error?: any
    duration?: number
  }) {
    if (!this.isDevelopment) return
    
    const isError = !!details?.error
    
    console.group(`${isError ? '🔴' : '🗄️'} DB ${operation}`)
    
    if (details?.model) {
      console.log('Model:', details.model)
    }
    
    if (details?.query) {
      console.log('Query:', JSON.stringify(details.query, null, 2))
    }
    
    if (details?.duration) {
      console.log('Duration:', `${details.duration}ms`)
    }
    
    if (details?.result) {
      const resultStr = JSON.stringify(details.result, null, 2)
      console.log('Result:', resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr)
    }
    
    if (details?.error) {
      console.error('Error:', details.error)
      console.log('\n💡 Copy for Claude Code:')
      console.log(JSON.stringify({
        operation,
        ...details,
        error: details.error instanceof Error ? {
          message: details.error.message,
          name: details.error.name,
          stack: details.error.stack
        } : details.error
      }, null, 2))
    }
    
    console.groupEnd()
  }
  
  /**
   * Log React component errors
   */
  component(componentName: string, error: Error, props?: any) {
    if (!this.isDevelopment) return
    
    console.group(`🔴 Component Error: ${componentName}`)
    console.error('Error:', error)
    
    if (props) {
      console.log('Props:', JSON.stringify(props, null, 2))
    }
    
    console.log('\n💡 Copy for Claude Code:')
    console.log(JSON.stringify({
      component: componentName,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      props,
      timestamp: new Date().toISOString()
    }, null, 2))
    
    console.groupEnd()
  }
  
  /**
   * Create a timer for performance logging
   */
  timer(label: string) {
    const start = Date.now()
    
    return {
      end: (context?: LogContext) => {
        const duration = Date.now() - start
        if (this.isDevelopment) {
          console.log(`⏱️ ${label}: ${duration}ms`, context || {})
        }
        return duration
      }
    }
  }
  
  /**
   * Table logging for structured data
   */
  table(data: any[], columns?: string[]) {
    if (!this.isDevelopment) return
    
    if (columns && data.length > 0) {
      const filtered = data.map(item => {
        const filtered: any = {}
        columns.forEach(col => {
          filtered[col] = item[col]
        })
        return filtered
      })
      console.table(filtered)
    } else {
      console.table(data)
    }
  }
}

// Export singleton instance
export const devLog = new DevLogger()

// Export for type usage
export type { LogContext }

/**
 * Utility to measure async operation performance
 */
export async function measureAsync<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  const timer = devLog.timer(label)
  try {
    const result = await operation()
    timer.end({ success: true })
    return result
  } catch (error) {
    timer.end({ success: false, error })
    throw error
  }
}

/**
 * Utility to wrap functions with automatic error logging
 */
export function withLogging<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: Parameters<T>) => {
    const fnName = name || fn.name || 'anonymous'
    devLog.debug(`Calling ${fnName}`, { args })
    
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result
          .then(res => {
            devLog.debug(`${fnName} completed`, { result: res })
            return res
          })
          .catch(error => {
            devLog.error(`${fnName} failed`, { error, args })
            throw error
          })
      }
      
      devLog.debug(`${fnName} completed`, { result })
      return result
    } catch (error) {
      devLog.error(`${fnName} failed`, { error, args })
      throw error
    }
  }) as T
}