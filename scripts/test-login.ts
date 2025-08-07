import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testPassword() {
  const plainPassword = 'Admin@123'
  
  // Get admin user
  const user = await prisma.user.findUnique({
    where: { email: 'admin@hrs.openplp.com' }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  console.log('Testing password verification...')
  console.log('Plain password:', plainPassword)
  console.log('Stored hash:', user.password)
  
  // Test direct bcrypt comparison
  const isValid = await bcrypt.compare(plainPassword, user.password)
  console.log('Password valid?', isValid)
  
  // Generate new hash for comparison
  const newHash = await bcrypt.hash(plainPassword, 10)
  console.log('\nNew hash generated:', newHash)
  
  // Test with new hash
  const testWithNewHash = await bcrypt.compare(plainPassword, newHash)
  console.log('Test with new hash:', testWithNewHash)
}

testPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect())