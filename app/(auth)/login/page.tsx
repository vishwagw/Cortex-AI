'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="card p-8 page-enter">
      <h1 className="text-lg font-semibold text-white mb-1">Welcome back</h1>
      <p className="text-sm text-slate-400 mb-6">Sign in to your Cortex account</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label mb-0">Password</label>
            <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-slate-600">or</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link href="/signup" className="text-cyan-400 hover:text-cyan-300">
          Create one
        </Link>
      </p>
    </div>
  )
}
