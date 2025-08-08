import { z } from 'zod'

// Environment variable schema
export const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Application
  PORT: z.string().default('3000').transform(Number),
  APP_URL: z.string().url().optional(),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MIN: z.string().default('2').transform(Number),
  DATABASE_POOL_MAX: z.string().default('10').transform(Number),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d').optional(),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default('6379').transform(Number).optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Upstash Rate Limiting (optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // File Storage
  STORAGE_TYPE: z.enum(['local', 'vercel-blob', 's3']).default('local').optional(),
  VERCEL_BLOB_TOKEN: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1').optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // External APIs (optional)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info').optional(),
  
  // Security
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  
  // Feature Flags
  ENABLE_REDIS_CACHE: z.string().default('false').transform(val => val === 'true'),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().default('false').transform(val => val === 'true'),
  ENABLE_WEBSOCKETS: z.string().default('false').transform(val => val === 'true'),
  ENABLE_AUDIT_LOG: z.string().default('true').transform(val => val === 'true'),
  
  // Development
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().optional()
})

// Parse and validate environment variables
export function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
    throw new Error('Invalid environment variables')
  }
  
  return parsed.data
}

// Type for validated environment variables
export type Env = z.infer<typeof envSchema>

// Export validated env (to be called once at app startup)
let env: Env | undefined

export function getEnv(): Env {
  if (!env) {
    env = validateEnv()
  }
  return env
}

// Helper to check if we're in production
export const isProduction = () => getEnv().NODE_ENV === 'production'

// Helper to check if we're in development
export const isDevelopment = () => getEnv().NODE_ENV === 'development'

// Helper to check if we're in test
export const isTest = () => getEnv().NODE_ENV === 'test'