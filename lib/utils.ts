import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { DroneStatus, MissionStatus, FlightLogStatus } from './types'

// ── Tailwind class helper ──────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date formatting ────────────────────────────────────────────────────────
export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

// ── Unit conversions ───────────────────────────────────────────────────────
export function metersToKm(m: number) {
  return (m / 1000).toFixed(1)
}

export function secondsToMinutes(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec}s`
}

export function secondsToHMS(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${sec}s`
}

// ── Status helpers ─────────────────────────────────────────────────────────
export const droneStatusConfig: Record<DroneStatus, { label: string; color: string; dot: string }> = {
  online:      { label: 'Online',      color: 'text-cyan-400',   dot: 'bg-cyan-400' },
  flying:      { label: 'Flying',      color: 'text-green-400',  dot: 'bg-green-400 animate-pulse' },
  idle:        { label: 'Idle',        color: 'text-slate-400',  dot: 'bg-slate-400' },
  offline:     { label: 'Offline',     color: 'text-slate-500',  dot: 'bg-slate-600' },
  error:       { label: 'Error',       color: 'text-red-400',    dot: 'bg-red-400 animate-pulse' },
  maintenance: { label: 'Maintenance', color: 'text-amber-400',  dot: 'bg-amber-400' },
}

export const missionStatusConfig: Record<MissionStatus, { label: string; color: string; bg: string }> = {
  planned:   { label: 'Planned',   color: 'text-slate-300',  bg: 'bg-slate-800' },
  active:    { label: 'Active',    color: 'text-green-400',  bg: 'bg-green-900/40' },
  paused:    { label: 'Paused',    color: 'text-amber-400',  bg: 'bg-amber-900/40' },
  completed: { label: 'Completed', color: 'text-cyan-400',   bg: 'bg-cyan-900/30' },
  failed:    { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-900/40' },
  aborted:   { label: 'Aborted',   color: 'text-slate-400',  bg: 'bg-slate-800' },
}

export const logStatusConfig: Record<FlightLogStatus, { label: string; color: string }> = {
  completed:   { label: 'Completed',   color: 'text-cyan-400' },
  failed:      { label: 'Failed',      color: 'text-red-400' },
  aborted:     { label: 'Aborted',     color: 'text-amber-400' },
  in_progress: { label: 'In Progress', color: 'text-green-400' },
}

// ── Battery level color ────────────────────────────────────────────────────
export function batteryColor(pct: number) {
  if (pct > 50) return 'text-green-400'
  if (pct > 20) return 'text-amber-400'
  return 'text-red-400'
}

// ── Slug generator ─────────────────────────────────────────────────────────
export function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

// ── Haversine distance ─────────────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Mission distance estimator ─────────────────────────────────────────────
export function estimateMissionDistance(waypoints: { lat: number; lng: number }[]) {
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(
      waypoints[i].lat, waypoints[i].lng,
      waypoints[i + 1].lat, waypoints[i + 1].lng
    )
  }
  return total
}
