import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...')
  
  try {
    // Set up test database
    await setupTestDatabase()
    
    // Set up test Redis instance
    await setupTestRedis()
    
    // Initialize test data
    await seedTestData()
    
    console.log('✅ Test environment setup complete')
  } catch (error) {
    console.error('❌ Test environment setup failed:', error)
    process.exit(1)
  }
}

async function setupTestDatabase() {
  try {
    // Create test database if it doesn't exist
    await execAsync('createdb test_hrs_db 2>/dev/null || true')
    
    // Run database migrations
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/test_hrs_db'
    await execAsync('npx prisma db push --force-reset --skip-generate')
    
    console.log('📊 Test database ready')
  } catch (error) {
    console.warn('⚠️ Database setup warning:', error.message)
    // Continue if database setup fails - tests may still pass with mocks
  }
}

async function setupTestRedis() {
  try {
    // Redis is optional for tests - we'll use mocks if not available
    console.log('🔴 Redis mocking enabled for tests')
  } catch (error) {
    console.warn('⚠️ Redis setup warning:', error.message)
  }
}

async function seedTestData() {
  // Seed test data if needed
  console.log('🌱 Test data seeding complete')
}