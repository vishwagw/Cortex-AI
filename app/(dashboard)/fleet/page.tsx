import { redirect } from 'next/navigation'
import { getUserOrg, createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import FleetClient from '@/components/fleet/FleetClient'

export const metadata = { title: 'Fleet' }

export default async function FleetPage() {
  const orgData = await getUserOrg()
  if (!orgData) redirect('/login')
  const { org, role } = orgData

  const supabase = await createClient()
  const { data: drones } = await supabase
    .from('drones')
    .select('*')
    .eq('org_id', org.id)
    .order('name')

  return (
    <div className="page-enter">
      <Header title="Fleet" subtitle={`${drones?.length ?? 0} drones registered`} />
      <main className="p-6 max-w-7xl">
        <FleetClient drones={drones ?? []} orgId={org.id} canManage={role === 'admin'} />
      </main>
    </div>
  )
}
