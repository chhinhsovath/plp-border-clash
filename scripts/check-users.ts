import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking users in database...\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      organizationId: true,
      createdAt: true
    }
  })
  
  console.log(`Found ${users.length} users:`)
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`)
  })
  
  // Check if admin user exists
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@hrs.openplp.com' }
  })
  
  if (adminUser) {
    console.log('\n✅ Admin user exists')
    console.log('Password hash length:', adminUser.password.length)
    console.log('Password starts with $2', adminUser.password.startsWith('$2'))
  } else {
    console.log('\n❌ Admin user not found!')
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })