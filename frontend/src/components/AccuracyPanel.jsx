import { useState, useRef } from 'react'
import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { useI18n } from '../i18n.jsx'
import { SectionHead, StatTile } from './ui.jsx'

// ── Diagrama de fiabilidad (calibración) ─────────────────────────────
function CalibrationChart({ bins, t, tr }) {
  const hostRef = useRef(null)
  const [tip, setTip] = useState(null)
  if (!bins?.length) return null
  const W = 300, H = 300, M = 32
  const X = p => M + (p / 100) * (W - 2 * M)
  const Y = p => (H - M) - (p / 100) * (H - 2 * M)
  const maxN = Math.max(...bins.map(b => b.n))
  const grid = [0, 25, 50, 75, 100]
  const area = `M${X(0)},${Y(0)} ` + bins.map(b => `L${X(b.pred)},${Y(b.obs)}`).join(' ') + ` L${X(bins[bins.length - 1].pred)},${Y(0)} Z`

  return (
    <div ref={hostRef} className="relative" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px]" role="img"
        aria-label={t('acc.calTitle')}>
        <defs>
          <linearGradient id="cal-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(63,123,255,0.22)" />
            <stop offset="1" stopColor="rgba(63,123,255,0)" />
          </linearGradient>
        </defs>
        {grid.map(g => (
          <g key={g}>
            <line x1={X(g)} x2={X(g)} y1={Y(0)} y2={Y(100)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={X(0)} x2={X(100)} y1={Y(g)} y2={Y(g)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={X(g)} y={H - 11} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.38)">{g}</text>
            <text x={X(0) - 7} y={Y(g) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.38)">{g}</text>
          </g>
        ))}
        <line x1={X(0)} y1={Y(0)} x2={X(100)} y2={Y(100)} stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={area} fill="url(#cal-area)" />
        <path fill="none" stroke="#4d92f2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          d={bins.map((b, i) => `${i ? 'L' : 'M'}${X(b.pred).toFixed(1)},${Y(b.obs).toFixed(1)}`).join(' ')} />
        {bins.map((b, i) => (
          <circle key={i} cx={X(b.pred)} cy={Y(b.obs)} r={3.5 + (b.n / maxN) * 5}
            fill="#4d92f2" stroke="#0a0e1a" strokeWidth="2"
            onMouseMove={e => { const r = hostRef.current.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top, b }) }} />
        ))}
        <text x={W / 2} y={H - 0.5} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.45)">{t('acc.calX')}</text>
        <text x={10} y={H / 2} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.45)" transform={`rotate(-90 10 ${H / 2})`}>{t('acc.calY')}</text>
      </svg>
      {tip && (
        <div className="absolute z-30 pointer-events-none rounded-lg border border-white/15 bg-[#0d1322]/95 px-2.5 py-1.5 text-[11px] shadow-xl"
          style={{ left: Math.min(tip.x + 12, 190), top: tip.y + 12, backdropFilter: 'blur(8px)' }}>
          <div className="text-white/85">{tr('acc.calTipPred', { p: tip.b.pred })}</div>
          <div className="text-white/60">{tr('acc.calTipObs', { o: tip.b.obs, n: tip.b.n })}</div>
        </div>
      )}
    </div>
  )
}

