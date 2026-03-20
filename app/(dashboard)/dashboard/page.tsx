import { redirect } from 'next/navigation'
import { getUserOrg, createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import StatCard from '@/components/dashboard/StatCard'
import TelemetryChart from '@/components/dashboard/TelemetryChart'
import { droneStatusConfig, missionStatusConfig, timeAgo, secondsToHMS } from '@/lib/utils'
import { Activity, Cpu, Map, Zap, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const orgData = await getUserOrg()
  if (!orgData) redirect('/login')
  const { org } = orgData

  const supabase = await createClient()

  // Parallel data fetches
  const [
    { data: drones },
    { data: activeMissions },
    { data: recentLogs },
    { data: todayLogs },
  ] = await Promise.all([
    supabase.from('drones').select('id,name,status,battery_pct,last_seen_at,platform').eq('org_id', org.id).order('name'),
    supabase.from('missions').select('id,name,status,drone_id,started_at').eq('org_id', org.id).in('status', ['active','paused']).limit(5),
    supabase.from('flight_logs').select('id,distance_m,duration_s,status,started_at,drone_id,drones(name)').eq('org_id', org.id).order('started_at', { ascending: false }).limit(6),
    supabase.from('flight_logs').select('id,distance_m,duration_s').eq('org_id', org.id).gte('started_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ])

  const totalDrones   = drones?.length ?? 0
  const flyingDrones  = drones?.filter(d => d.status === 'flying').length ?? 0
  const onlineDrones  = drones?.filter(d => d.status !== 'offline').length ?? 0
  const todayFlights  = todayLogs?.length ?? 0
  const todayDistance = todayLogs?.reduce((s, l) => s + (l.distance_m ?? 0), 0) ?? 0

  return (
    <div className="page-enter">
      <Header
        title="Overview"
        subtitle={`${org.name} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        actions={
          <Link href="/missions/new" className="btn-primary text-xs px-3 py-1.5">
            + New Mission
          </Link>
        }
      />

      <main className="p-6 space-y-6 max-w-7xl">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Drones"    value={totalDrones}  sub={`${onlineDrones} online`}       icon={Cpu}      />
          <StatCard label="Flying Now"      value={flyingDrones} sub="active drones"                   icon={Activity} accent={flyingDrones > 0} />
          <StatCard label="Flights Today"   value={todayFlights} sub={`${(todayDistance / 1000).toFixed(1)} km covered`} icon={Map} />
          <StatCard label="Active Missions" value={activeMissions?.length ?? 0} sub="in progress"     icon={Zap}      />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Telemetry chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Live Telemetry</h2>
                <p className="text-xs text-slate-500">Fleet-wide · last 60 data points</p>
              </div>
            </div>
            <TelemetryChart orgId={org.id} />
          </div>

          {/* Fleet status */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Fleet Status</h2>
              <Link href="/fleet" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
            </div>
            {!drones?.length ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <AlertCircle size={20} className="text-slate-600" />
                <p className="text-xs text-slate-500">No drones registered yet</p>
                <Link href="/fleet" className="text-xs text-cyan-400">Add a drone →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {drones.slice(0, 7).map(drone => {
                  const cfg = droneStatusConfig[drone.status]
                  return (
                    <Link key={drone.id} href={`/fleet?id=${drone.id}`}
                      className="flex items-center justify-between py-2 hover:bg-white/[0.02] rounded-lg px-1 -mx-1 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`status-dot flex-shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate group-hover:text-white">{drone.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{drone.platform ?? 'Unknown platform'}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                        {drone.battery_pct != null && (
                          <p className="text-xs text-slate-500">{drone.battery_pct}%</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Active missions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Active Missions</h2>
              <Link href="/missions" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
            </div>
            {!activeMissions?.length ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2">
                <p className="text-xs text-slate-500">No active missions</p>
                <Link href="/missions/new" className="text-xs text-cyan-400">Plan a mission →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeMissions.map(m => {
                  const cfg = missionStatusConfig[m.status]
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm text-slate-200">{m.name}</p>
                        {m.started_at && <p className="text-xs text-slate-500">Started {timeAgo(m.started_at)}</p>}
                      </div>
                      <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent flight logs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Recent Flights</h2>
              <Link href="/logs" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
            </div>
            {!recentLogs?.length ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-xs text-slate-500">No flights recorded yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm text-slate-200">{log.drones?.name ?? 'Unknown drone'}</p>
                      <p className="text-xs text-slate-500">{timeAgo(log.started_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-300">{((log.distance_m ?? 0) / 1000).toFixed(1)} km</p>
                      {log.duration_s && <p className="text-xs text-slate-500">{secondsToHMS(log.duration_s)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
