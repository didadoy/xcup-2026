import { useState, useRef } from 'react'
import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { useI18n } from '../i18n.jsx'

// Diagrama de fiabilidad: probabilidad predicha (x) vs frecuencia real (y).
// La diagonal = calibración perfecta ("cuando digo 60%, pasa el 60%").
function CalibrationChart({ bins }) {
  const { t, tr } = useI18n()
  const hostRef = useRef(null)
  const [tip, setTip] = useState(null)
  if (!bins?.length) return null
  const W = 320, H = 320, M = 34
  const X = p => M + (p / 100) * (W - 2 * M)
  const Y = p => (H - M) - (p / 100) * (H - 2 * M)
  const maxN = Math.max(...bins.map(b => b.n))
  const grid = [0, 25, 50, 75, 100]

  return (
    <div ref={hostRef} className="relative" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px]" role="img"
        aria-label="Diagrama de fiabilidad: probabilidad predicha frente a frecuencia observada">
        {grid.map(g => (
          <g key={g}>
            <line x1={X(g)} x2={X(g)} y1={Y(0)} y2={Y(100)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1={X(0)} x2={X(100)} y1={Y(g)} y2={Y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={X(g)} y={H - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.40)">{g}</text>
            <text x={X(0) - 7} y={Y(g) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.40)">{g}</text>
          </g>
        ))}
        {/* diagonal ideal */}
        <line x1={X(0)} y1={Y(0)} x2={X(100)} y2={Y(100)}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 4" />
        {/* línea del modelo */}
        <path fill="none" stroke="#3987e5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          d={bins.map((b, i) => `${i ? 'L' : 'M'}${X(b.pred).toFixed(1)},${Y(b.obs).toFixed(1)}`).join(' ')} />
        {bins.map((b, i) => (
          <circle key={i} cx={X(b.pred)} cy={Y(b.obs)} r={4 + (b.n / maxN) * 5}
            fill="#3987e5" stroke="#0a0e1a" strokeWidth="2"
            onMouseMove={e => {
              const r = hostRef.current.getBoundingClientRect()
              setTip({ x: e.clientX - r.left, y: e.clientY - r.top, b })
            }} />
        ))}
        <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.5)">{t('acc.calX')}</text>
        <text x={11} y={H / 2} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.5)"
          transform={`rotate(-90 11 ${H / 2})`}>{t('acc.calY')}</text>
      </svg>
      {tip && (
        <div className="absolute z-30 pointer-events-none rounded-lg border border-white/15 bg-[#0d1322]/95 px-2.5 py-1.5 text-[11px] shadow-xl"
          style={{ left: Math.min(tip.x + 12, 200), top: tip.y + 12, backdropFilter: 'blur(8px)' }}>
          <div className="text-white/85">{tr('acc.calTipPred', { p: tip.b.pred })}</div>
          <div className="text-white/60">{tr('acc.calTipObs', { o: tip.b.obs, n: tip.b.n })}</div>
        </div>
      )}
    </div>
  )
}

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
  const { t, tr, lang } = useI18n()
  const { data, loading, error } = useBacktest()

  if (loading) return <div className="p-6 text-white/30 text-sm">{t('acc.computing')}</div>
  if (error || !data || data.loading) return <div className="p-6 text-amber-300 text-sm">{t('acc.unavailable')}</div>

  const d = data
  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto">
      <div className="rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2.5 text-[11px] sm:text-xs text-blue-200/90 mb-4">
        {tr('acc.honest', { train: d.train_matches?.toLocaleString(lang==='en'?'en-GB':'es'), n: d.test_matches })}
      </div>

      {/* Validación multi-Mundial */}
      {d.worldcups?.length > 0 && (() => {
        const rows = d.worldcups.filter(w => w.year !== 'global')
        const glob = d.worldcups.find(w => w.year === 'global')
        const maxN = Math.max(...rows.map(w => w.matches))
        return (
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-3">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">{t('acc.generalise')}</h3>
              {glob && <span className="text-[11px] text-white/45">{t('acc.globalLine', { a: glob.accuracy_1x2, n: glob.matches })}</span>}
            </div>
            <div className="space-y-2.5">
              {rows.map(w => (
                <div key={w.year} className="flex items-center gap-3">
                  <span className="w-10 text-[12px] font-bold text-white/80 flex-shrink-0 tabular-nums">{w.year}</span>
                  <div className="flex-1 min-w-0">
                    <div className="h-[18px] rounded-r-[4px] flex items-center justify-end pr-1.5"
                      style={{ width: `${Math.max(18, (w.accuracy_1x2 / 65) * 100)}%`, background: '#3987e5' }}>
                      <span className="text-[10px] font-black text-white/90">{w.accuracy_1x2}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40 flex-shrink-0 w-24 text-right">
                    {t('acc.baselineElo', { b: w.baseline_elo, n: w.matches })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-3">{tr('acc.multiNote')}</p>
          </div>
        )
      })()}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3">
        <Metric label={t('acc.mAccuracy')} value={`${d.accuracy_1x2}%`} good
          sub={t('acc.mAccuracySub', { h: d.baseline_home, e: d.baseline_elo })} />
        <Metric label={t('acc.mExact')} value={`${d.exact_score}%`} sub={t('acc.mExactSub')} />
        <Metric label="Brier score ↓" value={d.brier} good sub={t('acc.mBrierSub', { b: d.brier_baseline })} />
        <Metric label="Log-loss ↓" value={d.logloss} good sub={t('acc.mBrierSub', { b: d.logloss_baseline })} />
      </div>
      <p className="text-[11px] text-white/45 mb-5">
        {tr('acc.value', { x: d.exact_score, mae: d.goal_mae })}
      </p>

      {/* Calibración */}
      {d.calibration?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">{t('acc.calTitle')}</h3>
          <div className="glass rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <CalibrationChart bins={d.calibration} />
            <p className="text-[11px] text-white/55 leading-relaxed flex-1">{tr('acc.calDesc')}</p>
          </div>
        </div>
      )}

      {/* Tabla predicho vs real */}
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">{t('acc.tableTitle', { n: d.test_matches })}</h3>
      <div className="glass rounded-xl overflow-hidden">
        {/* cabecera (oculta detalles en móvil) */}
        <div className="flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-wider text-white/35 border-b border-white/5">
          <span className="flex-1">{t('acc.colMatch')}</span>
          <span className="w-12 text-center">{t('acc.colPred')}</span>
          <span className="w-12 text-center">{t('acc.colReal')}</span>
          <span className="hidden sm:block w-28 text-center">{t('acc.colProb')}</span>
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
