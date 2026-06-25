import { BallIcon, ClockIcon } from './Icons.jsx'

function nextLabel(nextUpdate) {
  if (!nextUpdate) return null
  const secs = nextUpdate - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'actualizando…'
  const h = Math.floor(secs / 3600)
  if (h >= 1) return `actualiza en ~${h} h`
  return `actualiza en ${Math.max(1, Math.floor(secs / 60))} min`
}

export default function Header({ trainedThrough, nextUpdate }) {
  const next = nextLabel(nextUpdate)
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-white/5"
      style={{ background: 'rgba(4, 6, 15, 0.85)', backdropFilter: 'blur(20px)' }}>

      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center text-white">
            <BallIcon size={20} />
          </div>
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-violet-700 rounded-lg blur opacity-40 -z-10" />
        </div>
        <div className="leading-tight">
          <span className="text-white font-bold text-sm sm:text-base tracking-tight">AI World Cup</span>
          <span className="ml-1.5 text-blue-400 font-bold text-sm sm:text-base">2026</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
        {trainedThrough && (
          <span className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Datos reales hasta {trainedThrough}
          </span>
        )}
        {next && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/55"
            title="La proyección se actualiza automáticamente cada 12 horas">
            <ClockIcon size={13} />
            <span className="whitespace-nowrap">{next}</span>
          </span>
        )}
      </div>
    </header>
  )
}
