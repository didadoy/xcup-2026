import { getFlagUrl, teamLabel } from '../data/teams.js'

const RANK_STYLE = [
  'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40',   // 1º oro
  'bg-slate-300/15 text-slate-200 ring-1 ring-slate-300/30',   // 2º plata
  'bg-orange-700/25 text-orange-300 ring-1 ring-orange-600/40', // 3º bronce
]

function Rank({ i }) {
  const style = RANK_STYLE[i] ?? 'bg-white/5 text-white/45'
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums flex-shrink-0 ${style}`}>
      {i + 1}
    </span>
  )
}

export default function FavouritesPanel({ favourites, simulations }) {
  if (!favourites) return null
  const max = favourites[0]?.champion || 1
  const shown = favourites.filter(t => t.champion > 0.05).slice(0, 20)

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <p className="text-xs text-white/50 mb-4">
        Probabilidad de ganar el Mundial según <strong className="text-white/80">{simulations?.toLocaleString('es')}</strong> simulaciones
        Monte Carlo del cuadro completo (partidos restantes + eliminatoria).
      </p>

      {/* Cabecera de columnas */}
      <div className="flex items-center gap-3 px-3 pb-1.5 text-[9px] uppercase tracking-wider text-white/35">
        <span className="w-6" /><span className="w-[26px]" />
        <span className="flex-1">Selección</span>
        <span className="hidden sm:block w-10 text-right">Semis</span>
        <span className="hidden sm:block w-10 text-right">Final</span>
        <span className="w-14 text-right text-amber-400/70">Campeón</span>
      </div>

      <ol className="space-y-1.5">
        {shown.map((t, i) => (
          <li key={t.team} className="glass rounded-lg px-3 py-2 flex items-center gap-3">
            <Rank i={i} />
            {getFlagUrl(t.team)
              ? <img src={getFlagUrl(t.team, 40)} alt="" width={26} height={17} className="rounded-[2px] object-cover flex-shrink-0" style={{ height: 17 }} />
              : <div className="w-[26px] h-[17px] rounded-[2px] bg-white/10 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{teamLabel(t.team)}</span>
                <span className="text-[9px] text-white/40 uppercase">Grupo {t.group}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-1">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{ width: `${t.champion / max * 100}%` }} />
              </div>
            </div>
            <span className="hidden sm:block w-10 text-right text-xs text-white/55 tabular-nums">{t.sf}%</span>
            <span className="hidden sm:block w-10 text-right text-xs text-white/55 tabular-nums">{t.final}%</span>
            <span className="w-14 text-right text-base font-black text-white tabular-nums">{t.champion}%</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
