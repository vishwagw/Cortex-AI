'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface DataPoint { time: string; altitude: number; speed: number; battery: number }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-app-surface border border-white/10 rounded-lg p-3 text-xs space-y-1">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.dataKey}:</span>
          <span className="text-white font-medium">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

interface Props { droneId?: string; orgId: string }

export default function TelemetryChart({ droneId, orgId }: Props) {
  const [data, setData]     = useState<DataPoint[]>([])
  const [metric, setMetric] = useState<'altitude' | 'speed' | 'battery'>('altitude')

  // Load recent telemetry
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      let q = supabase
        .from('telemetry')
        .select('lat,lng,altitude_m,speed_ms,battery_pct,recorded_at')
        .eq('org_id', orgId)
        .order('recorded_at', { ascending: false })
        .limit(60)
      if (droneId) q = q.eq('drone_id', droneId)

      const { data: rows } = await q
      if (!rows) return

      const pts = rows.reverse().map(r => ({
        time:     format(new Date(r.recorded_at), 'HH:mm:ss'),
        altitude: r.altitude_m ?? 0,
        speed:    r.speed_ms ?? 0,
        battery:  r.battery_pct ?? 0,
      }))
      setData(pts)
    }
    load()
  }, [droneId, orgId])

  // Subscribe to real-time telemetry
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('telemetry-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry',
          filter: `org_id=eq.${orgId}${droneId ? `,drone_id=eq.${droneId}` : ''}`,
        },
        (payload) => {
          const r = payload.new as any
          setData(prev => [
            ...prev.slice(-59),
            {
              time:     format(new Date(r.recorded_at), 'HH:mm:ss'),
              altitude: r.altitude_m ?? 0,
              speed:    r.speed_ms ?? 0,
              battery:  r.battery_pct ?? 0,
            }
          ])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [droneId, orgId])

  const metricConfig = {
    altitude: { color: '#00e8ff', label: 'Altitude (m)', unit: 'm' },
    speed:    { color: '#4ade80', label: 'Speed (m/s)',  unit: 'm/s' },
    battery:  { color: '#fb923c', label: 'Battery (%)',  unit: '%' },
  }
  const cfg = metricConfig[metric]

  return (
    <div>
      {/* Metric selector */}
      <div className="flex gap-1 mb-4">
        {(Object.keys(metricConfig) as (keyof typeof metricConfig)[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
              metric === m
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
          Waiting for telemetry data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={cfg.color}
              strokeWidth={1.5}
              fill={`url(#grad-${metric})`}
              dot={false}
              activeDot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