// ── Barras por Mundial, con la baseline Elo como marcador ────────────
function WorldCupBars({ rows, t }) {
  const SCALE = 70
  return (
    <div className="space-y-3">
      {rows.map(w => {
        const acc = (w.accuracy_1x2 / SCALE) * 100
        const elo = (w.baseline_elo / SCALE) * 100
        return (
          <div key={w.year} className="flex items-center gap-3">
            <span className="w-10 text-[13px] font-black text-white/85 flex-shrink-0 tnum">{w.year}</span>
            <div className="flex-1 min-w-0 relative h-6">
              <div className="absolute inset-0 rounded-lg bg-white/[0.04]" />
              <div className="absolute inset-y-0 left-0 rounded-lg grow-x flex items-center justify-end pr-2"
                style={{ width: `${acc}%`, background: 'linear-gradient(90deg,#2f6bff,#6ea0ff)' }}>
                <span className="text-[10px] font-black text-white">{w.accuracy_1x2}%</span>
              </div>
              {/* marcador de la baseline Elo */}
              <div className="absolute inset-y-0 w-[2px] bg-amber-300/80" style={{ left: `${elo}%` }}
                title={`Elo ${w.baseline_elo}%`}>
                <span className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-300" />
              </div>
            </div>
            <span className="w-14 text-right text-[10px] text-white/40 flex-shrink-0 tnum">{w.matches} {t('acc.matchesShort')}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AccuracyPanel() {
  const { t, tr, lang } = useI18n()
  const { data, loading, error } = useBacktest()
  if (loading) return <div className="p-8 text-white/30 text-sm text-center">{t('acc.computing')}</div>
  if (error || !data || data.loading) return <div className="p-8 text-amber-300 text-sm text-center">{t('acc.unavailable')}</div>

  const d = data
  const wcRows = (d.worldcups || []).filter(w => w.year !== 'global')
  const glob = (d.worldcups || []).find(w => w.year === 'global')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-12">
      <div className="rounded-2xl px-4 py-3 text-[11.5px] sm:text-xs text-blue-100/90 mb-6 fade-up"
        style={{ background: 'linear-gradient(180deg, rgba(63,123,255,0.10), rgba(63,123,255,0.04))', border: '1px solid rgba(63,123,255,0.22)' }}>
        {tr('acc.honest', { train: d.train_matches?.toLocaleString(lang === 'en' ? 'en-GB' : 'es'), n: d.test_matches })}
      </div>

      {/* Métricas destacadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2 stagger fade-up">
        <StatTile label={t('acc.mAccuracy')} value={`${d.accuracy_1x2}%`} accent="good" sub={t('acc.mAccuracySub', { h: d.baseline_home, e: d.baseline_elo })} />
        <StatTile label={t('acc.mExact')} value={`${d.exact_score}%`} sub={t('acc.mExactSub')} />
        <StatTile label="Brier ↓" value={d.brier} accent="good" sub={t('acc.mBrierSub', { b: d.brier_baseline })} />
        <StatTile label="Log-loss ↓" value={d.logloss} accent="good" sub={t('acc.mBrierSub', { b: d.logloss_baseline })} />
      </div>
      <p className="text-[11px] text-white/45 mb-8 leading-relaxed">{tr('acc.value', { x: d.exact_score, mae: d.goal_mae })}</p>

      {/* Calibración + Multi-Mundial, lado a lado */}
      <div className="grid lg:grid-cols-2 gap-3 mb-8">
        {d.calibration?.length > 0 && (
          <div className="glass rounded-2xl p-4 sm:p-5 fade-up">
            <SectionHead eyebrow={t('acc.calEyebrow')} title={t('acc.calTitle')} />
            <div className="flex flex-col items-center">
              <CalibrationChart bins={d.calibration} t={t} tr={tr} />
              <p className="text-[11px] text-white/50 leading-relaxed mt-2">{tr('acc.calDesc')}</p>
            </div>
          </div>
        )}

        {wcRows.length > 0 && (
          <div className="glass rounded-2xl p-4 sm:p-5 fade-up" style={{ animationDelay: '.05s' }}>
            <SectionHead eyebrow={t('acc.multiEyebrow')} title={t('acc.generalise')}
              right={glob && <span>{t('acc.globalLine', { a: glob.accuracy_1x2, n: glob.matches })}</span>} />
            <WorldCupBars rows={wcRows} t={t} />
            <div className="flex items-center gap-4 mt-3 pt-3 hairline-t text-[10px] text-white/45">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: '#2f6bff' }} /> {t('acc.modelLegend')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-[2px] h-3 bg-amber-300" /> {t('acc.eloLegend')}</span>
            </div>
            <p className="text-[10.5px] text-white/40 mt-3 leading-relaxed">{tr('acc.multiNote')}</p>
          </div>
        )}
      </div>

      {/* Tabla predicho vs real */}
      <SectionHead eyebrow={t('acc.tableEyebrow')} title={t('acc.tableTitle', { n: d.test_matches })} />
      <div className="glass rounded-2xl overflow-hidden fade-up">
        <div className="flex items-center gap-2 px-3.5 py-2.5 eyebrow hairline-b">
          <span className="flex-1">{t('acc.colMatch')}</span>
          <span className="w-12 text-center">{t('acc.colPred')}</span>
          <span className="w-12 text-center">{t('acc.colReal')}</span>
          <span className="hidden sm:block w-28 text-center">{t('acc.colProb')}</span>
          <span className="w-6 text-center">✓</span>
        </div>
        <div className="divide-y divide-white/[0.04] max-h-[52vh] overflow-y-auto">
          {d.table.map((row, i) => (
            <div key={i} className={`flex items-center gap-2 px-3.5 py-2 text-[11px] sm:text-xs ${row.correct ? '' : 'bg-rose-500/[0.045]'}`}>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {getFlagUrl(row.home) && <img src={getFlagUrl(row.home, 20)} alt="" width={15} height={10} className="rounded-[1px] flex-shrink-0" style={{ height: 10 }} />}
                <span className="text-white/75 truncate max-w-[64px] sm:max-w-none">{teamLabel(row.home)}</span>
                <span className="text-white/25">–</span>
                <span className="text-white/75 truncate max-w-[64px] sm:max-w-none">{teamLabel(row.away)}</span>
                {getFlagUrl(row.away) && <img src={getFlagUrl(row.away, 20)} alt="" width={15} height={10} className="rounded-[1px] flex-shrink-0" style={{ height: 10 }} />}
              </div>
              <span className="w-12 text-center font-mono text-white/50 tnum">{row.pred}</span>
              <span className="w-12 text-center font-mono font-bold text-white tnum">{row.real}</span>
              <span className="hidden sm:block w-28 text-center text-white/40 tnum">{row.p_home}/{row.p_draw}/{row.p_away}</span>
              <span className={`w-6 text-center font-black ${row.correct ? 'text-emerald-400' : 'text-rose-400/70'}`}>{row.correct ? '✓' : '·'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
