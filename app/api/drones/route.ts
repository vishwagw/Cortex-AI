import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/supabase/server'
import { z } from 'zod'

const DroneSchema = z.object({
  name:           z.string().min(1).max(80),
  model:          z.string().max(100).optional(),
  serial_number:  z.string().max(100).optional(),
  platform:       z.enum(['mavlink','ardupilot','ros','px4','custom']).optional(),
})

export async function GET(req: NextRequest) {
  const orgData = await getUserOrg()
  if (!orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drones')
    .select('*')
    .eq('org_id', orgData.org.id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const orgData = await getUserOrg()
  if (!orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (orgData.role !== 'admin') return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 })

  const body   = await req.json()
  const parsed = DroneSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drones')
    .insert({ ...parsed.data, org_id: orgData.org.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
