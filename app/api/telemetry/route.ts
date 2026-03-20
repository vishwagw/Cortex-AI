import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TelemetrySchema = z.object({
  drone_id:     z.string().uuid(),
  lat:          z.number().min(-90).max(90),
  lng:          z.number().min(-180).max(180),
  altitude_m:   z.number().optional(),
  speed_ms:     z.number().min(0).optional(),
  heading_deg:  z.number().min(0).max(360).optional(),
  battery_pct:  z.number().min(0).max(100).optional(),
  signal_pct:   z.number().min(0).max(100).optional(),
  mode:         z.string().max(32).optional(),
  satellites:   z.number().int().optional(),
  mission_id:   z.string().uuid().optional(),
  flight_log_id:z.string().uuid().optional(),
})

/** Validate API key from Authorization header */
async function validateApiKey(req: NextRequest, supabase: ReturnType<typeof createServiceClient>) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const key = auth.slice(7)
  const { data } = await supabase
    .from('api_keys')
    .select('org_id, scopes, revoked_at, expires_at')
    .eq('key_hash', key)   // In production: compare hash
    .single()

  if (!data) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  if (!data.scopes.includes('telemetry:write')) return null

  // Update last_used_at (fire and forget)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', key)

  return data.org_id as string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const orgId    = await validateApiKey(req, supabase)

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized — invalid or missing API key' }, { status: 401 })
    }

    const body   = await req.json()
    const parsed = TelemetrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 })
    }

    const data = parsed.data

    // Verify drone belongs to this org
    const { data: drone } = await supabase
      .from('drones')
      .select('id')
      .eq('id', data.drone_id)
      .eq('org_id', orgId)
      .single()

    if (!drone) {
      return NextResponse.json({ error: 'Drone not found in your organization' }, { status: 404 })
    }

    // Insert telemetry
    const { error: insertError } = await supabase.from('telemetry').insert({
      org_id: orgId,
      ...data,
      recorded_at: new Date().toISOString(),
    })

    if (insertError) throw insertError

    // Update drone status + battery + last_seen
    await supabase.from('drones').update({
      last_seen_at: new Date().toISOString(),
      battery_pct:  data.battery_pct ?? undefined,
      status:       data.mode === 'LAND' || data.speed_ms === 0 ? 'idle' : 'flying',
    }).eq('id', data.drone_id)

    return NextResponse.json({ ok: true }, { status: 201 })

  } catch (err: any) {
    console.error('[telemetry/ingest]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Batch ingest — POST array of telemetry points
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const orgId    = await validateApiKey(req, supabase)
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!Array.isArray(body) || body.length > 500) {
      return NextResponse.json({ error: 'Expected array of up to 500 points' }, { status: 422 })
    }

    const now    = new Date().toISOString()
    const points = body.map(p => ({ org_id: orgId, ...p, recorded_at: p.recorded_at ?? now }))

    const { error } = await supabase.from('telemetry').insert(points)
    if (error) throw error

    return NextResponse.json({ ok: true, inserted: points.length }, { status: 201 })

  } catch (err: any) {
    console.error('[telemetry/batch]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
