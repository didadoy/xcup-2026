import { getFlagUrl, teamLabel } from '../data/teams.js'

function GroupCard({ letter, rows }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-300 text-xs font-black flex items-center justify-center">{letter}</span>
        <span className="text-[11px] text-white/40 uppercase tracking-wider">Grupo {letter}</span>
      </div>
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
            <tr key={r.team} className={`${i < 2 ? '' : i === 2 ? 'opacity-70' : 'opacity-40'}`}>
              <td className="py-[3px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1 h-4 rounded-full ${i < 2 ? 'bg-emerald-400' : i === 2 ? 'bg-amber-400/60' : 'bg-transparent'}`} />
                  {getFlagUrl(r.team)
                    ? <img src={getFlagUrl(r.team, 20)} alt="" width={16} height={11} className="rounded-[2px] object-cover" style={{ height: 11 }} />
                    : <div className="w-4 h-[11px] rounded-[2px] bg-white/10" />}
                  <span className="text-white/80 font-medium truncate max-w-[92px]">{teamLabel(r.team)}</span>
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
    </div>
  )
}

export default function GroupsPanel({ groups }) {
  if (!groups) return null
  const letters = Object.keys(groups).sort()
  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <p className="text-xs text-white/40">
          Clasificación <strong className="text-white/70">real</strong> con los resultados jugados.
        </p>
        <span className="flex items-center gap-1 text-[10px] text-white/35"><span className="w-2 h-2 rounded-full bg-emerald-400" /> clasifica (1º-2º)</span>
        <span className="flex items-center gap-1 text-[10px] text-white/35"><span className="w-2 h-2 rounded-full bg-amber-400/60" /> 3º (depende)</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {letters.map(l => <GroupCard key={l} letter={l} rows={groups[l]} />)}
      </div>
    </div>
  )
}
