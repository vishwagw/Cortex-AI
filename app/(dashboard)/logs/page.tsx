import { redirect } from 'next/navigation'
import { getUserOrg, createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import LogsClient from '@/components/logs/LogsClient'

export const metadata = { title: 'Flight Logs' }

export default async function LogsPage() {
  const orgData = await getUserOrg()
  if (!orgData) redirect('/login')
  const { org } = orgData

  const supabase = await createClient()

  const [{ data: logs }, { data: drones }] = await Promise.all([
    supabase
      .from('flight_logs')
      .select(`
        id, status, distance_m, duration_s,
        max_altitude_m, avg_speed_ms, min_battery_pct,
        waypoints_hit, started_at, ended_at,
        drones(id, name, model),
        missions(id, name, mission_type)
      `)
      .eq('org_id', org.id)
      .order('started_at', { ascending: false })
      .limit(100),
    supabase.from('drones').select('id,name').eq('org_id', org.id).order('name'),
  ])

  // Aggregate stats
  const completed  = logs?.filter(l => l.status === 'completed') ?? []
  const totalDist  = completed.reduce((s, l) => s + (l.distance_m ?? 0), 0)
  const totalTime  = completed.reduce((s, l) => s + (l.duration_s ?? 0), 0)
  const avgAlt     = completed.length ? completed.reduce((s, l) => s + (l.max_altitude_m ?? 0), 0) / completed.length : 0

  const stats = {
    totalFlights:    logs?.length ?? 0,
    completedFlights: completed.length,
    totalDistanceKm: totalDist / 1000,
    totalTimeHours:  totalTime / 3600,
    avgMaxAlt:       avgAlt,
  }

  return (
    <div className="page-enter">
      <Header title="Flight Logs" subtitle="Complete history of all flights" />
      <main className="p-6 max-w-7xl">
        <LogsClient logs={logs ?? []} drones={drones ?? []} stats={stats} />
      </main>
    </div>
  )
}
