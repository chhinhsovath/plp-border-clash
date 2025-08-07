import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  // Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      description: 'Default organization for new users',
    }
  })

  // Create a demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-humanitarian-org' },
    update: {},
    create: {
      name: 'Demo Humanitarian Organization',
      slug: 'demo-humanitarian-org',
      description: 'A demo humanitarian organization for testing',
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
    }
  })

  // Create admin user
  const adminPassword = await hashPassword('Admin123!')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      organizationId: demoOrg.id,
      emailVerified: true,
    }
  })

  // Create editor user
  const editorPassword = await hashPassword('Editor123!')
  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      password: editorPassword,
      firstName: 'Editor',
      lastName: 'User',
      role: 'EDITOR',
      organizationId: demoOrg.id,
      emailVerified: true,
    }
  })

  // Create templates
  const rapidAssessmentTemplate = await prisma.template.create({
    data: {
      name: 'Rapid Assessment Template',
      description: 'Standard template for rapid humanitarian assessments',
      category: 'Assessment',
      organizationId: demoOrg.id,
      structure: {
        sections: [
          {
            title: 'Executive Summary',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          },
          {
            title: 'Situation Overview',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          },
          {
            title: 'Affected Population',
            type: 'STATISTICS',
            defaultContent: {
              statistics: []
            }
          },
          {
            title: 'Assessment Findings',
            type: 'ASSESSMENT_DATA',
            defaultContent: {
              findings: []
            }
          },
          {
            title: 'Recommendations',
            type: 'RECOMMENDATIONS',
            defaultContent: {
              recommendations: []
            }
          }
        ]
      }
    }
  })

  const situationReportTemplate = await prisma.template.create({
    data: {
      name: 'Situation Report Template',
      description: 'Template for regular situation reports',
      category: 'Report',
      organizationId: demoOrg.id,
      structure: {
        sections: [
          {
            title: 'Highlights',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          },
          {
            title: 'Situation Overview',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          },
          {
            title: 'Humanitarian Response',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          },
          {
            title: 'Operational Constraints',
            type: 'TEXT',
            defaultContent: {
              text: ''
            }
          }
        ]
      }
    }
  })

  // Create sample report
  const sampleReport = await prisma.report.create({
    data: {
      title: 'Sample Humanitarian Assessment Report',
      slug: 'sample-humanitarian-assessment-report',
      description: 'This is a sample report to demonstrate the system capabilities',
      status: 'DRAFT',
      authorId: adminUser.id,
      organizationId: demoOrg.id,
      metadata: {
        location: 'Sample Region',
        date: new Date().toISOString(),
      }
    }
  })

  // Create sections for sample report
  await prisma.section.createMany({
    data: [
      {
        reportId: sampleReport.id,
        title: 'Executive Summary',
        type: 'TEXT',
        order: 0,
        content: {
          text: 'This is a sample executive summary for the humanitarian assessment report.'
        }
      },
      {
        reportId: sampleReport.id,
        title: 'Affected Population Statistics',
        type: 'STATISTICS',
        order: 1,
        content: {
          statistics: [
            { label: 'Total Affected', value: 10000, unit: 'people' },
            { label: 'Households', value: 2000, unit: 'families' },
            { label: 'Children under 5', value: 1500, unit: 'children' },
          ]
        }
      },
      {
        reportId: sampleReport.id,
        title: 'Assessment Findings',
        type: 'ASSESSMENT_DATA',
        order: 2,
        content: {
          findings: [
            {
              sector: 'Health',
              status: 'Critical',
              description: 'Limited access to healthcare facilities'
            },
            {
              sector: 'WASH',
              status: 'Warning',
              description: 'Water supply insufficient for population needs'
            }
          ]
        }
      }
    ]
  })

  console.log('✅ Database seeded successfully')
  console.log('📧 Admin login: admin@example.com / Admin123!')
  console.log('📧 Editor login: editor@example.com / Editor123!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })