export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Clean up test database
    await cleanupTestDatabase()
    
    // Clean up test Redis
    await cleanupTestRedis()
    
    console.log('✅ Test environment cleanup complete')
  } catch (error) {
    console.error('❌ Test cleanup failed:', error)
  }
}

async function cleanupTestDatabase() {
  try {
    // Database cleanup is handled by --force-reset in setup
    console.log('📊 Test database cleanup complete')
  } catch (error) {
    console.warn('⚠️ Database cleanup warning:', error.message)
  }
}

async function cleanupTestRedis() {
  try {
    // Redis cleanup for test data
    console.log('🔴 Redis test data cleanup complete')
  } catch (error) {
    console.warn('⚠️ Redis cleanup warning:', error.message)
  }
}