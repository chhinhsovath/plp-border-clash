import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import jwt from 'jsonwebtoken'

// GET /api/data/statistics - Get comprehensive statistics for reports
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
    const siteId = searchParams.get('siteId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Site filter
    const siteFilter = siteId ? { currentSiteId: siteId } : {}

    // Fetch comprehensive statistics
    const [
      totalIndividuals,
      totalHouseholds,
      vulnerableIndividuals,
      protectionIncidents,
      clinicalVisits,
      nutritionAssessments,
      shelterConditions,
      educationEnrollment,
      sites,
      recentDistributions
    ] = await Promise.all([
      // Total registered individuals
      prisma.individual.count(),
      
      // Total households
      prisma.household.count(),
      
      // Vulnerable individuals count
      prisma.individual.count({
        where: {
          vulnerabilityCategories: {
            not: "[]"
          }
        }
      }),
      
      // Protection incidents by type (last 30 days)
      prisma.protectionIncident.groupBy({
        by: ['incidentType'],
        _count: {
          id: true
        },
        where: {
          incidentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      }),
      
      // Clinical visits (last 30 days)
      prisma.clinicalVisit.count({
        where: {
          visitDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      }),
      
      // Nutrition assessments
      prisma.nutritionAssessment.groupBy({
        by: ['nutritionStatus'],
        _count: {
          id: true
        },
        where: {
          assessmentDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      }),
      
      // Shelter conditions
      prisma.shelterAssessment.groupBy({
        by: ['shelterCondition'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),
      
      // Education enrollment
      prisma.educationStatus.groupBy({
        by: ['enrollmentStatus'],
        _count: {
          id: true
        },
        where: {
          academicYear: new Date().getFullYear().toString()
        }
      }),
      
      // Sites overview
      prisma.idpSite.findMany({
        select: {
          id: true,
          siteCode: true,
          siteName: true,
          population: true,
          capacity: true
        }
      }),
      
      // Recent distributions (last 7 days)
      prisma.distribution.groupBy({
        by: ['distributionType'],
        _count: {
          id: true
        },
        where: {
          distributionDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      })
    ])

    // Age and gender distribution
    const demographics = await prisma.individual.groupBy({
      by: ['gender'],
      _count: {
        id: true
      },
      _avg: {
        age: true
      }
    })

    // Age groups
    const ageGroups = await Promise.all([
      prisma.individual.count({
        where: { age: { lt: 5 } }
      }),
      prisma.individual.count({
        where: { age: { gte: 5, lt: 18 } }
      }),
      prisma.individual.count({
        where: { age: { gte: 18, lt: 60 } }
      }),
      prisma.individual.count({
        where: { age: { gte: 60 } }
      })
    ])

    // Get recent activity counts
    const weeklyStats = await Promise.all([
      prisma.individual.count({
        where: {
          registrationDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      prisma.protectionIncident.count({
        where: {
          incidentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      prisma.clinicalVisit.count({
        where: {
          visitDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      })
    ])

    // Compile comprehensive statistics
    const statistics = {
      overview: {
        totalIndividuals,
        totalHouseholds,
        totalSites: sites.length,
        averageHouseholdSize: totalHouseholds > 0 ? Math.round(totalIndividuals / totalHouseholds * 10) / 10 : 0,
        newThisWeek: weeklyStats[0]
      },
      
      demographics: {
        genderDistribution: demographics,
        ageGroups: {
          under5: ageGroups[0],
          children5to17: ageGroups[1],
          adults18to59: ageGroups[2],
          elderly60plus: ageGroups[3]
        }
      },
      
      vulnerability: {
        total: vulnerableIndividuals
      },
      
      protection: {
        incidentsLast30Days: protectionIncidents.reduce((sum, item) => sum + item._count.id, 0),
        incidentsThisWeek: weeklyStats[1],
        byType: protectionIncidents
      },
      
      health: {
        clinicalVisitsLast30Days: clinicalVisits,
        clinicalVisitsThisWeek: weeklyStats[2],
        nutritionStatus: nutritionAssessments
      },
      
      shelter: {
        conditions: shelterConditions
      },
      
      education: {
        enrollment: educationEnrollment
      },
      
      nutrition: {
        assessments: nutritionAssessments
      },
      
      distributions: {
        recentByType: recentDistributions
      },
      
      sites: sites.map(site => ({
        id: site.id,
        code: site.siteCode,
        name: site.siteName,
        population: site.population,
        capacity: site.capacity,
        utilizationRate: site.capacity > 0 ? Math.round((site.population / site.capacity) * 100) : 0
      })),

      alerts: []
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}