import { redirect } from 'next/navigation'
import { getUserOrg, getUser, createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import SettingsClient from '@/components/layout/SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const [auth, orgData] = await Promise.all([getUser(), getUserOrg()])
  if (!auth || !orgData) redirect('/login')
  const { org, role } = orgData

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('org_members')
    .select('*, profiles(full_name, avatar_url)')
    .eq('org_id', org.id)

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <div className="page-enter">
      <Header title="Settings" subtitle="Manage your organization and integrations" />
      <main className="p-6 max-w-3xl">
        <SettingsClient
          org={org}
          profile={auth.profile!}
          members={members ?? []}
          apiKeys={apiKeys ?? []}
          orgRole={role}
        />
      </main>
    </div>
  )
}
