import { Bell, Search } from 'lucide-react'

interface Props {
  title:    string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.06] bg-app-bg/60 backdrop-blur sticky top-0 z-30">
      <div>
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="btn-ghost p-2 rounded-lg">
          <Search size={15} />
        </button>
        <button className="btn-ghost p-2 rounded-lg relative">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </button>
      </div>
    </header>
  )
}
