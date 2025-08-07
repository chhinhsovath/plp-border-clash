'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { 
  Shield, AlertTriangle, Activity, Users, Lock, Eye,
  Download, RefreshCw, Search, Filter, Calendar,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Clock, Ban, Key, Database, FileText, BarChart3
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface SecurityMetrics {
  totalEvents: number
  criticalAlerts: number
  failedLogins: number
  activeUsers: number
  dataEncrypted: number
  complianceScore: number
}

interface SecurityAlert {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: string
  resolved: boolean
  userId?: string
  metadata: Record<string, any>
}

interface AuditLog {
  id: string
  action: string
  entity: string
  userId?: string
  success: boolean
  timestamp: string
  ipAddress?: string
  severity: string
  user?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [alertFilter, setAlertFilter] = useState('ALL')
  const [logFilter, setLogFilter] = useState({
    action: '',
    success: 'ALL',
    timeRange: '7d'
  })

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch security metrics
      const metricsRes = await fetch('/api/security/metrics', { headers })
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      // Fetch security alerts
      const alertsRes = await fetch('/api/security/alerts', { headers })
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.data)
      }

      // Fetch recent audit logs
      const logsRes = await fetch(`/api/audit/logs?limit=50`, { headers })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setAuditLogs(logsData.data)
      }
    } catch (error) {
      console.error('Error fetching security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchSecurityData() // Refresh data
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const exportAuditReport = async (format: 'json' | 'excel' = 'excel') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/audit/report?format=${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok && format === 'excel') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `audit-report-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting audit report:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />
      case 'HIGH': return <AlertCircle className="h-4 w-4" />
      case 'MEDIUM': return <Clock className="h-4 w-4" />
      case 'LOW': return <CheckCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (alertFilter === 'ALL') return true
    if (alertFilter === 'UNRESOLVED') return !alert.resolved
    return alert.severity === alertFilter
  })

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter.action && !log.action.toLowerCase().includes(logFilter.action.toLowerCase())) {
      return false
    }
    if (logFilter.success === 'SUCCESS' && !log.success) return false
    if (logFilter.success === 'FAILED' && log.success) return false
    
    // Time range filter
    const logDate = new Date(log.timestamp)
    const now = new Date()
    const daysAgo = parseInt(logFilter.timeRange.replace('d', ''))
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    return logDate >= cutoff
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading security dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-600" />
                Security Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor security events, compliance, and audit logs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportAuditReport('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={fetchSecurityData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Security Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalEvents.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.criticalAlerts}</div>
                <p className="text-xs text-gray-500">Unresolved</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Ban className="h-4 w-4 text-orange-500" />
                  Failed Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.failedLogins}</div>
                <p className="text-xs text-gray-500">Last 24 hours</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
                <p className="text-xs text-gray-500">Currently online</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-500" />
                  Data Encrypted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{metrics.dataEncrypted}%</div>
                <p className="text-xs text-gray-500">Sensitive fields</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{metrics.complianceScore}%</div>
                <p className="text-xs text-gray-500">GDPR compliance</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Security Alerts</CardTitle>
                    <CardDescription>Monitor and respond to security events</CardDescription>
                  </div>
                  <Select value={alertFilter} onValueChange={setAlertFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter alerts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Alerts</SelectItem>
                      <SelectItem value="UNRESOLVED">Unresolved</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Alerts</h3>
                    <p className="text-gray-500">Your system is secure with no active alerts.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAlerts.map(alert => (
                      <Alert key={alert.id} className={`${getSeverityColor(alert.severity)} border`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityIcon(alert.severity)}
                              <AlertTitle className="text-sm font-semibold">
                                {alert.type.replace(/_/g, ' ')}
                              </AlertTitle>
                              <Badge variant={alert.resolved ? 'default' : 'destructive'}>
                                {alert.resolved ? 'Resolved' : 'Active'}
                              </Badge>
                            </div>
                            <AlertDescription className="text-sm">
                              {alert.message}
                            </AlertDescription>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                              </span>
                              {alert.userId && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  User: {alert.userId}
                                </span>
                              )}
                            </div>
                          </div>
                          {!alert.resolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>Track all system activities and user actions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search actions..."
                      value={logFilter.action}
                      onChange={(e) => setLogFilter({ ...logFilter, action: e.target.value })}
                      className="w-48"
                    />
                    <Select 
                      value={logFilter.success} 
                      onValueChange={(value) => setLogFilter({ ...logFilter, success: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={logFilter.timeRange} 
                      onValueChange={(value) => setLogFilter({ ...logFilter, timeRange: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1 Day</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Timestamp</th>
                        <th className="text-left p-2">User</th>
                        <th className="text-left p-2">Action</th>
                        <th className="text-left p-2">Entity</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-sm">
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </td>
                          <td className="p-2 text-sm">
                            {log.user ? (
                              `${log.user.firstName} ${log.user.lastName}`
                            ) : (
                              log.userId || 'System'
                            )}
                          </td>
                          <td className="p-2 text-sm">
                            <Badge variant="outline">
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">{log.entity}</td>
                          <td className="p-2">
                            <Badge variant={log.success ? 'default' : 'destructive'}>
                              {log.success ? 'Success' : 'Failed'}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm font-mono">
                            {log.ipAddress || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>GDPR Compliance Status</CardTitle>
                  <CardDescription>Monitor data protection compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">✓</div>
                      <h4 className="font-semibold">Data Encryption</h4>
                      <p className="text-sm text-gray-600">All sensitive fields encrypted</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">✓</div>
                      <h4 className="font-semibold">Audit Logging</h4>
                      <p className="text-sm text-gray-600">Complete activity tracking</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">✓</div>
                      <h4 className="font-semibold">Access Controls</h4>
                      <p className="text-sm text-gray-600">Role-based permissions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">⚠</div>
                      <h4 className="font-semibold">Data Retention</h4>
                      <p className="text-sm text-gray-600">Policies configured</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Protection Measures</CardTitle>
                  <CardDescription>Summary of implemented security controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-semibold">Field-Level Encryption</h4>
                          <p className="text-sm text-gray-600">AES-256 encryption for sensitive data</p>
                        </div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-green-500" />
                        <div>
                          <h4 className="font-semibold">Access Monitoring</h4>
                          <p className="text-sm text-gray-600">Real-time user activity tracking</p>
                        </div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-purple-500" />
                        <div>
                          <h4 className="font-semibold">Data Anonymization</h4>
                          <p className="text-sm text-gray-600">PII redaction for analytics</p>
                        </div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-orange-500" />
                        <div>
                          <h4 className="font-semibold">Consent Management</h4>
                          <p className="text-sm text-gray-600">User consent tracking and validation</p>
                        </div>
                      </div>
                      <Badge variant="outline">Configured</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}