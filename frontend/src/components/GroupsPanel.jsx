import { getFlagUrl, teamLabel } from '../data/teams.js'
import { QualDot } from './Icons.jsx'
import { useI18n } from '../i18n.jsx'

function shortDate(d) {
  // "2026-06-29" -> "29/6"
  if (!d || d.length < 10) return ''
  return `${d.slice(8, 10)}/${+d.slice(5, 7)}`
}

function FixtureRow({ fx, tp, tpend }) {
  return (
    <div className="flex items-center gap-1.5 py-[3px] text-[10px] leading-tight">
      <span className="text-white/25 tabular-nums w-7 flex-shrink-0">{shortDate(fx.date)}</span>
      <span className="flex-1 truncate text-white/65">
        {teamLabel(fx.home)} <span className="text-white/25">–</span> {teamLabel(fx.away)}
      </span>
      <span className="font-mono text-white/40 w-7 text-center flex-shrink-0" title={tp}>{fx.pred}</span>
      {fx.played ? (
        <span className="flex items-center justify-end gap-1 w-9 flex-shrink-0">
          <span className="font-mono font-bold text-white">{fx.real}</span>
          <span className={fx.correct ? 'text-emerald-400' : 'text-red-400/80'}>{fx.correct ? '✓' : '✗'}</span>
        </span>
      ) : (
        <span className="w-9 text-right text-white/25 tracking-[0.15em] flex-shrink-0" title={tpend}>···</span>
      )}
    </div>
  )
}

function GroupCard({ letter, rows, fixtures, t }) {
  return (
    <div className="glass glass-hover rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-lg text-white text-xs font-black flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#3f7bff,#9b40f0)' }}>{letter}</span>
        <span className="eyebrow">{t('groups.group', { l: letter })}</span>
      </div>

      {/* Clasificación */}
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-white/30 text-[9px] uppercase">
            <th className="text-left font-semibold pb-1.5">{t('groups.team')}</th>
            <th className="font-semibold pb-1.5 w-6">{t('groups.pj')}</th>
            <th className="font-semibold pb-1.5 w-6">{t('groups.gd')}</th>
            <th className="font-semibold pb-1.5 w-6 text-right">{t('groups.pts')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team} className={`${i < 2 ? '' : 'opacity-45'} ${i === 1 ? 'border-b border-white/[0.06]' : ''}`}>
              <td className="py-[3.5px]">
                <div className="flex items-center gap-1.5">
                  <QualDot status={r.status} />
                  {getFlagUrl(r.team)
                    ? <img src={getFlagUrl(r.team, 20)} alt="" width={17} height={12} className="rounded-[2px] object-cover" style={{ height: 12 }} />
                    : <div className="w-4 h-[12px] rounded-[2px] bg-white/10" />}
                  <span className="text-white/85 font-semibold truncate max-w-[110px]">{teamLabel(r.team)}</span>
                </div>
              </td>
              <td className="text-center text-white/40 tnum">{r.pj}</td>
              <td className={`text-center tnum ${r.gd > 0 ? 'text-emerald-400/80' : r.gd < 0 ? 'text-rose-400/70' : 'text-white/40'}`}>
                {r.gd > 0 ? '+' : ''}{r.gd}
              </td>
              <td className="text-right font-black text-white tnum">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Predicción de los 6 partidos */}
      {fixtures?.length > 0 && (
        <div className="mt-3 pt-2.5 hairline-t">
          <div className="eyebrow mb-1.5">{t('groups.matches')}</div>
          {fixtures.map((fx, i) => <FixtureRow key={i} fx={fx} tp={t('groups.prediction')} tpend={t('groups.pending')} />)}
        </div>
      )}
    </div>
  )
}

export default function GroupsPanel({ groups, fixtures }) {
  const { t, tr } = useI18n()
  if (!groups) return null
  const letters = Object.keys(groups).sort()
  const byGroup = {}
  for (const fx of fixtures || []) (byGroup[fx.group] ??= []).push(fx)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-[10px] text-white/40">
        <p className="text-xs text-white/50">{tr('groups.intro')}</p>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('legend.qualified')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> {t('legend.undecided')}</span>
        <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>/<span className="text-rose-400/80">✗</span> {t('groups.legendResult')} · <span className="tracking-[0.15em]">···</span> {t('groups.legendPending')}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        {letters.map(l => <GroupCard key={l} letter={l} rows={groups[l]} fixtures={byGroup[l]} t={t} />)}
      </div>
    </div>
  )
}
