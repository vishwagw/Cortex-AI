'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { estimateMissionDistance } from '@/lib/utils'
import { Loader2, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Waypoint, MissionType } from '@/lib/types'

// Dynamically import MissionMap to avoid SSR (mapbox-gl is client-only)
const MissionMap = dynamic(() => import('./MissionMap'), { ssr: false, loading: () => (
  <div className="h-96 rounded-xl bg-app-surface border border-white/[0.06] flex items-center justify-center">
    <p className="text-xs text-slate-500">Loading map…</p>
  </div>
)})

const MISSION_TYPES: MissionType[] = ['inspection','delivery','mapping','surveillance','survey','custom']

interface DroneOption { id: string; name: string; platform?: string; status: string; battery_pct?: number }

interface Props { orgId: string; userId: string; drones: DroneOption[] }

export default function MissionPlannerClient({ orgId, userId, drones }: Props) {
  const router = useRouter()
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [form, setForm]           = useState({
    name:         '',
    description:  '',
    mission_type: 'inspection' as MissionType,
    drone_id:     drones[0]?.id ?? '',
    default_alt:  50,
    default_spd:  10,
  })

  function set(f: string, v: string | number) { setForm(p => ({ ...p, [f]: v })) }

  async function createMission(e: React.FormEvent) {
    e.preventDefault()
    if (waypoints.length < 2) { setError('Add at least 2 waypoints on the map.'); return }
    setLoading(true); setError(null)

    const distance = estimateMissionDistance(waypoints)
    const avgSpd   = form.default_spd > 0 ? form.default_spd : 10
    const duration = Math.round(distance / avgSpd)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('missions')
      .insert({
        org_id:              orgId,
        created_by:          userId,
        name:                form.name,
        description:         form.description || null,
        mission_type:        form.mission_type,
        drone_id:            form.drone_id || null,
        waypoints,
        status:              'planned',
        planned_distance_m:  distance,
        planned_duration_s:  duration,
      })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/missions')
    router.refresh()
  }

  const distance = estimateMissionDistance(waypoints)

  return (
    <form onSubmit={createMission}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left panel: map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Flight Path</h2>
            <MissionMap waypoints={waypoints} onChange={setWaypoints} interactive />
          </div>

          {/* Mission stats strip */}
          {waypoints.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Waypoints',      value: waypoints.length },
                { label: 'Est. distance',  value: `${(distance / 1000).toFixed(2)} km` },
                { label: 'Est. duration',  value: `${Math.round(distance / form.default_spd / 60)} min` },
              ].map(s => (
                <div key={s.label} className="card-sm px-4 py-3 text-center">
                  <p className="text-lg font-bold text-cyan-400">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: config */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Mission Details</h2>

            <div>
              <label className="label">Mission name *</label>
              <input className="input" placeholder="e.g. Site A inspection" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>

            <div>
              <label className="label">Type</label>
              <select className="input" value={form.mission_type} onChange={e => set('mission_type', e.target.value)}>
                {MISSION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Assign drone</label>
              <select className="input" value={form.drone_id} onChange={e => set('drone_id', e.target.value)}>
                <option value="">— Unassigned —</option>
                {drones.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.battery_pct ? `(${d.battery_pct}%)` : ''} · {d.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none" rows={2}
                placeholder="Optional mission notes…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Flight Defaults</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Altitude (m)</label>
                <input type="number" className="input" min={5} max={400} value={form.default_alt}
                  onChange={e => set('default_alt', +e.target.value)} />
              </div>
              <div>
                <label className="label">Speed (m/s)</label>
                <input type="number" className="input" min={1} max={25} value={form.default_spd}
                  onChange={e => set('default_spd', +e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-slate-500">Applied to new waypoints. Override per-waypoint below the map.</p>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading || waypoints.length < 2}>
            {loading ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Zap size={13} /> Save Mission</>}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Mission will be saved as <strong className="text-slate-400">Planned</strong> and can be activated from the missions list.
          </p>
        </div>
      </div>
    </form>
  )
}
