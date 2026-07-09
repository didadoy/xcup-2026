import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { TrophyIcon } from './Icons.jsx'

const ROUND_LABELS = { r32: '16avos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semifinales', final: 'Final' }

function Tile({ label, value, sub, good }) {
  return (
    <div className="glass rounded-xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl sm:text-3xl font-black mt-1 ${good ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ label, num, den, accent }) {
  const pct = den > 0 ? Math.round((num / den) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-24 sm:w-28 text-[11px] text-white/55 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-[11px] font-bold text-white/80 tabular-nums flex-shrink-0">{num}/{den}</span>
    </div>
  )
}

function ChampCard({ title, team, extra, highlight }) {
  return (
    <div className={`flex-1 glass rounded-2xl p-4 sm:p-5 text-center border ${highlight ? 'border-amber-400/40' : 'border-white/10'}`}>
      <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{title}</div>
      <div className="flex items-center justify-center gap-2">
        {team && getFlagUrl(team) &&
          <img src={getFlagUrl(team, 80)} alt="" width={34} height={23} className="rounded-[3px]" style={{ height: 23 }} />}
        <span className="text-xl sm:text-2xl font-black text-white">{team ? teamLabel(team) : '—'}</span>
      </div>
      {extra && <div className="text-[11px] text-amber-300/80 font-semibold mt-1.5">{extra}</div>}
    </div>
  )
}

export default function FinalReport({ data, onGoBracket }) {
  const { data: bt } = useBacktest()
  if (!data?.champion_real) return null

  const hit = data.champion_hit
  const rs = data.rounds_summary || {}
  const totHits = Object.values(rs).reduce((n, s) => n + (s.hits || 0), 0)
  const totDet = Object.values(rs).reduce((n, s) => n + (s.determined || 0), 0)
  const totFav = Object.values(rs).reduce((n, s) => n + (s.fav_won || 0), 0)
  const totPlayed = Object.values(rs).reduce((n, s) => n + (s.played || 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-10">
      {/* Hero */}
      <div className="text-center mb-5">
        <TrophyIcon size={40} className="text-amber-400 mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-black text-white">El Mundial 2026 ha terminado</h2>
        <p className="text-xs sm:text-sm text-white/50 mt-1">
          Informe final del modelo: qué predijo antes de cada ronda y qué pasó de verdad.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <ChampCard title="Campeón según el modelo" team={data.champion_pred}
          extra={data.champion_pred_prob != null ? `${data.champion_pred_prob}% de probabilidad de título (la más alta)` : null} />
        <ChampCard title="Campeón real" team={data.champion_real} highlight />
      </div>

      <div className={`rounded-xl px-4 py-3 mb-6 text-center text-sm font-bold ${
        hit ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
        {hit
          ? 'El modelo acertó el campeón del Mundial.'
          : 'El campeón real no fue el favorito del modelo.'}
      </div>

      {/* Métricas del backtest */}
      {bt && !bt.loading && (
        <>
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
            Rendimiento sobre los {bt.test_matches} partidos del torneo
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2">
            <Tile label="Acierto resultado (1X2)" value={`${bt.accuracy_1x2}%`} good
              sub={`local ${bt.baseline_home}% · mejor Elo ${bt.baseline_elo}%`} />
            <Tile label="Marcador exacto" value={`${bt.exact_score}%`} sub="clavarlo es casi azar" />
            <Tile label="Brier score ↓" value={bt.brier} good sub={`sin info: ${bt.brier_baseline}`} />
            <Tile label="Log-loss ↓" value={bt.logloss} good sub={`sin info: ${bt.logloss_baseline}`} />
          </div>
          <p className="text-[11px] text-white/45 mb-6">
            Validación <strong className="text-white/70">out-of-sample</strong>: el modelo se reentrenó excluyendo el
            Mundial 2026, así que ninguno de estos partidos influyó en sus parámetros.
          </p>
        </>
      )}

      {/* Aciertos por ronda */}
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Aciertos del cuadro por ronda</h3>
      <div className="glass rounded-xl p-4 space-y-4 mb-2">
        <div>
          <div className="text-[11px] text-white/50 mb-2">
            <strong className="text-white/80">Cruces acertados</strong> — ¿predijo el modelo este emparejamiento exacto?
            {' '}Total: <strong className="text-emerald-300">{totHits}/{totDet}</strong>
          </div>
          <div className="space-y-1.5">
            {Object.entries(rs).map(([r, s]) => (
              <Bar key={r} label={ROUND_LABELS[r]} num={s.hits} den={s.determined} accent="bg-emerald-400/80" />
            ))}
          </div>
        </div>
        <div className="border-t border-white/[0.07] pt-4">
          <div className="text-[11px] text-white/50 mb-2">
            <strong className="text-white/80">El favorito pasó</strong> — en los cruces reales, ¿avanzó el equipo
            que el modelo daba por favorito? Total: <strong className="text-blue-300">{totFav}/{totPlayed}</strong>
          </div>
          <div className="space-y-1.5">
            {Object.entries(rs).map(([r, s]) => (
              <Bar key={r} label={ROUND_LABELS[r]} num={s.fav_won} den={s.played} accent="bg-blue-400/80" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-white/45 mb-6">
        Acertar el cruce exige acertar en cadena todos los partidos anteriores, por eso baja en rondas avanzadas.
      </p>

      <div className="text-center">
        <button onClick={onGoBracket}
          className="px-5 py-2.5 rounded-xl bg-blue-600/25 border border-blue-500/40 text-blue-200 text-sm font-bold hover:bg-blue-600/35 transition-colors">
          Ver el cuadro completo real vs predicho
        </button>
      </div>
    </div>
  )
}
