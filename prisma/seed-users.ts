import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting user seeding...')

  // Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { id: 'default-org-id' },
    update: {},
    create: {
      id: 'default-org-id',
      name: 'Humanitarian Aid Organization',
      type: 'NGO',
      country: 'Global',
      contactEmail: 'contact@hrs.openplp.com',
      contactPhone: '+1234567890',
      address: 'Humanitarian Aid Center, Main Street',
      website: 'https://hrs.openplp.com',
      isActive: true
    }
  })

  console.log('✅ Created organization:', defaultOrg.name)

  // Test accounts with different roles
  const testAccounts = [
    {
      email: 'admin@hrs.openplp.com',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN' as const,
      description: 'Full administrative access'
    },
    {
      email: 'dataentry@hrs.openplp.com',
      password: 'DataEntry@123',
      firstName: 'Data Entry',
      lastName: 'User',
      role: 'DATA_ENTRY' as const,
      description: 'Can create and edit reports'
    },
    {
      email: 'viewer@hrs.openplp.com',
      password: 'Viewer@123',
      firstName: 'Viewer',
      lastName: 'User',
      role: 'VIEWER' as const,
      description: 'Read-only access'
    },
    {
      email: 'manager@hrs.openplp.com',
      password: 'Manager@123',
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER' as const,
      description: 'Manager with elevated privileges'
    }
  ]

  for (const account of testAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10)
    
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        password: hashedPassword,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role
      },
      create: {
        email: account.email,
        password: hashedPassword,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        organizationId: defaultOrg.id,
        emailVerified: true,
        isActive: true
      }
    })

    console.log(`✅ Created ${account.role} user: ${account.email}`)
  }

  // Create sample reports for testing
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@hrs.openplp.com' }
  })

  if (adminUser) {
    const sampleReports = [
      {
        title: 'Emergency Response Assessment - Q1 2025',
        description: 'Comprehensive assessment of emergency response activities',
        type: 'Assessment',
        status: 'PUBLISHED' as const
      },
      {
        title: 'Border Region Needs Assessment',
        description: 'Assessment of humanitarian needs in border regions',
        type: 'Situation Report',
        status: 'IN_REVIEW' as const
      },
      {
        title: 'Monthly Activity Report - January 2025',
        description: 'Summary of activities and interventions',
        type: 'Monthly',
        status: 'DRAFT' as const
      }
    ]

    for (const report of sampleReports) {
      await prisma.report.create({
        data: {
          title: report.title,
          type: report.type,
          status: report.status,
          reportingPeriodStart: new Date('2025-01-01'),
          reportingPeriodEnd: new Date('2025-03-31'),
          sectors: JSON.stringify(['Health', 'WASH', 'Shelter']),
          summary: report.description,
          content: `# ${report.title}\n\n${report.description}\n\n## Executive Summary\n\nThis report provides a comprehensive overview of humanitarian activities.`,
          data: JSON.stringify({ assessmentData: {} }),
          authorId: adminUser.id,
          organizationId: defaultOrg.id,
          publishedAt: report.status === 'PUBLISHED' ? new Date() : null
        }
      })
    }

    console.log('✅ Created sample reports')
  }

  console.log('🎉 Seeding completed successfully!')
  console.log('\n📋 Test Accounts:')
  console.log('=====================================')
  testAccounts.forEach(acc => {
    console.log(`${acc.role}:`)
    console.log(`  Email: ${acc.email}`)
    console.log(`  Password: ${acc.password}`)
    console.log(`  Access: ${acc.description}`)
    console.log('-------------------------------------')
  })
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })