'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: any[]
  dataKey: string
  xAxisKey: string
  colors: string[]
}

interface ChartBuilderProps {
  initialData?: ChartData
  onChange: (data: ChartData) => void
  editable?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function ChartBuilder({ initialData, onChange, editable = true }: ChartBuilderProps) {
  const [chartData, setChartData] = useState<ChartData>(initialData || {
    type: 'bar',
    title: 'Chart Title',
    data: [
      { name: 'Category 1', value: 100 },
      { name: 'Category 2', value: 200 },
      { name: 'Category 3', value: 150 },
    ],
    dataKey: 'value',
    xAxisKey: 'name',
    colors: COLORS
  })
  
  const [settingsDialog, setSettingsDialog] = useState(false)
  const [newDataPoint, setNewDataPoint] = useState({ name: '', value: '' })

  const updateChart = (updates: Partial<ChartData>) => {
    const newData = { ...chartData, ...updates }
    setChartData(newData)
    onChange(newData)
  }

  const addDataPoint = () => {
    if (newDataPoint.name && newDataPoint.value) {
      const newData = [...chartData.data, {
        [chartData.xAxisKey]: newDataPoint.name,
        [chartData.dataKey]: parseFloat(newDataPoint.value)
      }]
      updateChart({ data: newData })
      setNewDataPoint({ name: '', value: '' })
    }
  }

  const removeDataPoint = (index: number) => {
    const newData = chartData.data.filter((_, i) => i !== index)
    updateChart({ data: newData })
  }

  const updateDataPoint = (index: number, field: string, value: any) => {
    const newData = [...chartData.data]
    newData[index] = { ...newData[index], [field]: field === chartData.dataKey ? parseFloat(value) : value }
    updateChart({ data: newData })
  }

  const renderChart = () => {
    const { type, data, dataKey, xAxisKey, colors } = chartData

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke={colors[0]} />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={dataKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{chartData.title}</CardTitle>
            {editable && (
              <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Chart Settings</DialogTitle>
                    <DialogDescription>
                      Configure your chart type and data
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Chart Title</Label>
                      <Input
                        value={chartData.title}
                        onChange={(e) => updateChart({ title: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Chart Type</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={chartData.type}
                        onChange={(e) => updateChart({ type: e.target.value as any })}
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="area">Area Chart</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label>Data Points</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {chartData.data.map((point, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Label"
                              value={point[chartData.xAxisKey]}
                              onChange={(e) => updateDataPoint(index, chartData.xAxisKey, e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Value"
                              value={point[chartData.dataKey]}
                              onChange={(e) => updateDataPoint(index, chartData.dataKey, e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDataPoint(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="New label"
                          value={newDataPoint.name}
                          onChange={(e) => setNewDataPoint({ ...newDataPoint, name: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Value"
                          value={newDataPoint.value}
                          onChange={(e) => setNewDataPoint({ ...newDataPoint, value: e.target.value })}
                        />
                        <Button onClick={addDataPoint}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={() => setSettingsDialog(false)}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
    </div>
  )
}