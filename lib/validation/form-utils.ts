import { z } from 'zod'
import { UseFormSetError } from 'react-hook-form'

/**
 * Format Zod errors for display in forms
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!formatted[path]) {
      formatted[path] = err.message
    }
  })
  
  return formatted
}

/**
 * Set form errors from Zod validation
 */
export function setFormErrors<T extends Record<string, any>>(
  error: z.ZodError,
  setError: UseFormSetError<T>
) {
  error.errors.forEach((err) => {
    const field = err.path[err.path.length - 1] as keyof T
    setError(field as any, {
      type: 'manual',
      message: err.message
    })
  })
}

/**
 * Parse form data with Zod schema and handle errors
 */
export async function parseFormData<T extends z.ZodType>(
  schema: T,
  data: unknown
): Promise<{ success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> }> {
  try {
    const parsed = await schema.parseAsync(data)
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatZodError(error) }
    }
    throw error
  }
}

/**
 * Create a safe parser that returns undefined on error
 */
export function createSafeParser<T extends z.ZodType>(schema: T) {
  return (data: unknown): z.infer<T> | undefined => {
    const result = schema.safeParse(data)
    return result.success ? result.data : undefined
  }
}

/**
 * Transform empty strings to undefined (useful for optional fields)
 */
export const emptyStringToUndefined = z.string().transform((val) => val === '' ? undefined : val)

/**
 * Common form field transformers
 */
export const formTransformers = {
  trimString: z.string().transform((val) => val.trim()),
  
  normalizeEmail: z.string().email().transform((val) => val.toLowerCase().trim()),
  
  stringToNumber: z.string().transform((val) => {
    const num = Number(val)
    if (isNaN(num)) throw new Error('Invalid number')
    return num
  }),
  
  stringToBoolean: z.string().transform((val) => val === 'true' || val === '1'),
  
  stringToDate: z.string().transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  }),
  
  fileToString: z.instanceof(File).transform(async (file) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  })
}

/**
 * Common form field validators
 */
export const formValidators = {
  requiredString: z.string().min(1, 'This field is required'),
  
  optionalString: z.string().optional().or(z.literal('')),
  
  phoneNumber: z.string().regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/,
    'Please enter a valid phone number'
  ),
  
  url: z.string().url('Please enter a valid URL'),
  
  positiveNumber: z.number().positive('Must be a positive number'),
  
  percentage: z.number().min(0, 'Must be at least 0').max(100, 'Must be at most 100'),
  
  futureDate: z.date().refine(
    (date) => date > new Date(),
    'Date must be in the future'
  ),
  
  pastDate: z.date().refine(
    (date) => date < new Date(),
    'Date must be in the past'
  ),
  
  fileSize: (maxSizeInMB: number) =>
    z.instanceof(File).refine(
      (file) => file.size <= maxSizeInMB * 1024 * 1024,
      `File size must be less than ${maxSizeInMB}MB`
    ),
  
  fileType: (allowedTypes: string[]) =>
    z.instanceof(File).refine(
      (file) => allowedTypes.includes(file.type),
      `File type must be one of: ${allowedTypes.join(', ')}`
    ),
  
  imageFile: z.instanceof(File).refine(
    (file) => file.type.startsWith('image/'),
    'File must be an image'
  )
}

/**
 * Create a conditional validator
 */
export function conditionalValidator<T extends z.ZodType>(
  condition: boolean,
  schema: T,
  fallback: z.ZodType = z.any()
): z.ZodType {
  return condition ? schema : fallback
}

/**
 * Merge multiple schemas with proper typing
 */
export function mergeSchemas<T extends z.ZodRawShape, U extends z.ZodRawShape>(
  schema1: z.ZodObject<T>,
  schema2: z.ZodObject<U>
): z.ZodObject<T & U> {
  return schema1.merge(schema2)
}

/**
 * Create a schema with dynamic fields
 */
export function createDynamicSchema<T extends Record<string, z.ZodType>>(
  fields: T
): z.ZodObject<T> {
  return z.object(fields)
}

/**
 * Validate a single field
 */
export async function validateField<T extends z.ZodType>(
  schema: T,
  value: unknown
): Promise<{ valid: boolean; error?: string }> {
  try {
    await schema.parseAsync(value)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message }
    }
    return { valid: false, error: 'Validation failed' }
  }
}

/**
 * Create a debounced validator for real-time validation
 */
export function createDebouncedValidator<T extends z.ZodType>(
  schema: T,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (value: unknown, callback: (result: { valid: boolean; error?: string }) => void) => {
    if (timeoutId) clearTimeout(timeoutId)
    
    timeoutId = setTimeout(async () => {
      const result = await validateField(schema, value)
      callback(result)
    }, delay)
  }
}

/**
 * Extract default values from a Zod schema
 */
export function getDefaultValues<T extends z.ZodObject<any>>(
  schema: T
): z.infer<T> {
  const shape = schema.shape
  const defaults: any = {}
  
  for (const key in shape) {
    const field = shape[key]
    
    if (field instanceof z.ZodDefault) {
      defaults[key] = typeof field._def.defaultValue === 'function' 
        ? field._def.defaultValue() 
        : field._def.defaultValue
    } else if (field instanceof z.ZodOptional) {
      defaults[key] = undefined
    } else if (field instanceof z.ZodString) {
      defaults[key] = ''
    } else if (field instanceof z.ZodNumber) {
      defaults[key] = 0
    } else if (field instanceof z.ZodBoolean) {
      defaults[key] = false
    } else if (field instanceof z.ZodArray) {
      defaults[key] = []
    } else if (field instanceof z.ZodObject) {
      defaults[key] = getDefaultValues(field)
    }
  }
  
  return defaults
}