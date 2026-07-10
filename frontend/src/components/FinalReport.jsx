import { useBacktest } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { TrophyIcon } from './Icons.jsx'
import { useI18n } from '../i18n.jsx'

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
        <span className={`text-xl sm:text-2xl font-black ${highlight ? 'champ-gold' : 'text-white'}`}>{team ? teamLabel(team) : '—'}</span>
      </div>
      {extra && <div className="text-[11px] text-amber-300/80 font-semibold mt-1.5">{extra}</div>}
    </div>
  )
}

export default function FinalReport({ data, onGoBracket }) {
  const { t, tr } = useI18n()
  const { data: bt } = useBacktest()
  if (!data?.champion_real) return null

  const ROUND_LABELS = { r32: t('round.r32'), r16: t('round.r16'), qf: t('round.qf'), sf: t('round.sfLong'), final: t('round.final') }
  const hit = data.champion_hit
  const rs = data.rounds_summary || {}
  const totHits = Object.values(rs).reduce((n, s) => n + (s.hits || 0), 0)
  const totDet = Object.values(rs).reduce((n, s) => n + (s.determined || 0), 0)
  const totFav = Object.values(rs).reduce((n, s) => n + (s.fav_won || 0), 0)
  const totPlayed = Object.values(rs).reduce((n, s) => n + (s.played || 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-10">
      <div className="text-center mb-5">
        <TrophyIcon size={40} className="text-amber-400 mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-black text-white">{t('rep.over')}</h2>
        <p className="text-xs sm:text-sm text-white/50 mt-1">{t('rep.sub')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <ChampCard title={t('rep.champModel')} team={data.champion_pred}
          extra={data.champion_pred_prob != null ? t('rep.champModelProb', { p: data.champion_pred_prob }) : null} />
        <ChampCard title={t('rep.champReal')} team={data.champion_real} highlight />
      </div>

      <div className={`rounded-xl px-4 py-3 mb-6 text-center text-sm font-bold ${
        hit ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
        {hit ? t('rep.hit') : t('rep.miss')}
      </div>

      {bt && !bt.loading && (
        <>
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
            {t('rep.perf', { n: bt.test_matches })}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-2">
            <Tile label={t('acc.mAccuracy')} value={`${bt.accuracy_1x2}%`} good
              sub={t('acc.mAccuracySub', { h: bt.baseline_home, e: bt.baseline_elo })} />
            <Tile label={t('acc.mExact')} value={`${bt.exact_score}%`} sub={t('acc.mExactSub')} />
            <Tile label="Brier ↓" value={bt.brier} good sub={t('acc.mBrierSub', { b: bt.brier_baseline })} />
            <Tile label="Log-loss ↓" value={bt.logloss} good sub={t('acc.mBrierSub', { b: bt.logloss_baseline })} />
          </div>
          <p className="text-[11px] text-white/45 mb-6">{tr('rep.oos')}</p>
        </>
      )}

      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">{t('rep.byRound')}</h3>
      <div className="glass rounded-xl p-4 space-y-4 mb-2">
        <div>
          <div className="text-[11px] text-white/50 mb-2">
            {tr('rep.hitsLabel')}<strong className="text-emerald-300">{totHits}/{totDet}</strong>
          </div>
          <div className="space-y-1.5">
            {Object.entries(rs).map(([r, s]) => (
              <Bar key={r} label={ROUND_LABELS[r]} num={s.hits} den={s.determined} accent="bg-emerald-400/80" />
            ))}
          </div>
        </div>
        <div className="border-t border-white/[0.07] pt-4">
          <div className="text-[11px] text-white/50 mb-2">
            {tr('rep.favLabel')}<strong className="text-blue-300">{totFav}/{totPlayed}</strong>
          </div>
          <div className="space-y-1.5">
            {Object.entries(rs).map(([r, s]) => (
              <Bar key={r} label={ROUND_LABELS[r]} num={s.fav_won} den={s.played} accent="bg-blue-400/80" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-white/45 mb-6">{t('rep.chainNote')}</p>

      <div className="text-center">
        <button onClick={onGoBracket}
          className="px-5 py-2.5 rounded-xl bg-blue-600/25 border border-blue-500/40 text-blue-200 text-sm font-bold hover:bg-blue-600/35 transition-colors">
          {t('rep.goBracket')}
        </button>
      </div>
    </div>
  )
}
