'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, formatDate } from '@/lib/utils'
import { Copy, Plus, Trash2, Eye, EyeOff, Loader2, Check, Key } from 'lucide-react'
import type { Organization, Profile, OrgRole } from '@/lib/types'

interface Props {
  org:     Organization
  profile: Profile
  members: any[]
  apiKeys: any[]
  orgRole: OrgRole
}

const SCOPES = ['telemetry:read','telemetry:write','missions:read','missions:write','fleet:read']

export default function SettingsClient({ org, profile, members, apiKeys: initialKeys, orgRole }: Props) {
  const [tab, setTab]         = useState<'general'|'members'|'api'|'integrations'>('general')
  const [apiKeys, setApiKeys] = useState(initialKeys)
  const [showNewKey, setShowNewKey] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [keyForm, setKeyForm] = useState({ name: '', scopes: ['telemetry:read'] as string[] })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  function toggleScope(s: string) {
    setKeyForm(p => ({
      ...p,
      scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s]
    }))
  }

  async function createApiKey() {
    setLoading(true)
    const raw = `cx_${crypto.randomUUID().replace(/-/g,'')}`
    const prefix = raw.slice(0, 10)
    // In production: hash with bcrypt on server. Here we simulate.
    const supabase = createClient()
    const { data, error } = await supabase.from('api_keys').insert({
      org_id: org.id,
      created_by: profile.id,
      name: keyForm.name,
      key_hash: raw, // NOTE: In production, hash this server-side
      key_prefix: prefix,
      scopes: keyForm.scopes,
    }).select().single()
    if (!error && data) {
      setApiKeys(p => [data, ...p])
      setNewKeyResult(raw)
      setShowNewKey(false)
      setKeyForm({ name: '', scopes: ['telemetry:read'] })
    }
    setLoading(false)
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? All integrations using it will stop working.')) return
    const supabase = createClient()
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    setApiKeys(p => p.map(k => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k))
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const TABS = [
    { id: 'general',      label: 'General' },
    { id: 'members',      label: 'Members' },
    { id: 'api',          label: 'API Keys' },
    { id: 'integrations', label: 'Integrations' },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {tab === 'general' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Organization</h2>
            <div>
              <label className="label">Organization name</label>
              <input className="input" defaultValue={org.name} readOnly={orgRole !== 'admin'} />
            </div>
            <div>
              <label className="label">Slug</label>
              <input className="input font-mono text-xs" defaultValue={org.slug} readOnly />
            </div>
            <div>
              <label className="label">Plan</label>
              <div className="input flex items-center capitalize text-cyan-400">{org.plan}</div>
            </div>
          </div>
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Your Profile</h2>
            <div>
              <label className="label">Full name</label>
              <input className="input" defaultValue={profile.full_name ?? ''} />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="input capitalize text-slate-400">{profile.system_role}</div>
            </div>
            <button className="btn-primary">Save changes</button>
          </div>
        </div>
      )}

      {/* ── Members ── */}
      {tab === 'members' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">{members.length} members</h2>
            {orgRole === 'admin' && <button className="btn-primary text-xs px-3 py-1.5"><Plus size={12} /> Invite</button>}
          </div>
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 flex-shrink-0">
                {m.profiles?.full_name?.slice(0,2).toUpperCase() ?? '??'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{m.profiles?.full_name ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500 capitalize">{m.role}</p>
              </div>
              <span className="text-xs text-slate-500">{timeAgo(m.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── API Keys ── */}
      {tab === 'api' && (
        <div className="space-y-4">
          {newKeyResult && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4">
              <p className="text-sm text-green-400 font-medium mb-2">API key created — copy it now, it won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-black/30 rounded px-3 py-2 text-green-300 truncate">{newKeyResult}</code>
                <button onClick={() => copyKey(newKeyResult)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <button onClick={() => setNewKeyResult(null)} className="text-xs text-slate-500 mt-2 hover:text-slate-300">Dismiss</button>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">API keys allow external services to interact with Cortex.</p>
            {orgRole === 'admin' && (
              <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setShowNewKey(true)}>
                <Plus size={12} /> New key
              </button>
            )}
          </div>

          {showNewKey && (
            <div className="card p-5 space-y-4 border-cyan-400/20">
              <h3 className="text-sm font-semibold text-white">Create API key</h3>
              <div>
                <label className="label">Key name</label>
                <input className="input" placeholder="e.g. Production drone controller" value={keyForm.name} onChange={e => setKeyForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label mb-2">Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map(s => (
                    <label key={s} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      keyForm.scopes.includes(s) ? 'border-cyan-400/40 bg-cyan-400/[0.06] text-cyan-400' : 'border-white/[0.06] text-slate-400'
                    }`}>
                      <input type="checkbox" className="accent-cyan-400" checked={keyForm.scopes.includes(s)} onChange={() => toggleScope(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setShowNewKey(false)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={createApiKey} disabled={loading || !keyForm.name}>
                  {loading && <Loader2 size={12} className="animate-spin" />} Generate key
                </button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="card p-8 flex flex-col items-center gap-2 text-center">
              <Key size={20} className="text-slate-600" />
              <p className="text-sm text-slate-500">No API keys yet</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {apiKeys.map((k: any) => (
                <div key={k.id} className={`flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 ${k.revoked_at ? 'opacity-40' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-white font-medium">{k.name}</p>
                      {k.revoked_at && <span className="badge bg-red-900/40 text-red-400 text-[10px]">Revoked</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono">{k.key_prefix}…</span>
                      <span>Created {formatDate(k.created_at)}</span>
                      {k.last_used_at && <span>Last used {timeAgo(k.last_used_at)}</span>}
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {k.scopes?.map((s: string) => (
                        <span key={s} className="mono-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                  {!k.revoked_at && orgRole === 'admin' && (
                    <button onClick={() => revokeKey(k.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Integrations ── */}
      {tab === 'integrations' && (
        <div className="space-y-3">
          {[
            { name: 'MAVLink',    desc: 'Connect via MAVLink UDP/TCP bridge',     status: 'available' },
            { name: 'ArduPilot', desc: 'Native ArduPilot SITL + real hardware',  status: 'available' },
            { name: 'ROS / ROS2',desc: 'ROS bridge via rosbridge_server',         status: 'available' },
            { name: 'PX4',       desc: 'PX4 MAVSDK integration',                 status: 'coming_soon' },
            { name: 'DJI SDK',   desc: 'DJI Mobile & Onboard SDK',              status: 'coming_soon' },
          ].map(i => (
            <div key={i.name} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-400">{i.name.slice(0,2)}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{i.name}</p>
                <p className="text-xs text-slate-500">{i.desc}</p>
              </div>
              {i.status === 'available' ? (
                <button className="btn-secondary text-xs px-3 py-1.5">Configure</button>
              ) : (
                <span className="badge bg-white/[0.04] text-slate-500 text-xs">Coming soon</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
