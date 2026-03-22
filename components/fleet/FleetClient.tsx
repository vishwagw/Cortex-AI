'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { droneStatusConfig, batteryColor, timeAgo } from '@/lib/utils'
import { Plus, X, Loader2, Battery, Wifi, Clock, Cpu } from 'lucide-react'
import type { Drone, DronePlatform } from '@/lib/types'

const PLATFORMS: DronePlatform[] = ['mavlink', 'ardupilot', 'ros', 'px4', 'custom']

interface Props { drones: Drone[]; orgId: string; canManage: boolean }

export default function FleetClient({ drones: initial, orgId, canManage }: Props) {
  const [drones, setDrones]   = useState<Drone[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState({ name: '', model: '', serial_number: '', platform: 'mavlink' as DronePlatform })

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function addDrone(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('drones').insert({ ...form, org_id: orgId }).select().single()
    if (err) { setError(err.message); setLoading(false); return }
    setDrones(p => [...p, data as Drone])
    setShowAdd(false)
    setForm({ name: '', model: '', serial_number: '', platform: 'mavlink' })
    setLoading(false)
  }

  async function deleteDrone(id: string) {
    if (!confirm('Delete this drone and all its flight data?')) return
    const supabase = createClient()
    await supabase.from('drones').delete().eq('id', id)
    setDrones(p => p.filter(d => d.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(droneStatusConfig).map(([status, cfg]) => {
            const count = drones.filter(d => d.status === status).length
            if (count === 0) return null
            return (
              <span key={status} className="badge bg-white/[0.04] text-slate-400">
                <span className={`status-dot ${cfg.dot}`} />
                {count} {cfg.label}
              </span>
            )
          })}
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Drone
          </button>
        )}
      </div>

      {drones.length === 0 ? (
        <div className="card p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <Cpu size={24} className="text-slate-600" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">No drones yet</p>
            <p className="text-sm text-slate-500">Add your first drone to start managing your fleet</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add your first drone
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drones.map(drone => {
            const cfg = droneStatusConfig[drone.status]
            return (
              <div key={drone.id} className="card p-5 flex flex-col gap-4 hover:border-white/10 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Cpu size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{drone.name}</p>
                      <p className="text-xs text-slate-500">{drone.model ?? 'Unknown model'}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => deleteDrone(drone.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-app-bg rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`status-dot ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="bg-app-bg rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Platform</p>
                    <span className="text-xs text-slate-300 capitalize">{drone.platform ?? '—'}</span>
                  </div>
                  <div className="bg-app-bg rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Battery size={9} /> Battery
                    </p>
                    <span className={`text-xs font-medium ${drone.battery_pct != null ? batteryColor(drone.battery_pct) : 'text-slate-500'}`}>
                      {drone.battery_pct != null ? `${drone.battery_pct}%` : '—'}
                    </span>
                  </div>
                  <div className="bg-app-bg rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock size={9} /> Last seen
                    </p>
                    <span className="text-xs text-slate-400">
                      {drone.last_seen_at ? timeAgo(drone.last_seen_at) : 'Never'}
                    </span>
                  </div>
                </div>

                {drone.serial_number && (
                  <div className="border-t border-white/[0.05] pt-3">
                    <span className="mono-tag">{drone.serial_number}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Drone Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative card p-6 w-full max-w-md animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Register new drone</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={addDrone} className="space-y-4">
              <div>
                <label className="label">Drone name *</label>
                <input className="input" placeholder="e.g. Alpha-1" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Model</label>
                  <input className="input" placeholder="e.g. DJI Matrice 300" value={form.model} onChange={e => set('model', e.target.value)} />
                </div>
                <div>
                  <label className="label">Serial number</label>
                  <input className="input" placeholder="S/N" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Flight controller platform *</label>
                <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? 'Adding…' : 'Add drone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
