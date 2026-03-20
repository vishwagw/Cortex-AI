export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Grid background */}
      <div className="fixed inset-0 bg-grid-pattern opacity-100 pointer-events-none" />
      {/* Glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-400/[0.03] blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-[0.18em] text-white">
            COR<span className="text-cyan-400">TEX</span>
          </span>
          <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">Autonomy Platform</p>
        </div>

        {children}
      </div>
    </div>
  )
}
