import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUserOrg } from '@/lib/supabase/server'
import { z } from 'zod'

const StatusSchema = z.object({
  status: z.enum(['active','paused','completed','aborted']),
})

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const orgData = await getUserOrg()
  if (!orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = StatusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()

  // Verify mission belongs to org
  const { data: mission } = await supabase
    .from('missions')
    .select('id, status, org_id')
    .eq('id', params.id)
    .eq('org_id', orgData.org.id)
    .single()

  if (!mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

  const updates: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'active' && mission.status === 'planned') {
    updates.started_at = new Date().toISOString()
  }
  if (['completed','aborted'].includes(parsed.data.status)) {
    updates.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function GET(req: NextRequest, { params }: Params) {
  const orgData = await getUserOrg()
  if (!orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('missions')
    .select('*, drones(id, name, status, battery_pct, platform)')
    .eq('id', params.id)
    .eq('org_id', orgData.org.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
  return NextResponse.json({ data })
}
