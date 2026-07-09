import { useMatchPrediction } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { BallIcon, CloseIcon } from './Icons.jsx'
import { useI18n, localeOf } from '../i18n.jsx'

function TeamHead({ team, side }) {
  const flag = team ? getFlagUrl(team, 40) : null
  return (
    <div className={`flex items-center gap-2 ${side === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {flag
        ? <img src={flag} alt={team} width={30} height={20} className="rounded-[3px] object-cover" style={{ height: 20 }} />
        : <div className="w-[30px] h-[20px] rounded-[3px] bg-white/10" />}
      <span className="text-sm font-bold text-white leading-tight">{teamLabel(team)}</span>
    </div>
  )
}

function ProbBar({ label, value, color, flag }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 flex items-center gap-1.5 flex-shrink-0">
        {flag && <img src={flag} alt="" width={16} height={11} className="rounded-[2px]" style={{ height: 11 }} />}
        <span className="text-[11px] text-white/55 truncate">{label}</span>
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-white/80 w-9 text-right tabular-nums">{pct}%</span>
    </div>
  )
}

export default function PredictionPanel({ teamA, teamB, label, onClose }) {
  const { t, tr, lang } = useI18n()
  const { prediction, loading } = useMatchPrediction(teamA, teamB)

  if (!teamA || !teamB) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/30 gap-3 p-6">
        <BallIcon size={44} className="text-white/20" />
        <p className="text-sm text-center leading-relaxed">{t('pred.empty')}</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">{t(label || 'pred.title')}</h2>
        {onClose && (
          <button onClick={onClose} aria-label={t('pred.close')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors">
            <CloseIcon size={15} />
          </button>
        )}
      </div>

      <div className="glass rounded-xl p-3 flex items-center justify-between gap-2">
        <TeamHead team={teamA} />
        <span className="text-white/20 text-[10px] font-bold flex-shrink-0">VS</span>
        <TeamHead team={teamB} side="right" />
      </div>

      {loading && <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl shimmer" />)}</div>}

      {prediction?.result && !loading && (() => {
        const { probabilities: P, result: R, elo, confidence, favourite } = prediction
        return (
          <>
            {/* Goles esperados — el dato que de verdad varía */}
            <div className="glass rounded-xl p-4 border border-blue-500/15">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">{t('pred.xg')}</p>
              <div className="flex items-end justify-center gap-3">
                <span className="text-4xl font-black text-white tabular-nums">{R.expected_goals_home}</span>
                <span className="text-white/25 text-xl mb-1">–</span>
                <span className="text-4xl font-black text-white tabular-nums">{R.expected_goals_away}</span>
              </div>
              <p className="text-center text-[11px] text-white/35 mt-1.5">
                {R.predicted_outcome === 'draw' ? t('pred.noFav') : tr('pred.favLine', { t: teamLabel(favourite), c: confidence })}
              </p>
            </div>

            {/* 1X2 */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">{t('pred.result')}</p>
              <ProbBar label={teamLabel(teamA)} value={P.home_win} color="#3b82f6" flag={getFlagUrl(teamA, 20)} />
              <ProbBar label={t('pred.draw')} value={P.draw} color="rgba(255,255,255,0.35)" />
              <ProbBar label={teamLabel(teamB)} value={P.away_win} color="#7c3aed" flag={getFlagUrl(teamB, 20)} />
            </div>

            {/* Marcadores más probables */}
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">
                {t('pred.scores')}
                <span className="text-white/20 normal-case tracking-normal ml-1">{t('pred.scoresNote')}</span>
              </p>
              <div className="space-y-1.5">
                {R.top_scores.slice(0, 6).map((s, i) => (
                  <div key={s.score} className="flex items-center gap-2">
                    <span className="text-[12px] font-mono text-white/60 w-9 text-center tabular-nums">{s.score}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.probability / R.top_scores[0].probability * 100}%`,
                          background: `hsl(${220 - i * 12} 80% ${62 - i * 3}%)` }} />
                    </div>
                    <span className="text-[10px] text-white/40 w-9 text-right tabular-nums">{s.probability}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modelo */}
            <div className="glass rounded-xl p-3 text-[11px] space-y-1.5">
              <div className="flex justify-between"><span className="text-white/40">Elo {teamLabel(teamA)}</span><span className="text-white/70 font-semibold tabular-nums">{elo.home}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Elo {teamLabel(teamB)}</span><span className="text-white/70 font-semibold tabular-nums">{elo.away}</span></div>
            </div>

            <p className="text-[10px] text-white/20 text-center leading-relaxed">
              {t('pred.trained', { n: prediction.model?.n_matches?.toLocaleString(localeOf(lang)), d: prediction.model?.trained_through })}
            </p>
          </>
        )
      })()}
    </div>
  )
}
