import { redirect } from 'next/navigation'
import { getUserOrg, createClient, getUser } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MissionPlannerClient from '@/components/missions/MissionPlannerClient'

export const metadata = { title: 'Plan Mission' }

export default async function NewMissionPage() {
  const [auth, orgData] = await Promise.all([getUser(), getUserOrg()])
  if (!auth || !orgData) redirect('/login')
  const { org } = orgData

  const supabase = await createClient()
  const { data: drones } = await supabase
    .from('drones')
    .select('id,name,platform,status,battery_pct')
    .eq('org_id', org.id)
    .neq('status', 'maintenance')
    .order('name')

  return (
    <div className="page-enter">
      <Header title="Plan Mission" subtitle="Define waypoints and configure autonomous flight" />
      <main className="p-6 max-w-7xl">
        <MissionPlannerClient
          orgId={org.id}
          userId={auth.user.id}
          drones={drones ?? []}
        />
      </main>
    </div>
  )
}
