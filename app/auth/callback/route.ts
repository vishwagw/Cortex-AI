import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles email confirmation, OAuth callbacks, magic links
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/dashboard'
  const errorMsg = searchParams.get('error_description')

  if (errorMsg) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
