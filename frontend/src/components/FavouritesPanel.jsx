import { useState, useRef } from 'react'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { useI18n } from '../i18n.jsx'
import { SectionHead } from './ui.jsx'

const STAGES = ['r16', 'qf', 'sf', 'final', 'champion']

// Sparkline "camino al título": 5 barras (R16→Campeón) con la prob de cada
// ronda. La última (campeón) va en dorado.
function ReachLadder({ row, labels, onHover, onLeave }) {
  return (
    <div className="flex items-end gap-[3px] h-8" onMouseLeave={onLeave}>
      {STAGES.map((s, i) => {
        const v = row[s] ?? 0
        const isChamp = s === 'champion'
        return (
          <div key={s} className="relative w-2.5 h-full flex items-end"
            onMouseMove={e => onHover(e, `${labels[i]} · ${v}%`)}>
            <div className="w-full rounded-t-[2px] transition-all"
              style={{
                height: `${Math.max(6, v)}%`,
                background: isChamp ? 'linear-gradient(180deg,#ffe9a8,#eeb63a)' : 'rgba(122,168,255,0.55)',
              }} />
          </div>
        )
      })}
    </div>
  )
}

function Rank({ i }) {
  const styles = [
    'bg-gradient-to-b from-amber-200 to-amber-500 text-amber-900',
    'bg-gradient-to-b from-slate-100 to-slate-400 text-slate-800',
    'bg-gradient-to-b from-orange-300 to-orange-600 text-orange-950',
  ]
  const s = styles[i] || 'bg-white/[0.06] text-white/45'
  return (
    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black tnum flex-shrink-0 shadow-sm ${s}`}>
      {i + 1}
    </span>
  )
}

export default function FavouritesPanel({ favourites, simulations }) {
  const { t, tr, lang } = useI18n()
  const [tip, setTip] = useState(null)
  const hostRef = useRef(null)
  if (!favourites) return null

  const max = favourites[0]?.champion || 1
  const shown = favourites.filter(f => f.champion > 0.05).slice(0, 20)
  const labels = [t('round.r16'), t('round.qf'), t('round.sf'), t('round.final'), t('fav.champion')]

  const onHover = (e, text) => {
    const r = hostRef.current.getBoundingClientRect()
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text })
  }

  return (
    <div ref={hostRef} className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-10">
      <SectionHead
        eyebrow={t('fav.eyebrow')}
        title={t('fav.title')}
        right={<span>{tr('fav.simsRight', { n: simulations?.toLocaleString(lang === 'en' ? 'en-GB' : 'es') })}</span>}
      />
      <p className="text-xs text-white/45 mb-4 leading-relaxed">{tr('fav.intro', { n: simulations?.toLocaleString(lang === 'en' ? 'en-GB' : 'es') })}</p>

      {/* cabecera de columnas */}
      <div className="flex items-center gap-3 px-3 pb-2 eyebrow">
        <span className="w-7" /><span className="w-[26px]" />
        <span className="flex-1">{t('fav.team')}</span>
        <span className="hidden sm:block w-[86px] text-center">{t('fav.road')}</span>
        <span className="w-16 text-right text-amber-300/70">{t('fav.champion')}</span>
      </div>

      <ol className="space-y-1.5 stagger">
        {shown.map((row, i) => {
          const lead = i === 0
          return (
            <li key={row.team}
              className={`glass glass-hover rounded-xl pl-2.5 pr-3 py-2.5 flex items-center gap-3 ${lead ? 'ring-1 ring-amber-300/25' : ''}`}>
              <Rank i={i} />
              {getFlagUrl(row.team)
                ? <img src={getFlagUrl(row.team, 40)} alt="" width={26} height={17} className="rounded-[2px] object-cover flex-shrink-0" style={{ height: 17 }} />
                : <div className="w-[26px] h-[17px] rounded-[2px] bg-white/10 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-white truncate">{teamLabel(row.team)}</span>
                  <span className="text-[9px] text-white/35 uppercase tracking-wide flex-shrink-0">{t('fav.group', { g: row.group })}</span>
                </div>
                <div className="h-[7px] rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full grow-x"
                    style={{ width: `${Math.max(1.5, row.champion / max * 100)}%`,
                      background: lead ? 'linear-gradient(90deg,#ffe9a8,#eeb63a)' : 'linear-gradient(90deg,#3f7bff,#9b40f0)' }} />
                </div>
              </div>
              <div className="hidden sm:flex w-[86px] justify-center flex-shrink-0">
                <ReachLadder row={row} labels={labels} onHover={onHover} onLeave={() => setTip(null)} />
              </div>
              <span className={`w-16 text-right text-lg font-black tnum flex-shrink-0 ${lead ? 'champ-gold' : 'text-white'}`}>{row.champion}%</span>
            </li>
          )
        })}
      </ol>

      {tip && (
        <div className="absolute z-30 pointer-events-none rounded-lg border border-white/15 bg-[#0d1322]/95 px-2.5 py-1.5 text-[11px] font-semibold text-white/85 shadow-xl"
          style={{ left: Math.min(tip.x + 12, (hostRef.current?.clientWidth || 400) - 120), top: tip.y - 34, backdropFilter: 'blur(8px)' }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}
