'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, TrendingUp, TrendingDown, Users, Home, Heart, School } from 'lucide-react'

interface Statistic {
  id: string
  label: string
  value: number | string
  unit?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: string
}

interface StatisticsEditorProps {
  data: Statistic[]
  onChange: (data: Statistic[]) => void
  editable?: boolean
}

const ICON_OPTIONS = {
  users: Users,
  home: Home,
  heart: Heart,
  school: School,
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
]

export default function StatisticsEditor({ data = [], onChange, editable = true }: StatisticsEditorProps) {
  const [statistics, setStatistics] = useState<Statistic[]>(data.length > 0 ? data : [
    { id: '1', label: 'Total Affected', value: 10000, unit: 'people', icon: 'users', trend: 'up', trendValue: '+12%', color: 'blue' },
    { id: '2', label: 'Households', value: 2000, unit: 'families', icon: 'home', trend: 'down', trendValue: '-5%', color: 'green' },
    { id: '3', label: 'Health Centers', value: 15, unit: 'facilities', icon: 'heart', trend: 'neutral', color: 'red' },
    { id: '4', label: 'Schools Affected', value: 8, unit: 'schools', icon: 'school', trend: 'up', trendValue: '+2', color: 'yellow' },
  ])

  const updateStatistics = (newStats: Statistic[]) => {
    setStatistics(newStats)
    onChange(newStats)
  }

  const addStatistic = () => {
    const newStat: Statistic = {
      id: Date.now().toString(),
      label: 'New Statistic',
      value: 0,
      unit: '',
      color: 'blue'
    }
    updateStatistics([...statistics, newStat])
  }

  const removeStatistic = (id: string) => {
    updateStatistics(statistics.filter(s => s.id !== id))
  }

  const updateStatistic = (id: string, updates: Partial<Statistic>) => {
    updateStatistics(statistics.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'red': return 'bg-red-100 text-red-800 border-red-200'
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'pink': return 'bg-pink-100 text-pink-800 border-pink-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderIcon = (iconName?: string) => {
    if (!iconName || !ICON_OPTIONS[iconName as keyof typeof ICON_OPTIONS]) {
      return <Users className="h-8 w-8" />
    }
    const Icon = ICON_OPTIONS[iconName as keyof typeof ICON_OPTIONS]
    return <Icon className="h-8 w-8" />
  }

  if (!editable) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statistics.map((stat) => (
          <Card key={stat.id} className={`border-2 ${getColorClass(stat.color)}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-white bg-opacity-50">
                  {renderIcon(stat.icon)}
                </div>
                {stat.trend && stat.trendValue && (
                  <div className="flex items-center gap-1 text-sm">
                    {stat.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {stat.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                    <span className={stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : ''}>
                      {stat.trendValue}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  {stat.unit && <span className="text-lg font-normal ml-1">{stat.unit}</span>}
                </p>
                <p className="text-sm mt-1 opacity-80">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Statistics</h3>
        <Button onClick={addStatistic} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Statistic
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statistics.map((stat) => (
          <Card key={stat.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={stat.label}
                      onChange={(e) => updateStatistic(stat.id, { label: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Value</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => updateStatistic(stat.id, { value: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={stat.unit || ''}
                        onChange={(e) => updateStatistic(stat.id, { unit: e.target.value })}
                        placeholder="e.g., people"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Icon</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={stat.icon || ''}
                        onChange={(e) => updateStatistic(stat.id, { icon: e.target.value })}
                      >
                        <option value="">None</option>
                        <option value="users">Users</option>
                        <option value="home">Home</option>
                        <option value="heart">Health</option>
                        <option value="school">School</option>
                      </select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={stat.color || 'blue'}
                        onChange={(e) => updateStatistic(stat.id, { color: e.target.value })}
                      >
                        {COLOR_OPTIONS.map(color => (
                          <option key={color.value} value={color.value}>{color.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Trend</Label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={stat.trend || ''}
                        onChange={(e) => updateStatistic(stat.id, { trend: e.target.value as any })}
                      >
                        <option value="">None</option>
                        <option value="up">Up</option>
                        <option value="down">Down</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                    <div>
                      <Label>Trend Value</Label>
                      <Input
                        value={stat.trendValue || ''}
                        onChange={(e) => updateStatistic(stat.id, { trendValue: e.target.value })}
                        placeholder="e.g., +12%"
                      />
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeStatistic(stat.id)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}