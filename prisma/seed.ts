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

  // Create test users
  const users = [
    {
      email: 'super@hrs.openplp.com',
      password: 'Super@123',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'ADMIN'
    },
    {
      email: 'admin@hrs.openplp.com',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    },
    {
      email: 'manager@hrs.openplp.com',
      password: 'Manager@123',
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER'
    },
    {
      email: 'dataentry@hrs.openplp.com',
      password: 'DataEntry@123',
      firstName: 'Data',
      lastName: 'Entry',
      role: 'DATA_ENTRY'
    },
    {
      email: 'viewer@hrs.openplp.com',
      password: 'Viewer@123',
      firstName: 'Viewer',
      lastName: 'User',
      role: 'VIEWER'
    }
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role as any,
        isActive: true,
        emailVerified: true,
        organizationId: organization.id
      }
    })
    console.log(`Created ${userData.role} user:`, user.email)
  }

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