import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'

function Metric({ label, value, sub, good }) {
  return (
    <div className="glass rounded-xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl sm:text-3xl font-black mt-1 ${good ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AccuracyPanel() {
  const { data, loading, error } = useBacktest()

  if (loading) return <div className="p-6 text-white/30 text-sm">Calculando backtest…</div>
  if (error || !data || data.loading) return <div className="p-6 text-amber-300 text-sm">No disponible aún. Inténtalo en unos segundos.</div>

  const d = data
  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto">
      <div className="rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2.5 text-[11px] sm:text-xs text-blue-200/90 mb-4">
        <strong>Validación honesta (out-of-sample).</strong> Se reentrenó el modelo con {d.train_matches?.toLocaleString('es')} partidos
        {' '}<strong>excluyendo el Mundial 2026</strong> (sin fuga de datos) y se predijeron los {d.test_matches} partidos
        del Mundial 2026 ya jugados (grupos y eliminatorias). Se actualiza solo según se juegan. Así se mide cómo lo haría con partidos que nunca vio.
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3">
        <Metric label="Acierto resultado (1X2)" value={`${d.accuracy_1x2}%`} good
          sub={`local ${d.baseline_home}% · mejor Elo ${d.baseline_elo}%`} />
        <Metric label="Marcador exacto" value={`${d.exact_score}%`}
          sub="clavar el resultado es casi azar" />
        <Metric label="Brier score ↓" value={d.brier} good
          sub={`sin info: ${d.brier_baseline}`} />
        <Metric label="Log-loss ↓" value={d.logloss} good
          sub={`sin info: ${d.logloss_baseline}`} />
      </div>
      <p className="text-[11px] text-white/45 mb-5">
        El valor del modelo está en <strong className="text-white/70">acertar el resultado y calibrar bien las probabilidades</strong>
        {' '}(Brier y log-loss baten claramente al azar): cuando dice 60%, acierta ~60% de las veces. Clavar el marcador exacto
        es casi imposible en fútbol (lo muestra el {d.exact_score}%); el marcador que ves es simplemente el <strong className="text-white/70">más probable</strong>.
        Error medio de goles: {d.goal_mae} por equipo.
      </p>

      {/* Tabla predicho vs real */}
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Predicho vs real · {d.test_matches} partidos</h3>
      <div className="glass rounded-xl overflow-hidden">
        {/* cabecera (oculta detalles en móvil) */}
        <div className="flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-wider text-white/35 border-b border-white/5">
          <span className="flex-1">Partido</span>
          <span className="w-12 text-center">Pred</span>
          <span className="w-12 text-center">Real</span>
          <span className="hidden sm:block w-28 text-center">Prob 1/X/2</span>
          <span className="w-6 text-center">✓</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[55vh] overflow-y-auto">
          {d.table.map((t, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] sm:text-xs ${t.correct ? '' : 'bg-red-500/[0.04]'}`}>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {getFlagUrl(t.home) && <img src={getFlagUrl(t.home, 20)} alt="" width={15} height={10} className="rounded-[1px] flex-shrink-0" style={{ height: 10 }} />}
                <span className="text-white/75 truncate max-w-[70px] sm:max-w-none">{teamLabel(t.home)}</span>
                <span className="text-white/25">–</span>
                <span className="text-white/75 truncate max-w-[70px] sm:max-w-none">{teamLabel(t.away)}</span>
                {getFlagUrl(t.away) && <img src={getFlagUrl(t.away, 20)} alt="" width={15} height={10} className="rounded-[1px] flex-shrink-0" style={{ height: 10 }} />}
              </div>
              <span className="w-12 text-center font-mono text-white/55 tabular-nums">{t.pred}</span>
              <span className="w-12 text-center font-mono font-bold text-white tabular-nums">{t.real}</span>
              <span className="hidden sm:block w-28 text-center text-white/40 tabular-nums">{t.p_home}/{t.p_draw}/{t.p_away}</span>
              <span className={`w-6 text-center font-bold ${t.correct ? 'text-emerald-400' : 'text-red-400/70'}`}>
                {t.correct ? '✓' : '·'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
