import { redirect } from 'next/navigation'
import { getUserOrg, createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { missionStatusConfig, formatDateTime, secondsToHMS } from '@/lib/utils'
import { Plus, Map } from 'lucide-react'

export const metadata = { title: 'Missions' }

export default async function MissionsPage() {
  const orgData = await getUserOrg()
  if (!orgData) redirect('/login')
  const { org } = orgData

  const supabase = await createClient()
  const { data: missions } = await supabase
    .from('missions')
    .select('*, drones(name)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <div className="page-enter">
      <Header
        title="Missions"
        subtitle={`${missions?.length ?? 0} total missions`}
        actions={
          <Link href="/missions/new" className="btn-primary text-xs px-3 py-1.5">
            <Plus size={13} /> New Mission
          </Link>
        }
      />
      <main className="p-6 max-w-7xl">

        {/* Status filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['all', 'active', 'planned', 'completed', 'failed'].map(s => (
            <button key={s} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              s === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}>{s}</button>
          ))}
        </div>

        {!missions?.length ? (
          <div className="card p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Map size={24} className="text-slate-600" />
            </div>
            <div>
              <p className="text-white font-medium mb-1">No missions yet</p>
              <p className="text-sm text-slate-500">Plan your first autonomous flight mission</p>
            </div>
            <Link href="/missions/new" className="btn-primary">
              <Plus size={14} /> Plan first mission
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Drone</th>
                  <th>Waypoints</th>
                  <th>Distance</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m: any) => {
                  const cfg = missionStatusConfig[m.status as keyof typeof missionStatusConfig]
                  return (
                    <tr key={m.id} className="cursor-pointer">
                      <td>
                        <Link href={`/missions/${m.id}`} className="hover:text-white transition-colors">
                          <p className="font-medium text-slate-200">{m.name}</p>
                          {m.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{m.description}</p>}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="capitalize text-slate-400 text-xs">{m.mission_type ?? '—'}</td>
                      <td className="text-slate-400 text-xs">{(m as any).drones?.name ?? '—'}</td>
                      <td className="text-slate-400 text-xs">{Array.isArray(m.waypoints) ? m.waypoints.length : 0}</td>
                      <td className="text-slate-400 text-xs">
                        {m.planned_distance_m ? `${(m.planned_distance_m / 1000).toFixed(1)} km` : '—'}
                      </td>
                      <td className="text-slate-500 text-xs">{formatDateTime(m.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
