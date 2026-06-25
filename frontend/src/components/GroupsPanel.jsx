import { getFlagUrl, teamLabel } from '../data/teams.js'
import { QualDot } from './Icons.jsx'

function shortDate(d) {
  // "2026-06-29" -> "29/6"
  if (!d || d.length < 10) return ''
  return `${d.slice(8, 10)}/${+d.slice(5, 7)}`
}

function FixtureRow({ fx }) {
  return (
    <div className="flex items-center gap-1.5 py-[3px] text-[10px] leading-tight">
      <span className="text-white/25 tabular-nums w-7 flex-shrink-0">{shortDate(fx.date)}</span>
      <span className="flex-1 truncate text-white/65">
        {teamLabel(fx.home)} <span className="text-white/25">–</span> {teamLabel(fx.away)}
      </span>
      <span className="font-mono text-white/40 w-7 text-center flex-shrink-0" title="Predicción">{fx.pred}</span>
      {fx.played ? (
        <span className="flex items-center justify-end gap-1 w-9 flex-shrink-0">
          <span className="font-mono font-bold text-white">{fx.real}</span>
          <span className={fx.correct ? 'text-emerald-400' : 'text-red-400/80'}>{fx.correct ? '✓' : '✗'}</span>
        </span>
      ) : (
        <span className="w-9 text-right text-white/25 tracking-[0.15em] flex-shrink-0" title="Pendiente">···</span>
      )}
    </div>
  )
}

function GroupCard({ letter, rows, fixtures }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-300 text-xs font-black flex items-center justify-center">{letter}</span>
        <span className="text-[11px] text-white/40 uppercase tracking-wider">Grupo {letter}</span>
      </div>

      {/* Clasificación */}
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-white/30 text-[9px] uppercase">
            <th className="text-left font-medium pb-1">Selección</th>
            <th className="font-medium pb-1 w-6">PJ</th>
            <th className="font-medium pb-1 w-6">DG</th>
            <th className="font-medium pb-1 w-6 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team} className={`${i < 2 ? '' : 'opacity-55'}`}>
              <td className="py-[3px]">
                <div className="flex items-center gap-1.5">
                  <QualDot status={r.status} />
                  {getFlagUrl(r.team)
                    ? <img src={getFlagUrl(r.team, 20)} alt="" width={16} height={11} className="rounded-[2px] object-cover" style={{ height: 11 }} />
                    : <div className="w-4 h-[11px] rounded-[2px] bg-white/10" />}
                  <span className="text-white/80 font-medium truncate max-w-[110px]">{teamLabel(r.team)}</span>
                </div>
              </td>
              <td className="text-center text-white/45 tabular-nums">{r.pj}</td>
              <td className={`text-center tabular-nums ${r.gd > 0 ? 'text-emerald-400/70' : r.gd < 0 ? 'text-red-400/60' : 'text-white/45'}`}>
                {r.gd > 0 ? '+' : ''}{r.gd}
              </td>
              <td className="text-right font-black text-white tabular-nums">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Predicción de los 6 partidos */}
      {fixtures?.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
          <div className="text-[8px] uppercase tracking-wider text-white/30 mb-1">Partidos · predicción vs real</div>
          {fixtures.map((fx, i) => <FixtureRow key={i} fx={fx} />)}
        </div>
      )}
    </div>
  )
}

export default function GroupsPanel({ groups, fixtures }) {
  if (!groups) return null
  const letters = Object.keys(groups).sort()
  const byGroup = {}
  for (const fx of fixtures || []) (byGroup[fx.group] ??= []).push(fx)

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-[10px] text-white/40">
        <p className="text-xs text-white/45">Clasificación <strong className="text-white/70">real</strong> + predicción de cada partido.</p>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> clasificado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> depende</span>
        <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>/<span className="text-red-400/80">✗</span> acierto del resultado (1·X·2) · <span className="tracking-[0.15em]">···</span> por jugar</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {letters.map(l => <GroupCard key={l} letter={l} rows={groups[l]} fixtures={byGroup[l]} />)}
      </div>
    </div>
  )
}
