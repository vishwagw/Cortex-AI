'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Drone, Map, FileText, Settings,
  Shield, LogOut, ChevronDown, Zap,
} from 'lucide-react'
import type { Organization, Profile, OrgRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Drone icon substitute (lucide doesn't have one)
const DroneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2"/>
    <path d="M6 6l2.5 2.5M15.5 8.5 18 6M6 18l2.5-2.5M15.5 15.5 18 18"/>
    <path d="M4 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM16 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM4 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM16 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
  </svg>
)

const NAV = [
  { href: '/dashboard', label: 'Overview',     icon: LayoutDashboard },
  { href: '/fleet',     label: 'Fleet',         icon: DroneIcon },
  { href: '/missions',  label: 'Missions',      icon: Map },
  { href: '/logs',      label: 'Flight Logs',   icon: FileText },
  { href: '/settings',  label: 'Settings',      icon: Settings },
]

interface Props {
  profile:  Profile
  org:      Organization
  orgRole:  OrgRole
}

export default function Sidebar({ profile, org, orgRole }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-w)] flex flex-col bg-app-surface border-r border-white/[0.06] z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <span className="text-base font-bold tracking-[0.15em] text-white">
          COR<span className="text-cyan-400">TEX</span>
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Zap size={9} className="text-cyan-400" />
          <span className="text-[10px] text-slate-500 tracking-wider uppercase">Autonomy Platform</span>
        </div>
      </div>

      {/* Org switcher */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <button className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-cyan-400/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-cyan-400">
                {org.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium text-slate-200 truncate">{org.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{org.plan}</p>
            </div>
          </div>
          <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mb-2">Navigation</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn('nav-item', active && 'active')}>
              <Icon />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Admin link — only for super_admin */}
        {profile.system_role === 'super_admin' && (
          <>
            <div className="pt-3 pb-1">
              <p className="section-label px-2">Super Admin</p>
            </div>
            <Link href="/admin" className={cn('nav-item', pathname.startsWith('/admin') && 'active')}>
              <Shield size={16} />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      {/* User profile + signout */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
            ) : (
              <span className="text-[11px] font-medium text-slate-300">
                {profile.full_name?.slice(0, 2).toUpperCase() ?? '??'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{profile.full_name ?? 'User'}</p>
            <p className="text-[10px] text-slate-500 capitalize">{orgRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-slate-600 hover:text-slate-400 transition-colors p-1"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
