import { redirect } from 'next/navigation'
import { getUser, getUserOrg } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [auth, orgData] = await Promise.all([getUser(), getUserOrg()])

  if (!auth?.profile || auth.profile.system_role !== 'super_admin') redirect('/dashboard')
  if (!orgData) redirect('/login')

  return (
    <div className="min-h-screen flex">
      <Sidebar profile={auth.profile} org={orgData.org} orgRole={orgData.role} />
      <div className="flex-1 ml-[var(--sidebar-w)] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
