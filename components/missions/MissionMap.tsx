'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { haversineDistance } from '@/lib/utils'
import { Trash2, Navigation } from 'lucide-react'
import type { Waypoint } from '@/lib/types'

let mapboxgl: any

interface Props {
  waypoints:    Waypoint[]
  onChange:     (waypoints: Waypoint[]) => void
  interactive?: boolean
}

export default function MissionMap({ waypoints, onChange, interactive = true }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<any>(null)
  const markersRef      = useRef<any[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Dynamically import mapbox to avoid SSR
    import('mapbox-gl').then(mb => {
      mapboxgl = mb.default
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      if (!mapContainerRef.current || mapRef.current) return

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style:     'mapbox://styles/mapbox/dark-v11',
        center:    [0, 20],
        zoom:      2,
        attributionControl: false,
      })

      mapRef.current.on('load', () => {
        // Flight path layer
        mapRef.current.addSource('path', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } })
        mapRef.current.addLayer({
          id: 'path-line',
          type: 'line',
          source: 'path',
          paint: { 'line-color': '#00e8ff', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.7 },
        })
        setReady(true)
      })

      if (interactive) {
        mapRef.current.on('click', (e: any) => {
          const wp: Waypoint = {
            id:          crypto.randomUUID(),
            lat:         +e.lngLat.lat.toFixed(6),
            lng:         +e.lngLat.lng.toFixed(6),
            altitude_m:  50,
            speed_ms:    10,
          }
          onChange([...waypoints, wp])
        })
        mapRef.current.getCanvas().style.cursor = 'crosshair'
      }
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  // Sync markers + path when waypoints change
  useEffect(() => {
    if (!ready || !mapRef.current) return

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Add waypoint markers
    waypoints.forEach((wp, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: #05070f; border: 2px solid #00e8ff;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 600; color: #00e8ff;
        cursor: ${interactive ? 'pointer' : 'default'};
        font-family: monospace;
      `
      el.textContent = String(i + 1)

      const marker = new mapboxgl.Marker({ element: el, draggable: interactive })
        .setLngLat([wp.lng, wp.lat])
        .addTo(mapRef.current)

      if (interactive) {
        marker.on('dragend', () => {
          const { lng, lat } = marker.getLngLat()
          const updated = waypoints.map((w, j) =>
            j === i ? { ...w, lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : w
          )
          onChange(updated)
        })
      }

      markersRef.current.push(marker)
    })

    // Update flight path
    const coords = waypoints.map(wp => [wp.lng, wp.lat])
    mapRef.current.getSource('path')?.setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    })

    // Fit bounds if we have waypoints
    if (waypoints.length >= 1) {
      if (waypoints.length === 1) {
        mapRef.current.flyTo({ center: [waypoints[0].lng, waypoints[0].lat], zoom: 14, duration: 800 })
      } else {
        const lngs = waypoints.map(w => w.lng)
        const lats = waypoints.map(w => w.lat)
        mapRef.current.fitBounds(
          [[Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01], [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01]],
          { padding: 60, duration: 800 }
        )
      }
    }
  }, [waypoints, ready])

  const totalDistance = waypoints.length > 1
    ? waypoints.slice(1).reduce((s, wp, i) => s + haversineDistance(waypoints[i].lat, waypoints[i].lng, wp.lat, wp.lng), 0)
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.06]" style={{ height: 380 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Overlay: mission stats */}
        {waypoints.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-2">
            <div className="bg-app-surface/90 backdrop-blur border border-white/10 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Navigation size={10} className="text-cyan-400" />
              <span className="text-slate-400">{waypoints.length} waypoints</span>
            </div>
            {totalDistance > 0 && (
              <div className="bg-app-surface/90 backdrop-blur border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-400">
                {(totalDistance / 1000).toFixed(2)} km total
              </div>
            )}
          </div>
        )}

        {interactive && (
          <div className="absolute top-3 right-3 bg-app-surface/90 backdrop-blur border border-white/10 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-slate-400">Click map to add waypoints</p>
          </div>
        )}
      </div>

      {/* Waypoint list */}
      {waypoints.length > 0 && interactive && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {waypoints.map((wp, i) => (
            <div key={wp.id} className="flex items-center gap-3 px-3 py-2 bg-app-surface rounded-lg text-xs group">
              <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 font-mono flex items-center justify-center flex-shrink-0 text-[10px]">
                {i + 1}
              </span>
              <div className="flex-1 grid grid-cols-4 gap-2">
                <span className="text-slate-400 font-mono">{wp.lat.toFixed(4)}°</span>
                <span className="text-slate-400 font-mono">{wp.lng.toFixed(4)}°</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" value={wp.altitude_m} min={1} max={500}
                    onChange={e => onChange(waypoints.map((w, j) => j === i ? { ...w, altitude_m: +e.target.value } : w))}
                    className="w-full bg-app-bg border border-white/[0.06] rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400/40"
                  />
                  <span className="text-slate-600">m</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" value={wp.speed_ms ?? 10} min={1} max={30}
                    onChange={e => onChange(waypoints.map((w, j) => j === i ? { ...w, speed_ms: +e.target.value } : w))}
                    className="w-full bg-app-bg border border-white/[0.06] rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400/40"
                  />
                  <span className="text-slate-600">m/s</span>
                </div>
              </div>
              <button
                onClick={() => onChange(waypoints.filter((_, j) => j !== i))}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
