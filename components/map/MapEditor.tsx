'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Plus, Trash2, Navigation } from 'lucide-react'

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })

interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  type: 'affected' | 'assessment' | 'distribution' | 'facility'
  description?: string
  affectedPeople?: number
  radius?: number
}

interface MapEditorProps {
  data: {
    center?: [number, number]
    zoom?: number
    locations?: Location[]
  }
  onChange: (data: any) => void
  editable?: boolean
}

export default function MapEditor({ data, onChange, editable = true }: MapEditorProps) {
  const [mapData, setMapData] = useState({
    center: data.center || [11.5564, 104.9282], // Default to Phnom Penh, Cambodia
    zoom: data.zoom || 7,
    locations: data.locations || []
  })
  
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    type: 'affected',
    latitude: 0,
    longitude: 0
  })
  
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [map, setMap] = useState<any>(null)

  useEffect(() => {
    // Load Leaflet CSS
    if (typeof window !== 'undefined') {
      require('leaflet/dist/leaflet.css')
      const L = require('leaflet')
      
      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
    }
  }, [])

  const updateMapData = (updates: any) => {
    const newData = { ...mapData, ...updates }
    setMapData(newData)
    onChange(newData)
  }

  const addLocation = () => {
    if (newLocation.name && newLocation.latitude && newLocation.longitude) {
      const location: Location = {
        id: Date.now().toString(),
        name: newLocation.name,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        type: newLocation.type as any,
        description: newLocation.description,
        affectedPeople: newLocation.affectedPeople,
        radius: newLocation.radius
      }
      
      updateMapData({ locations: [...mapData.locations, location] })
      setNewLocation({ name: '', type: 'affected', latitude: 0, longitude: 0 })
      setShowAddLocation(false)
      
      // Center map on new location
      if (map) {
        map.setView([location.latitude, location.longitude], 10)
      }
    }
  }

  const removeLocation = (id: string) => {
    updateMapData({ locations: mapData.locations.filter(l => l.id !== id) })
  }

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'affected': return '#ef4444' // red
      case 'assessment': return '#f59e0b' // amber
      case 'distribution': return '#10b981' // green
      case 'facility': return '#3b82f6' // blue
      default: return '#6b7280' // gray
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setNewLocation({
          ...newLocation,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        if (map) {
          map.setView([position.coords.latitude, position.coords.longitude], 12)
        }
      })
    }
  }

  if (!editable) {
    return (
      <Card>
        <CardContent className="p-0">
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer
              center={mapData.center as [number, number]}
              zoom={mapData.zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {mapData.locations.map((location) => (
                <div key={location.id}>
                  <Marker position={[location.latitude, location.longitude]}>
                    <Popup>
                      <div>
                        <strong>{location.name}</strong>
                        {location.description && <p>{location.description}</p>}
                        {location.affectedPeople && (
                          <p>Affected: {location.affectedPeople.toLocaleString()} people</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {location.radius && (
                    <Circle
                      center={[location.latitude, location.longitude]}
                      radius={location.radius * 1000}
                      color={getMarkerColor(location.type)}
                      fillOpacity={0.2}
                    />
                  )}
                </div>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Location Map</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddLocation(!showAddLocation)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddLocation && (
            <div className="mb-4 p-4 border rounded space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location Name</Label>
                  <Input
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={newLocation.type}
                    onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as any })}
                  >
                    <option value="affected">Affected Area</option>
                    <option value="assessment">Assessment Site</option>
                    <option value="distribution">Distribution Point</option>
                    <option value="facility">Facility</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newLocation.latitude}
                    onChange={(e) => setNewLocation({ ...newLocation, latitude: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newLocation.longitude}
                    onChange={(e) => setNewLocation({ ...newLocation, longitude: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>&nbsp;</Label>
                  <Button onClick={getCurrentLocation} className="w-full">
                    <Navigation className="h-4 w-4 mr-2" />
                    Current
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Affected People (Optional)</Label>
                  <Input
                    type="number"
                    value={newLocation.affectedPeople || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, affectedPeople: parseInt(e.target.value) })}
                    placeholder="Number of affected people"
                  />
                </div>
                <div>
                  <Label>Radius in km (Optional)</Label>
                  <Input
                    type="number"
                    value={newLocation.radius || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, radius: parseFloat(e.target.value) })}
                    placeholder="Coverage radius"
                  />
                </div>
              </div>
              
              <div>
                <Label>Description (Optional)</Label>
                <Input
                  value={newLocation.description || ''}
                  onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                  placeholder="Additional information"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={addLocation}>Add Location</Button>
                <Button variant="outline" onClick={() => setShowAddLocation(false)}>Cancel</Button>
              </div>
            </div>
          )}
          
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer
              center={mapData.center as [number, number]}
              zoom={mapData.zoom}
              style={{ height: '100%', width: '100%' }}
              ref={setMap}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {mapData.locations.map((location) => (
                <div key={location.id}>
                  <Marker position={[location.latitude, location.longitude]}>
                    <Popup>
                      <div>
                        <strong>{location.name}</strong>
                        {location.description && <p>{location.description}</p>}
                        {location.affectedPeople && (
                          <p>Affected: {location.affectedPeople.toLocaleString()} people</p>
                        )}
                        {editable && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeLocation(location.id)}
                            className="mt-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {location.radius && (
                    <Circle
                      center={[location.latitude, location.longitude]}
                      radius={location.radius * 1000}
                      color={getMarkerColor(location.type)}
                      fillOpacity={0.2}
                    />
                  )}
                </div>
              ))}
            </MapContainer>
          </div>
          
          {mapData.locations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Locations ({mapData.locations.length})</h4>
              <div className="space-y-2">
                {mapData.locations.map((location) => (
                  <div key={location.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: getMarkerColor(location.type) }} />
                      <span className="font-medium">{location.name}</span>
                      <span className="text-sm text-gray-500">({location.type})</span>
                      {location.affectedPeople && (
                        <span className="text-sm text-gray-600">
                          - {location.affectedPeople.toLocaleString()} affected
                        </span>
                      )}
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLocation(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}