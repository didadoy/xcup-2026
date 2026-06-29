import { useState } from 'react'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { TrophyIcon, QualDot } from './Icons.jsx'

const ROUNDS = [
  { key: 'r32', label: '16avos' },
  { key: 'r16', label: 'Octavos' },
  { key: 'qf', label: 'Cuartos' },
  { key: 'sf', label: 'Semis' },
  { key: 'final', label: 'Final' },
]

function Row({ slot, top }) {
  const team = slot?.team
  const flag = team ? getFlagUrl(team, 40) : null
  const isLoser = slot && slot.win === false
  const isWinner = slot && slot.win === true
  const real = slot?.real                              // hit | wrong | out | null
  return (
    <div className={`flex items-center gap-2 px-3 h-11 ${top ? '' : 'border-t border-white/[0.07]'} ${isLoser ? 'opacity-45' : ''}`}>
      <QualDot status={slot?.status} />
      {flag
        ? <img src={flag} alt="" width={26} height={17} className="rounded-[2px] object-cover flex-shrink-0" style={{ height: 17 }} />
        : <div className="w-[26px] h-[17px] rounded-[2px] bg-white/10 flex-shrink-0" />}
      <span className={`flex-1 text-sm leading-none truncate ${isLoser ? 'font-medium text-white/60' : 'font-bold text-white'}`}>
        {teamLabel(team)}
      </span>
      {isWinner && <span className="text-emerald-400 text-sm flex-shrink-0" aria-label="avanza">›</span>}
      {slot?.played && slot?.score != null ? (
        <span className={`text-[12px] font-bold tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded ${
          isWinner ? 'text-emerald-200 bg-emerald-500/20' : 'text-white/55 bg-white/10'}`}
          title="Resultado real">
          {slot.score}
        </span>
      ) : slot?.prob != null && team && (
        <span className={`text-[11px] tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded ${
          isWinner ? 'text-emerald-300 bg-emerald-500/10' : 'text-white/45 bg-white/5'}`}>
          {slot.prob}%
        </span>
      )}
      {real === 'hit' && (
        <span className="text-emerald-400 text-sm font-black flex-shrink-0 leading-none"
          title="Cruce acertado" aria-label="acierto">✓</span>
      )}
      {(real === 'wrong' || real === 'out') && (
        <span className="text-rose-500 text-sm font-black flex-shrink-0 leading-none"
          title="Cruce no acertado" aria-label="fallo">✗</span>
      )}
    </div>
  )
}

function pairs(slots) {
  const out = []
  for (let i = 0; i < slots.length; i += 2) out.push({ a: slots[i], b: slots[i + 1] })
  return out
}

export default function BracketMobile({ bracket, champion, selectedKey, onSelect }) {
  const [round, setRound] = useState('r32')
  const slots = bracket?.[round] ?? []
  const matches = pairs(slots)
  const champProb = bracket?.final?.find?.(s => s.win)?.prob

  return (
    <div className="px-3 pb-8">
      {/* Campeón */}
      <div className="flex items-center gap-3 glass rounded-xl px-4 py-3 mb-3">
        <TrophyIcon size={26} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-white/40">Campeón más probable</div>
          <div className="flex items-center gap-1.5">
            {champion && getFlagUrl(champion) &&
              <img src={getFlagUrl(champion, 40)} alt="" width={22} height={15} className="rounded-[2px]" style={{ height: 15 }} />}
            <span className="text-base font-black text-white truncate">{champion ? teamLabel(champion) : '—'}</span>
          </div>
        </div>
        {champProb != null && <span className="text-sm font-black text-amber-400">{champProb}%</span>}
      </div>

      {/* Selector de ronda */}
      <div role="tablist" aria-label="Ronda" className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 sticky top-0 z-10">
        {ROUNDS.map(r => {
          const active = round === r.key
          return (
            <button key={r.key} role="tab" aria-selected={active} onClick={() => setRound(r.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40' : 'glass text-white/55'}`}>
              {r.label}
            </button>
          )
        })}
      </div>

      {/* Partidos de la ronda */}
      <div className="space-y-2 mt-3">
        {matches.map((m, i) => {
          const key = `M-${round}-${i}`
          const played = m.a?.played || m.b?.played
          return (
            <button key={key}
              onClick={() => onSelect(m.a?.team, m.b?.team, key)}
              aria-label={`Predicción ${teamLabel(m.a?.team)} contra ${teamLabel(m.b?.team)}`}
              className={`w-full rounded-xl border overflow-hidden text-left transition-colors ${
                selectedKey === key
                  ? 'border-blue-500 bg-blue-950/40'
                  : played
                    ? 'border-emerald-500/70 bg-emerald-500/[0.07]'
                    : 'border-white/12 bg-white/[0.04] active:bg-white/[0.07]'}`}>
              <Row slot={m.a} top />
              <Row slot={m.b} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
