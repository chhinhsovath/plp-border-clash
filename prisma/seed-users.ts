import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting user seeding...')

  // Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'humanitarian-aid-org' },
    update: {},
    create: {
      name: 'Humanitarian Aid Organization',
      slug: 'humanitarian-aid-org',
      description: 'Default organization for humanitarian reporting and assessment',
      primaryColor: '#dc2626',
      secondaryColor: '#f87171'
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
      email: 'editor@hrs.openplp.com',
      password: 'Editor@123',
      firstName: 'Editor',
      lastName: 'User',
      role: 'EDITOR' as const,
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
      email: 'super@hrs.openplp.com',
      password: 'Super@123',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN' as const,
      description: 'System administrator'
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
        slug: 'emergency-response-q1-2025',
        description: 'Comprehensive assessment of emergency response activities',
        status: 'PUBLISHED' as const
      },
      {
        title: 'Border Region Needs Assessment',
        slug: 'border-region-needs-assessment',
        description: 'Assessment of humanitarian needs in border regions',
        status: 'IN_REVIEW' as const
      },
      {
        title: 'Monthly Activity Report - January 2025',
        slug: 'monthly-report-jan-2025',
        description: 'Summary of activities and interventions',
        status: 'DRAFT' as const
      }
    ]

    for (const report of sampleReports) {
      await prisma.report.upsert({
        where: { 
          slug_organizationId: {
            slug: report.slug,
            organizationId: defaultOrg.id
          }
        },
        update: {},
        create: {
          title: report.title,
          slug: report.slug,
          description: report.description,
          status: report.status,
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