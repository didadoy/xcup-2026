import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { TrophyIcon } from './Icons.jsx'
import { useI18n } from '../i18n.jsx'
import { SectionHead, StatTile, Meter, Team } from './ui.jsx'

// Barra doble por ronda: aciertos de cruce (verde) y favorito que pasó (azul).
function RoundRow({ label, hits, det, fav, played }) {
  const p1 = det > 0 ? (hits / det) * 100 : 0
  const p2 = played > 0 ? (fav / played) * 100 : 0
  return (
    <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[92px_1fr] gap-x-3 gap-y-1 items-center py-1.5">
      <span className="text-[11px] font-semibold text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-[7px] rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full grow-x" style={{ width: `${Math.max(det ? 2 : 0, p1)}%`, background: 'linear-gradient(90deg,#199e70,#34d17e)' }} />
        </div>
        <span className="w-9 text-right text-[11px] font-bold text-white/80 tnum flex-shrink-0">{det ? `${hits}/${det}` : '—'}</span>
      </div>
      <span />
      <div className="flex items-center gap-2">
        <div className="flex-1 h-[7px] rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full grow-x" style={{ width: `${Math.max(played ? 2 : 0, p2)}%`, background: 'linear-gradient(90deg,#3f7bff,#7aa8ff)' }} />
        </div>
        <span className="w-9 text-right text-[11px] font-bold text-white/60 tnum flex-shrink-0">{played ? `${fav}/${played}` : '—'}</span>
      </div>
    </div>
  )
}

export default function FinalReport({ data, onGoBracket }) {
  const { t, tr } = useI18n()
  const { data: bt } = useBacktest()
  if (!data?.champion_real) return null

  const RL = { r32: t('round.r32'), r16: t('round.r16'), qf: t('round.qf'), sf: t('round.sfLong'), final: t('round.final') }
  const hit = data.champion_hit
  const champ = data.champion_real
  const rs = data.rounds_summary || {}
  const totHits = Object.values(rs).reduce((n, s) => n + (s.hits || 0), 0)
  const totDet = Object.values(rs).reduce((n, s) => n + (s.determined || 0), 0)
  const totFav = Object.values(rs).reduce((n, s) => n + (s.fav_won || 0), 0)
  const totPlayed = Object.values(rs).reduce((n, s) => n + (s.played || 0), 0)
  const flag = getFlagUrl(champ, 160)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-12">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden mb-6 fade-up">
        {/* glow dorado de fondo */}
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(120% 90% at 50% -10%, rgba(238,182,58,0.14), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))' }} />
        <div className="absolute inset-0 -z-10 gold-halo" style={{ background: 'radial-gradient(60% 55% at 50% 30%, rgba(238,182,58,0.10), transparent 70%)' }} />
        <div className="border border-amber-300/15 rounded-3xl px-6 py-8 sm:py-10 text-center">
          <div className="eyebrow text-amber-300/70 mb-4">{t('rep.eyebrow')}</div>

          <div className="relative inline-block mb-4">
            <div className="absolute -inset-6 rounded-full blur-2xl gold-halo -z-10" style={{ background: 'radial-gradient(circle, rgba(238,182,58,0.45), transparent 70%)' }} />
            {flag && <img src={flag} alt="" className="w-[100px] h-[67px] sm:w-[128px] sm:h-[86px] rounded-lg object-cover mx-auto shadow-2xl ring-1 ring-white/15" />}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-gradient-to-b from-amber-200 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-[#0b0e18]">
              <TrophyIcon size={22} className="text-amber-900" />
            </div>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black champ-gold tracking-tight mt-4 leading-none">{teamLabel(champ)}</h2>
          <p className="text-sm sm:text-base text-white/55 mt-2 font-medium">{t('rep.worldChampion')}</p>

          {/* Veredicto de la predicción */}
          <div className={`inline-flex items-center gap-2.5 mt-6 pl-3 pr-4 py-2 rounded-full border text-sm font-bold ${
            hit ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200'
                : 'bg-rose-500/12 border-rose-400/30 text-rose-200'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] ${hit ? 'bg-emerald-400/25' : 'bg-rose-400/25'}`}>
              {hit ? '✓' : '✗'}
            </span>
            {hit
              ? tr('rep.calledIt', { p: data.champion_pred_prob })
              : tr('rep.missedIt', { t: teamLabel(data.champion_pred) })}
          </div>
        </div>
      </div>

      {/* ── Métricas del torneo ──────────────────────────────── */}
      {bt && !bt.loading && (
        <div className="fade-up" style={{ animationDelay: '.05s' }}>
          <SectionHead eyebrow={t('rep.perfEyebrow')} title={t('rep.perf', { n: bt.test_matches })} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2 stagger">
            <StatTile label={t('acc.mAccuracy')} value={`${bt.accuracy_1x2}%`} accent="good" sub={t('acc.mAccuracySub', { h: bt.baseline_home, e: bt.baseline_elo })} />
            <StatTile label={t('rep.champCalled')} value={hit ? '✓' : '✗'} accent={hit ? 'good' : 'default'} sub={t('rep.champCalledSub', { t: teamLabel(data.champion_pred) })} />
            <StatTile label="Brier ↓" value={bt.brier} accent="good" sub={t('acc.mBrierSub', { b: bt.brier_baseline })} />
            <StatTile label="Log-loss ↓" value={bt.logloss} accent="good" sub={t('acc.mBrierSub', { b: bt.logloss_baseline })} />
          </div>
          <p className="text-[11px] text-white/40 mb-7">{tr('rep.oos')}</p>
        </div>
      )}

      {/* ── El cuadro, ronda a ronda ─────────────────────────── */}
      <div className="fade-up" style={{ animationDelay: '.1s' }}>
        <SectionHead eyebrow={t('rep.bracketEyebrow')} title={t('rep.byRound')} />
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-4 mb-3 pl-[64px] sm:pl-[92px]">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-white/55">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#34d17e' }} /> {t('rep.hitsLegend')} · {totHits}/{totDet}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-white/55">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3f7bff' }} /> {t('rep.favLegend')} · {totFav}/{totPlayed}
            </span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {Object.entries(rs).map(([r, s]) => (
              <RoundRow key={r} label={RL[r]} hits={s.hits} det={s.determined} fav={s.fav_won} played={s.played} />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/40 mt-3">{t('rep.chainNote')}</p>
      </div>

      <div className="text-center mt-8 fade-up" style={{ animationDelay: '.15s' }}>
        <button onClick={onGoBracket}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.03] active:scale-100"
          style={{ background: 'linear-gradient(135deg, rgba(63,123,255,0.9), rgba(155,64,240,0.85))', boxShadow: '0 8px 24px rgba(63,123,255,0.25)' }}>
          {t('rep.goBracket')}
        </button>
      </div>
    </div>
  )
}
