'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils'
import { Loader2, Eye, EyeOff, Building2, User, ChevronRight } from 'lucide-react'
import type { OrgPlan } from '@/lib/types'

const PLANS: { id: OrgPlan; label: string; desc: string }[] = [
  { id: 'operator',     label: 'Operator',     desc: 'Fly autonomous missions with your own fleet' },
  { id: 'manufacturer', label: 'Manufacturer', desc: 'White-label Cortex for your drone products' },
  { id: 'enterprise',   label: 'Enterprise',   desc: 'Full API access + multi-org management' },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep]         = useState<1 | 2>(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPw, setShowPw]     = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    org_name: '', plan: 'operator' as OrgPlan,
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (!authData.user) { setError('Signup failed — please try again.'); setLoading(false); return }

    // 2. Create organization
    const slug = generateSlug(form.org_name)
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: form.org_name, slug, plan: form.plan })
      .select()
      .single()

    if (orgError) { setError(orgError.message); setLoading(false); return }

    // 3. Add user as org admin
    await supabase.from('org_members').insert({
      org_id: orgData.id,
      user_id: authData.user.id,
      role: 'admin',
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="card p-8 page-enter">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s === step ? 'bg-cyan-400 text-app-bg' :
              s < step   ? 'bg-cyan-400/20 text-cyan-400' :
                           'bg-white/[0.06] text-slate-500'
            }`}>{s}</div>
            {s < 2 && <div className={`w-8 h-px ${s < step ? 'bg-cyan-400/40' : 'bg-white/[0.06]'}`} />}
          </div>
        ))}
        <span className="text-xs text-slate-500 ml-1">{step === 1 ? 'Your account' : 'Your organization'}</span>
      </div>

      <h1 className="text-lg font-semibold text-white mb-1">
        {step === 1 ? 'Create your account' : 'Set up your organization'}
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        {step === 1 ? 'Get started with Cortex in minutes.' : 'Your workspace for fleet management.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" className="input pl-8"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  required autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label">Work email</label>
              <input
                type="email" className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="8+ characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required minLength={8}
                />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label">Organization name</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" className="input pl-8"
                  placeholder="Acme Drones Ltd."
                  value={form.org_name}
                  onChange={e => set('org_name', e.target.value)}
                  required autoFocus
                />
              </div>
              {form.org_name && (
                <p className="text-xs text-slate-500 mt-1">
                  Slug: <span className="font-mono text-slate-400">{generateSlug(form.org_name)}</span>
                </p>
              )}
            </div>
            <div>
              <label className="label">Account type</label>
              <div className="space-y-2">
                {PLANS.map(plan => (
                  <label key={plan.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.plan === plan.id
                        ? 'border-cyan-400/40 bg-cyan-400/[0.06]'
                        : 'border-white/[0.06] hover:border-white/[0.1]'
                    }`}>
                    <input
                      type="radio" name="plan" value={plan.id}
                      checked={form.plan === plan.id}
                      onChange={() => set('plan', plan.id)}
                      className="mt-0.5 accent-cyan-400"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{plan.label}</div>
                      <div className="text-xs text-slate-400">{plan.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {step === 2 && (
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>
              Back
            </button>
          )}
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Creating…' : step === 1 ? (
              <><span>Continue</span><ChevronRight size={14} /></>
            ) : 'Create account'}
          </button>
        </div>
      </form>

      {step === 1 && (
        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">Sign in</Link>
        </p>
      )}
    </div>
  )
}
