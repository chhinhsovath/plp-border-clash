'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Activity, Zap, Database, BarChart3, Clock, AlertTriangle,
  TrendingUp, TrendingDown, RefreshCw, Download, Server,
  Cpu, HardDrive, Wifi, CheckCircle, XCircle, Gauge
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SystemHealth {
  overall: number
  api: {
    health: number
    avgResponseTime: number
    errorRate: number
    requestsPerMinute: number
  }
  database: {
    health: number
    avgQueryTime: number
    activeConnections: number
  }
  cache: {
    hitRate: number
    operations: number
    avgLatency: number
  }
  timestamp: string
}

interface PerformanceMetrics {
  timeRange: string
  totalRequests: number
  successfulRequests: number
  errorRate: number
  avgDuration: number
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  endpointStats: Array<{
    name: string
    requests: number
    avgDuration: number
    p95Duration: number
    errors: number
    errorRate: number
  }>
  topErrors: Array<{
    error: string
    count: number
    percentage: number
  }>
}

interface CacheMetrics {
  stats: {
    totalKeys: number
    memoryUsage: string
    hitRate: number
    namespaces: Record<string, number>
  }
  hitRates: Record<string, number>
  recommendations: string[]
}

export default function PerformanceDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('1h')

  useEffect(() => {
    fetchPerformanceData()
    
    // Set up real-time updates
    const interval = setInterval(fetchPerformanceData, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchPerformanceData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch system health
      const healthRes = await fetch('/api/performance/health', { headers })
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData.data)
      }

      // Fetch performance metrics
      const metricsRes = await fetch(`/api/performance/metrics?timeRange=${timeRange}`, { headers })
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      // Fetch cache metrics
      const cacheRes = await fetch('/api/performance/cache', { headers })
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json()
        setCacheMetrics(cacheData.data)
      }

    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/performance/report?timeRange=${timeRange}&format=excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `performance-report-${timeRange}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (score >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading performance dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Gauge className="h-8 w-8 text-blue-600" />
                Performance Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor system performance, health metrics, and optimization insights</p>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={fetchPerformanceData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        {health && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                  <Badge variant={health.overall >= 90 ? 'default' : health.overall >= 70 ? 'secondary' : 'destructive'}>
                    {health.overall}% Health
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Last updated {formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* API Health */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        API Performance
                      </h4>
                      {getHealthIcon(health.api.health)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Health Score</span>
                        <span className={`font-semibold ${getHealthColor(health.api.health)}`}>
                          {health.api.health}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Response</span>
                        <span className="font-semibold">{health.api.avgResponseTime.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Error Rate</span>
                        <span className={`font-semibold ${health.api.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {health.api.errorRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Requests/min</span>
                        <span className="font-semibold">{health.api.requestsPerMinute}</span>
                      </div>
                    </div>
                  </div>

                  {/* Database Health */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database
                      </h4>
                      {getHealthIcon(health.database.health)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Health Score</span>
                        <span className={`font-semibold ${getHealthColor(health.database.health)}`}>
                          {health.database.health}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Query Time</span>
                        <span className="font-semibold">{health.database.avgQueryTime.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Connections</span>
                        <span className="font-semibold">{health.database.activeConnections}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cache Health */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Cache
                      </h4>
                      {getHealthIcon(health.cache.hitRate)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hit Rate</span>
                        <span className={`font-semibold ${health.cache.hitRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {health.cache.hitRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Operations</span>
                        <span className="font-semibold">{health.cache.operations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Latency</span>
                        <span className="font-semibold">{health.cache.avgLatency.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Metrics */}
        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">API Performance</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            {metrics && (
              <div className="space-y-6">
                {/* API Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
                      <p className="text-xs text-gray-500">Success: {metrics.successfulRequests}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.avgDuration.toFixed(0)}ms</div>
                      <p className="text-xs text-gray-500">P95: {metrics.percentiles.p95}ms</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {metrics.errorRate.toFixed(2)}%
                      </div>
                      <p className="text-xs text-gray-500">
                        {metrics.totalRequests - metrics.successfulRequests} errors
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">P99 Latency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metrics.percentiles.p99}ms</div>
                      <p className="text-xs text-gray-500">99th percentile</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Endpoint Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Endpoint Performance</CardTitle>
                    <CardDescription>Performance breakdown by API endpoint</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Endpoint</th>
                            <th className="text-right p-2">Requests</th>
                            <th className="text-right p-2">Avg Duration</th>
                            <th className="text-right p-2">P95 Duration</th>
                            <th className="text-right p-2">Error Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.endpointStats.map((endpoint) => (
                            <tr key={endpoint.name} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-mono text-sm">{endpoint.name}</td>
                              <td className="p-2 text-right">{endpoint.requests}</td>
                              <td className="p-2 text-right">{endpoint.avgDuration.toFixed(0)}ms</td>
                              <td className="p-2 text-right">{endpoint.p95Duration.toFixed(0)}ms</td>
                              <td className="p-2 text-right">
                                <span className={endpoint.errorRate > 5 ? 'text-red-600' : 'text-green-600'}>
                                  {endpoint.errorRate.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
                <CardDescription>Query performance and connection metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {health?.database.avgQueryTime.toFixed(0)}ms
                    </div>
                    <p className="text-sm text-gray-600">Average Query Time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {health?.database.activeConnections}
                    </div>
                    <p className="text-sm text-gray-600">Active Connections</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
                    <p className="text-sm text-gray-600">Index Usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cache">
            {cacheMetrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cacheMetrics.stats.totalKeys.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Memory Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cacheMetrics.stats.memoryUsage}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Hit Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{cacheMetrics.stats.hitRate}%</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Namespaces</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{Object.keys(cacheMetrics.stats.namespaces).length}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cache Hit Rates by Namespace */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cache Performance by Namespace</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(cacheMetrics.hitRates).map(([namespace, hitRate]) => (
                        <div key={namespace} className="flex items-center justify-between">
                          <span className="font-mono text-sm">{namespace}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${hitRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold w-12">{hitRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {cacheMetrics.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {cacheMetrics.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors">
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Error Analysis</CardTitle>
                  <CardDescription>Most common errors in the selected time range</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.topErrors.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Errors Found</h3>
                      <p className="text-gray-500">Great! No errors occurred in the selected time range.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {metrics.topErrors.map((error, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded">
                          <div>
                            <h4 className="font-semibold text-red-600">{error.error}</h4>
                            <p className="text-sm text-gray-600">{error.count} occurrences</p>
                          </div>
                          <Badge variant="destructive">{error.percentage}%</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}