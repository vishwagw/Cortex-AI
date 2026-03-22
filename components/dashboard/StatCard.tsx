import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label:     string
  value:     string | number
  sub?:      string
  icon?:     LucideIcon
  accent?:   boolean
  trend?:    { value: number; label: string }
  className?: string
}

export default function StatCard({ label, value, sub, icon: Icon, accent, trend, className }: Props) {
  return (
    <div className={cn(
      'card p-5 flex flex-col gap-3',
      accent && 'border-cyan-400/20 bg-cyan-400/[0.04]',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
        {Icon && (
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            accent ? 'bg-cyan-400/10' : 'bg-white/[0.04]'
          )}>
            <Icon size={14} className={accent ? 'text-cyan-400' : 'text-slate-400'} />
          </div>
        )}
      </div>
      <div>
        <div className={cn('text-2xl font-bold tracking-tight', accent ? 'text-cyan-400' : 'text-white')}>
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
      {trend && (
        <div className={cn(
          'text-xs flex items-center gap-1',
          trend.value >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span className="text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
