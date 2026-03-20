import { NextRequest, NextResponse } from 'next/server'
import { createClient, getUserOrg, getUser } from '@/lib/supabase/server'
import { z } from 'zod'

const WaypointSchema = z.object({
  id:          z.string(),
  lat:         z.number().min(-90).max(90),
  lng:         z.number().min(-180).max(180),
  altitude_m:  z.number().min(1).max(500),
  speed_ms:    z.number().min(0).max(30).optional(),
  action:      z.string().optional(),
  hold_s:      z.number().optional(),
})

const MissionSchema = z.object({
  name:                z.string().min(1).max(120),
  description:         z.string().max(500).optional(),
  mission_type:        z.enum(['inspection','delivery','mapping','surveillance','survey','custom']).optional(),
  drone_id:            z.string().uuid().optional().nullable(),
  waypoints:           z.array(WaypointSchema).min(1),
  planned_distance_m:  z.number().optional(),
  planned_duration_s:  z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  const orgData = await getUserOrg()
  if (!orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = await createClient()
  let query = supabase
    .from('missions')
    .select('*, drones(id, name, status)')
    .eq('org_id', orgData.org.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const [auth, orgData] = await Promise.all([getUser(), getUserOrg()])
  if (!auth || !orgData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = MissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('missions')
    .insert({
      ...parsed.data,
      org_id:     orgData.org.id,
      created_by: auth.user.id,
      status:     'planned',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
