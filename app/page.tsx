import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'

export default async function Home() {
  const auth = await getUser()
  if (auth?.user) redirect('/dashboard')
  redirect('/login')
}
