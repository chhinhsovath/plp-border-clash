import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create default organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Humanitarian Relief Services',
      type: 'NGO',
      country: 'Global',
      contactEmail: 'info@hrs.openplp.com',
      contactPhone: '+1234567890',
      address: '123 Relief Street, Humanitarian City',
      website: 'https://hrs.openplp.com',
      isActive: true
    }
  })
  console.log('Created organization:', organization.name)

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hrs.openplp.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      organizationId: organization.id
    }
  })
  console.log('Created admin user:', adminUser.email)

  // Create sample site
  const site = await prisma.site.create({
    data: {
      name: 'Main Relief Camp',
      type: 'Camp',
      location: 'Border Region',
      coordinates: '0.0000, 0.0000',
      population: 5000,
      households: 1000,
      description: 'Primary humanitarian assistance camp',
      isActive: true,
      organizationId: organization.id
    }
  })
  console.log('Created site:', site.name)

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })