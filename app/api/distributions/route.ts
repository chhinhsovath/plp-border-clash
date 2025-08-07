import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const distributionSchema = z.object({
  individualId: z.string(),
  householdId: z.string(),
  distributionType: z.enum(['FOOD', 'NFI', 'HYGIENE', 'MIXED']),
  distributionDate: z.string(),
  siteId: z.string(),
  items: z.array(z.object({
    itemType: z.string(),
    itemName: z.string(),
    quantity: z.number(),
    unit: z.string(),
    value: z.number().optional()
  })),
  verificationMethod: z.enum(['SIGNATURE', 'FINGERPRINT', 'QR_CODE', 'BIOMETRIC']),
  beneficiaryPresent: z.boolean(),
  alternateRecipient: z.object({
    name: z.string(),
    relationship: z.string(),
    idDocument: z.string().optional()
  }).optional(),
  qualityControl: z.object({
    itemCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    expiryChecked: z.boolean(),
    issues: z.string().optional()
  }).optional(),
  distributorName: z.string(),
  notes: z.string().optional()
})

// GET /api/distributions
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    try {
      jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const individualId = searchParams.get('individualId')
    const householdId = searchParams.get('householdId')
    const distributionType = searchParams.get('distributionType')
    const siteId = searchParams.get('siteId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (individualId) {
      where.individualId = individualId
    }
    
    if (householdId) {
      where.householdId = householdId
    }
    
    if (distributionType) {
      where.distributionType = distributionType
    }
    
    if (siteId) {
      where.siteId = siteId
    }
    
    if (startDate || endDate) {
      where.distributionDate = {}
      if (startDate) {
        where.distributionDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.distributionDate.lte = new Date(endDate)
      }
    }

    // Fetch distributions
    const [distributions, total] = await Promise.all([
      prisma.distribution.findMany({
        where,
        skip,
        take: limit,
        include: {
          individual: {
            select: {
              id: true,
              individualCode: true,
              fullLegalName: true,
              age: true,
              gender: true,
              householdId: true
            }
          },
          household: {
            select: {
              id: true,
              householdCode: true,
              familySize: true
            }
          }
        },
        orderBy: {
          distributionDate: 'desc'
        }
      }),
      prisma.distribution.count({ where })
    ])

    // Get distribution statistics
    const stats = await prisma.distribution.groupBy({
      by: ['distributionType'],
      where: {
        distributionDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      _count: {
        id: true
      }
    })

    // Calculate value totals by type
    const valueByType = await prisma.distribution.groupBy({
      by: ['distributionType'],
      where: {
        distributionDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      },
      _sum: {
        totalValue: true
      }
    })

    return NextResponse.json({
      success: true,
      data: distributions,
      statistics: {
        byType: stats,
        valueByType: valueByType,
        totalDistributions: total
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching distributions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/distributions
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: any
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const validation = distributionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    
    // Verify individual exists
    const individual = await prisma.individual.findUnique({
      where: { id: data.individualId },
      include: { household: true }
    })
    
    if (!individual) {
      return NextResponse.json(
        { error: 'Individual not found' },
        { status: 404 }
      )
    }
    
    // Verify household matches
    if (individual.householdId !== data.householdId) {
      return NextResponse.json(
        { error: 'Individual does not belong to specified household' },
        { status: 400 }
      )
    }
    
    // Check for duplicate distributions (same individual, same date, same type)
    const existingDistribution = await prisma.distribution.findFirst({
      where: {
        individualId: data.individualId,
        distributionType: data.distributionType,
        distributionDate: new Date(data.distributionDate)
      }
    })
    
    if (existingDistribution) {
      console.warn(`Duplicate distribution detected for ${individual.individualCode} on ${data.distributionDate}`)
    }
    
    // Calculate total value
    const totalValue = data.items.reduce((sum, item) => sum + (item.value || 0), 0)
    
    // Create distribution record
    const distribution = await prisma.distribution.create({
      data: {
        individualId: data.individualId,
        householdId: data.householdId,
        distributionType: data.distributionType,
        distributionDate: new Date(data.distributionDate),
        siteId: data.siteId,
        totalValue,
        verificationMethod: data.verificationMethod,
        beneficiaryPresent: data.beneficiaryPresent,
        distributorName: data.distributorName,
        items: JSON.stringify(data.items),
        alternateRecipient: data.alternateRecipient ? JSON.stringify(data.alternateRecipient) : null,
        qualityControl: data.qualityControl ? JSON.stringify(data.qualityControl) : null,
        notes: data.notes
      },
      include: {
        individual: true,
        household: true
      }
    })
    
    // Create individual distribution item records for detailed tracking
    for (const item of data.items) {
      await prisma.distributionItem.create({
        data: {
          distributionId: distribution.id,
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          value: item.value || 0
        }
      })
    }
    
    // Update household distribution history
    await prisma.household.update({
      where: { id: data.householdId },
      data: {
        lastDistributionDate: new Date(data.distributionDate)
      }
    })
    
    // Create alerts for high-value or irregular distributions
    if (totalValue > 100) {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'DISTRIBUTION_ALERT',
          title: 'High Value Distribution',
          message: `High value distribution (${totalValue} USD) to ${individual.fullLegalName} (${individual.individualCode})`,
          data: JSON.stringify({
            distributionId: distribution.id,
            individualId: individual.id,
            value: totalValue,
            type: data.distributionType
          })
        }
      })
    }
    
    // Check distribution frequency
    const recentDistributions = await prisma.distribution.count({
      where: {
        individualId: data.individualId,
        distributionType: data.distributionType,
        distributionDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      }
    })
    
    if (recentDistributions > 1) {
      await prisma.notification.create({
        data: {
          userId: decoded.userId,
          type: 'DISTRIBUTION_WARNING',
          title: 'Frequent Distribution Alert',
          message: `Multiple ${data.distributionType} distributions to ${individual.fullLegalName} within 7 days`,
          data: JSON.stringify({
            distributionId: distribution.id,
            individualId: individual.id,
            frequency: recentDistributions,
            type: data.distributionType
          })
        }
      })
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: decoded.userId,
        action: 'CREATE_DISTRIBUTION',
        entity: 'Distribution',
        entityId: distribution.id,
        metadata: JSON.stringify({
          individualCode: individual.individualCode,
          householdCode: individual.household?.householdCode,
          distributionType: data.distributionType,
          totalValue,
          itemCount: data.items.length,
          site: data.siteId
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: distribution,
      message: `${data.distributionType} distribution recorded for ${individual.fullLegalName}`
    })
  } catch (error) {
    console.error('Error creating distribution:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/distributions/statistics
export async function getStatistics(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    try {
      jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (jwtError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get comprehensive distribution statistics
    const [
      totalDistributions,
      totalBeneficiaries,
      totalValue,
      distributionsByType,
      distributionsByMonth,
      topItems,
      sitePerformance,
      verificationMethods,
      qualityIssues
    ] = await Promise.all([
      // Total distributions this month
      prisma.distribution.count({
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      }),
      
      // Unique beneficiaries this month
      prisma.distribution.groupBy({
        by: ['individualId'],
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      }).then(groups => groups.length),
      
      // Total value distributed this month
      prisma.distribution.aggregate({
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        },
        _sum: {
          totalValue: true
        }
      }),
      
      // Distributions by type
      prisma.distribution.groupBy({
        by: ['distributionType'],
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalValue: true
        }
      }),
      
      // Monthly distribution trends
      prisma.$queryRaw`
        SELECT 
          strftime('%Y-%m', distributionDate) as month,
          distributionType,
          COUNT(*) as count,
          SUM(totalValue) as totalValue
        FROM Distribution
        WHERE distributionDate >= datetime('now', '-6 months')
        GROUP BY month, distributionType
        ORDER BY month DESC
      `,
      
      // Most distributed items
      prisma.$queryRaw`
        SELECT 
          json_extract(di.itemName, '$') as itemName,
          json_extract(di.itemType, '$') as itemType,
          COUNT(*) as distributionCount,
          SUM(di.quantity) as totalQuantity,
          SUM(di.value) as totalValue
        FROM DistributionItem di
        JOIN Distribution d ON di.distributionId = d.id
        WHERE d.distributionDate >= datetime('now', '-30 days')
        GROUP BY itemName, itemType
        ORDER BY distributionCount DESC
        LIMIT 10
      `,
      
      // Site performance
      prisma.distribution.groupBy({
        by: ['siteId'],
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalValue: true
        }
      }),
      
      // Verification methods usage
      prisma.distribution.groupBy({
        by: ['verificationMethod'],
        where: {
          distributionDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        },
        _count: {
          id: true
        }
      }),
      
      // Quality control issues
      prisma.$queryRaw`
        SELECT 
          json_extract(qualityControl, '$.itemCondition') as condition,
          json_extract(qualityControl, '$.issues') as issues,
          COUNT(*) as count
        FROM Distribution
        WHERE distributionDate >= datetime('now', '-30 days')
        AND qualityControl IS NOT NULL
        AND json_extract(qualityControl, '$.issues') IS NOT NULL
        GROUP BY condition, issues
      `
    ])

    // Calculate key performance indicators
    const averageValuePerDistribution = totalDistributions > 0 
      ? Math.round((totalValue._sum?.totalValue || 0) / totalDistributions)
      : 0

    const statistics = {
      overview: {
        totalDistributions,
        totalBeneficiaries,
        totalValue: totalValue._sum?.totalValue || 0,
        averageValuePerDistribution
      },
      breakdown: {
        byType: distributionsByType,
        byMonth: distributionsByMonth,
        topItems,
        sitePerformance
      },
      operations: {
        verificationMethods,
        qualityIssues: qualityIssues.filter((issue: any) => issue.issues)
      },
      alerts: []
    }
    
    // Add operational alerts
    const lowQualityRate = qualityIssues.filter((issue: any) => 
      issue.condition === 'POOR' || issue.condition === 'FAIR'
    ).length / Math.max(qualityIssues.length, 1)
    
    if (lowQualityRate > 0.1) {
      statistics.alerts.push({
        type: 'WARNING',
        message: `High rate of quality issues: ${Math.round(lowQualityRate * 100)}%`,
        action: 'Review supply chain and storage conditions'
      })
    }
    
    if (totalDistributions < 100) {
      statistics.alerts.push({
        type: 'INFO',
        message: 'Low distribution volume this month',
        action: 'Verify distribution schedule and beneficiary needs'
      })
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching distribution statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}