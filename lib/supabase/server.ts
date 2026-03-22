import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Profile, Organization, OrgMember, OrgRole } from '../types'

// ── Server-side Supabase client (reads cookies from request) ───────────────
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie setting ignored
          }
        },
      },
    }
  )
}

// ── Service role client — bypasses RLS, server-only ───────────────────────
export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Get the currently authenticated user + profile */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile: profile as Profile | null }
}

/** Get user's active org (first membership) */
export async function getUserOrg(): Promise<{
  org: Organization
  member: OrgMember
  role: OrgRole
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('org_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .single()

  if (!data) return null

  return {
    org: data.organizations as Organization,
    member: data as OrgMember,
    role: data.role as OrgRole,
  }
}
