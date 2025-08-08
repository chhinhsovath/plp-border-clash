# Development Error Handling Guide

## Overview
This project includes a comprehensive error handling system designed to make development easier by providing clear, detailed, and copyable error messages that can be shared with Claude Code for quick debugging.

## Key Features

### 1. Enhanced Terminal Logging
- **Colored and formatted output** with icons for different log levels
- **Structured error details** that are easy to read
- **Copyable JSON format** specifically for Claude Code
- **Stack traces** in development mode
- **Request/Response details** for API calls

### 2. Browser Console Enhancements
- **Grouped console logs** for better organization
- **Detailed error context** including timestamps and locations
- **One-click copy** functionality for error data
- **Performance metrics** for API calls and database queries

### 3. Error Boundary UI
- **Visual error display** with recovery options
- **Copy error button** for sharing with Claude Code
- **Stack trace viewer** in development mode
- **Component stack** information

## Usage Examples

### API Route Error Handling

```typescript
// Use the enhanced API wrapper
import { createAPIRoute } from '@/lib/errors/api-wrapper'
import { AppError } from '@/lib/errors/error-handler'

export const GET = createAPIRoute({
  name: 'GET /api/users',
  requireAuth: true,
  schema: userQuerySchema, // Optional Zod schema
  handler: async (request, body, context) => {
    // Throw meaningful errors
    if (!user) {
      throw new AppError(
        'User not found',
        404,
        'USER_NOT_FOUND',
        { userId: id }
      )
    }
    
    // Errors are automatically logged with details
    return apiResponse(data)
  }
})
```

### Client-Side Error Handling

```typescript
// Use the enhanced fetch wrapper
import { fetchWithErrorHandling } from '@/lib/errors/client-error-handler'

try {
  const response = await fetchWithErrorHandling('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  const result = await response.json()
} catch (error) {
  // Error is automatically logged with full details
  // Check browser console for copyable error data
}
```

### Form Error Handling

```typescript
// Use the form error hook
import { useFormDevError } from '@/hooks/use-dev-error'

function MyForm() {
  const { handleFormError, ErrorPanel } = useFormDevError()
  
  const onSubmit = async (data) => {
    try {
      // Submit form
    } catch (error) {
      handleFormError(error, 'User Registration Form')
    }
  }
  
  return (
    <>
      {/* Your form */}
      {ErrorPanel} {/* Shows error panel in development */}
    </>
  )
}
```

### Development Logger

```typescript
import { devLog } from '@/lib/utils/dev-logger'

// Log with context
devLog.info('User action', { userId, action: 'login' })

// Log API calls
devLog.api('POST', '/api/reports', {
  body: requestData,
  response: responseData,
  duration: 234,
  status: 200
})

// Log database operations
devLog.db('CREATE', {
  model: 'User',
  query: { email: 'user@example.com' },
  duration: 45
})

// Measure performance
const timer = devLog.timer('Complex operation')
// ... do work
timer.end({ success: true })
```

## Error Information Flow

```
1. Error Occurs
   ↓
2. Error Handler Captures
   ↓
3. Terminal: Detailed formatted output with stack trace
   ↓
4. Browser: Grouped console with copyable JSON
   ↓
5. UI: Error boundary or error panel (dev only)
   ↓
6. Copy button → Claude Code
```

## Terminal Output Format

When an error occurs, you'll see:

```
================================================================================
🔴 ERROR DETAILS FOR DEBUGGING
================================================================================
Timestamp: 2024-12-08T10:30:45.123Z
Request: POST /api/reports
Status: 400
Code: VALIDATION_ERROR
Message: Validation failed

📋 Additional Details:
{
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}

📚 Stack Trace:
Error: Validation failed
    at validateRequest (...)
    at handler (...)

💡 Copy this error object for Claude Code:
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": { ... }
}
================================================================================
```

## Browser Console Format

```
🔴 API Error: POST /api/reports
  Status: 400 Bad Request
  Response: { error: "Validation failed", ... }
  Details: { errors: [...] }
  
  💡 For Claude Code debugging, copy this:
  {
    "endpoint": "/api/reports",
    "method": "POST",
    "status": 400,
    "error": { ... }
  }
```

## Best Practices

1. **Always throw AppError** for known errors with meaningful messages
2. **Include error codes** for easier identification
3. **Add context data** to errors (IDs, operations, etc.)
4. **Use the dev logger** for important operations
5. **Check both console AND terminal** for complete error information

## Quick Copy for Claude Code

When you encounter an error:

1. **Terminal**: Look for "💡 Copy this error object for Claude Code"
2. **Browser**: Look for "💡 For Claude Code debugging, copy this"
3. **Error UI**: Click the "Copy for Claude" button
4. Paste the JSON directly to Claude Code with your question

## Environment Variables

The error handling system respects:
- `NODE_ENV=development` - Shows detailed errors
- `NODE_ENV=production` - Hides sensitive information

## Troubleshooting

### Error not showing details?
- Check `NODE_ENV` is set to `development`
- Check both browser console AND terminal output
- Look for grouped console messages (click to expand)

### Can't copy error?
- Use the Copy button in error panels
- Or manually select and copy from console
- Terminal errors can be selected and copied directly

### Error boundary not catching?
- Ensure it's wrapped around your components
- Check that it's not inside another error boundary
- Some errors (like async) need special handling

## Integration with Claude Code

When sharing errors with Claude Code, include:
1. The copied error JSON
2. What you were trying to do
3. Any relevant code context

Example message to Claude Code:
```
I'm getting this error when creating a report:
[paste error JSON]
The form was submitted with valid data but fails on the API side.
```

This will help Claude Code quickly identify and fix the issue!