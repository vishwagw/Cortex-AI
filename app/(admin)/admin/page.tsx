import { redirect } from 'next/navigation'
import { getUser, createServiceClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { formatDate } from '@/lib/utils'
import { Shield, Users, Cpu, Map, Activity } from 'lucide-react'

export const metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const auth = await getUser()
  if (!auth?.profile || auth.profile.system_role !== 'super_admin') redirect('/dashboard')

  const supabase = createServiceClient()

  const [
    { data: orgs },
    { count: droneCount },
    { count: missionCount },
    { count: logCount },
    { count: telemetryCount },
  ] = await Promise.all([
    supabase.from('organizations').select('*, org_members(count)').order('created_at', { ascending: false }),
    supabase.from('drones').select('*', { count: 'exact', head: true }),
    supabase.from('missions').select('*', { count: 'exact', head: true }),
    supabase.from('flight_logs').select('*', { count: 'exact', head: true }),
    supabase.from('telemetry').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="page-enter">
      <Header title="Super Admin" subtitle="Platform-wide overview" />
      <main className="p-6 max-w-7xl space-y-6">

        {/* Platform stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Organizations', value: orgs?.length ?? 0,    icon: Shield },
            { label: 'Total Drones',  value: droneCount ?? 0,      icon: Cpu },
            { label: 'Total Missions',value: missionCount ?? 0,    icon: Map },
            { label: 'Flight Logs',   value: logCount ?? 0,        icon: Activity },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</span>
                <s.icon size={14} className="text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Telemetry data points */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
            <Activity size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400">{(telemetryCount ?? 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total telemetry data points collected — the data flywheel</p>
          </div>
        </div>

        {/* Orgs table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users size={14} className="text-slate-400" /> All Organizations
            </h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Plan</th>
                <th>Members</th>
                <th>Created</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {orgs?.map((org: any) => (
                <tr key={org.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-cyan-400/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                        {org.name.slice(0,2).toUpperCase()}
                      </div>
                      <span className="text-slate-200 font-medium">{org.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge text-xs capitalize ${
                      org.plan === 'enterprise'   ? 'bg-purple-900/40 text-purple-400' :
                      org.plan === 'manufacturer' ? 'bg-amber-900/40 text-amber-400' :
                                                    'bg-cyan-900/30 text-cyan-400'
                    }`}>{org.plan}</span>
                  </td>
                  <td className="text-slate-400 text-xs">{org.org_members?.[0]?.count ?? 0}</td>
                  <td className="text-slate-500 text-xs">{formatDate(org.created_at)}</td>
                  <td><span className="mono-tag">{org.slug}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  )
}
