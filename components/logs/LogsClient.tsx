'use client'

import { useState, useMemo } from 'react'
import { logStatusConfig, formatDateTime, secondsToHMS, batteryColor } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FileText } from 'lucide-react'
import { format, subDays } from 'date-fns'

interface Log {
  id: string; status: string; distance_m?: number; duration_s?: number
  max_altitude_m?: number; avg_speed_ms?: number; min_battery_pct?: number
  waypoints_hit?: number; started_at: string; ended_at?: string
  drones?: { id: string; name: string; model?: string }
  missions?: { id: string; name: string; mission_type?: string }
}

interface Props {
  logs:    Log[]
  drones:  { id: string; name: string }[]
  stats:   { totalFlights: number; completedFlights: number; totalDistanceKm: number; totalTimeHours: number; avgMaxAlt: number }
}

export default function LogsClient({ logs, drones, stats }: Props) {
  const [filterDrone,  setFilterDrone]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')

  const filtered = useMemo(() => logs.filter(l => {
    if (filterDrone  && l.drones?.id !== filterDrone)       return false
    if (filterStatus && l.status !== filterStatus)           return false
    if (search && !l.drones?.name.toLowerCase().includes(search.toLowerCase()) &&
                 !l.missions?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [logs, filterDrone, filterStatus, search])

  // Daily flights chart data (last 14 days)
  const chartData = useMemo(() => {
    const days: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      days[format(subDays(new Date(), i), 'MMM d')] = 0
    }
    logs.forEach(l => {
      const key = format(new Date(l.started_at), 'MMM d')
      if (key in days) days[key]++
    })
    return Object.entries(days).map(([date, count]) => ({ date, count }))
  }, [logs])

  return (
    <div className="space-y-6">

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Flights',    value: stats.totalFlights },
          { label: 'Completed',        value: stats.completedFlights },
          { label: 'Total Distance',   value: `${stats.totalDistanceKm.toFixed(1)} km` },
          { label: 'Total Flight Time',value: `${stats.totalTimeHours.toFixed(1)} hrs` },
          { label: 'Avg Max Altitude', value: `${stats.avgMaxAlt.toFixed(0)} m` },
        ].map(s => (
          <div key={s.label} className="card-sm px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Flights per day — last 14 days</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0b0e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#00e8ff' }}
            />
            <Bar dataKey="count" fill="#00e8ff" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Flights" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search drone or mission…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input max-w-[160px]" value={filterDrone} onChange={e => setFilterDrone(e.target.value)}>
          <option value="">All drones</option>
          {drones.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input max-w-[160px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(logStatusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} records</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <FileText size={24} className="text-slate-600" />
          <p className="text-sm text-slate-500">No flight logs match your filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Drone</th>
                <th>Mission</th>
                <th>Status</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Max Alt</th>
                <th>Min Battery</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const cfg = logStatusConfig[log.status as keyof typeof logStatusConfig]
                return (
                  <tr key={log.id}>
                    <td>
                      <p className="font-medium text-slate-200">{log.drones?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{log.drones?.model ?? ''}</p>
                    </td>
                    <td>
                      <p className="text-slate-400 text-xs">{log.missions?.name ?? '—'}</p>
                      {log.missions?.mission_type && (
                        <p className="text-slate-600 text-xs capitalize">{log.missions.mission_type}</p>
                      )}
                    </td>
                    <td><span className={`text-xs font-medium ${cfg?.color}`}>{cfg?.label ?? log.status}</span></td>
                    <td className="text-xs">{log.distance_m ? `${(log.distance_m / 1000).toFixed(2)} km` : '—'}</td>
                    <td className="text-xs">{log.duration_s ? secondsToHMS(log.duration_s) : '—'}</td>
                    <td className="text-xs">{log.max_altitude_m ? `${log.max_altitude_m.toFixed(0)} m` : '—'}</td>
                    <td className={`text-xs font-medium ${log.min_battery_pct != null ? batteryColor(log.min_battery_pct) : ''}`}>
                      {log.min_battery_pct != null ? `${log.min_battery_pct}%` : '—'}
                    </td>
                    <td className="text-xs text-slate-500">{formatDateTime(log.started_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
