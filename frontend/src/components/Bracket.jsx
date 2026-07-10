import { useState, useEffect, useRef, useCallback } from 'react'
import { getFlagUrl, teamLabel } from '../data/teams.js'
import { TrophyIcon, QualDot } from './Icons.jsx'
import { useI18n } from '../i18n.jsx'

// ── Geometría ───────────────────────────────────────────────────────────
const CARD_W = 158
const CARD_H = 62
const ROW_GAP = 18
const PITCH = CARD_H + ROW_GAP          // 80
const COL_GAP = 38
const COL_W = CARD_W + COL_GAP          // 196
const N_LEAVES = 8                       // 8 partidos de 16avos por lado
const TOTAL_H = N_LEAVES * CARD_H + (N_LEAVES - 1) * ROW_GAP   // 622
const CENTER_W = 196

// centros verticales por ronda (0 = 16avos con 8 tarjetas)
function buildCenters() {
  const rounds = [[]]
  for (let i = 0; i < N_LEAVES; i++) rounds[0].push(i * PITCH + CARD_H / 2)
  let cur = rounds[0]
  while (cur.length > 1) {
    const nxt = []
    for (let i = 0; i < cur.length; i += 2) nxt.push((cur[i] + cur[i + 1]) / 2)
    rounds.push(nxt); cur = nxt
  }
  return rounds   // [8],[4],[2],[1]
}
const CENTERS = buildCenters()
const N_ROUNDS = CENTERS.length              // 4
const TOTAL_W_SIDE = N_ROUNDS * COL_W - COL_GAP
const BRACKET_W = 2 * TOTAL_W_SIDE + CENTER_W   // ancho natural total
const BRACKET_H = TOTAL_H + 36                   // alto natural (incluye etiquetas)



// ── Fila de una selección dentro de la tarjeta ──────────────────────────
function SlotRow({ slot, top, tp }) {
  const team = slot?.team
  const flag = team ? getFlagUrl(team, 40) : null
  const prob = slot?.prob
  const isLoser = slot && slot.win === false           // pierde el cruce → atenuado
  const isWinner = slot && slot.win === true
  const real = slot?.real                              // hit | wrong | out | null
  return (
    <div className={`flex items-center gap-1.5 px-2 h-[31px] ${top ? '' : 'border-t border-white/[0.07]'} ${isLoser ? 'opacity-45' : ''}`}>
      <QualDot status={slot?.status} />
      {flag
        ? <img src={flag} alt="" width={22} height={15} className="rounded-[2px] object-cover flex-shrink-0" style={{ height: 15 }} />
        : <div className="w-[22px] h-[15px] rounded-[2px] bg-white/10 flex-shrink-0" />}
      <span className={`flex-1 text-[12.5px] leading-none truncate ${
        isLoser ? 'font-medium text-white/60' : 'font-bold text-white'}`}>
        {teamLabel(team)}
      </span>
      {isWinner && <span className="text-emerald-400 text-[11px] flex-shrink-0" aria-label="→">›</span>}
      {slot?.played && slot?.score != null ? (
        <span className={`text-[11px] font-bold tabular-nums flex-shrink-0 px-1 py-0.5 rounded ${
          isWinner ? 'text-emerald-200 bg-emerald-500/20' : 'text-white/55 bg-white/10'}`}
          title={slot.pens ? tp.pens : tp.real}>
          {slot.score}{slot.pens && isWinner ? ' ᵖ' : ''}
        </span>
      ) : prob != null && team && (
        <span className={`text-[10px] tabular-nums flex-shrink-0 px-1 py-0.5 rounded ${
          isWinner ? 'text-emerald-300 bg-emerald-500/10' : 'text-white/45 bg-white/5'}`}>
          {prob}%
        </span>
      )}
      {real === 'hit' && (
        <span className="text-emerald-400 text-[12px] font-black flex-shrink-0 leading-none"
          title={tp.hit} aria-label={tp.hit}>✓</span>
      )}
      {(real === 'wrong' || real === 'out') && (
        <span className="text-rose-500 text-[12px] font-black flex-shrink-0 leading-none"
          title={tp.miss} aria-label={tp.miss}>✗</span>
      )}
    </div>
  )
}

function MatchCard({ a, b, x, centerY, selected, onClick, tp, tlabels }) {
  const played = a?.played || b?.played
  return (
    <button
      onClick={onClick}
      title={`${teamLabel(a?.team)} vs ${teamLabel(b?.team)} — ${played ? tlabels.played : tlabels.view}`}
      aria-label={`Predicción ${teamLabel(a?.team)} contra ${teamLabel(b?.team)}`}
      className={`absolute rounded-xl border overflow-hidden text-left transition-all duration-150
        hover:scale-[1.04] hover:z-20 active:scale-100
        ${selected
          ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.45)] bg-blue-950/40 z-10'
          : played
            ? 'border-emerald-500/70 bg-emerald-500/[0.07] hover:border-emerald-400'
            : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]'}`}
      style={{ left: x, top: centerY - CARD_H / 2, width: CARD_W, height: CARD_H }}
    >
      <SlotRow slot={a} top tp={tp} />
      <SlotRow slot={b} tp={tp} />
    </button>
  )
}

// ── Conectores SVG de un lado ───────────────────────────────────────────
function Connectors({ mirror }) {
  const lines = []
  const X = (v) => (mirror ? TOTAL_W_SIDE - v : v)
  for (let r = 0; r < CENTERS.length - 1; r++) {
    const childX = r * COL_W + CARD_W
    const parentXLeft = (r + 1) * COL_W
    const midX = childX + COL_GAP / 2
    const ch = CENTERS[r], par = CENTERS[r + 1]
    for (let p = 0; p < par.length; p++) {
      const yA = ch[2 * p], yB = ch[2 * p + 1], yP = par[p]
      lines.push(
        <path key={`${r}-${p}-a`} d={`M${X(childX)},${yA} H${X(midX)}`} />,
        <path key={`${r}-${p}-b`} d={`M${X(childX)},${yB} H${X(midX)}`} />,
        <path key={`${r}-${p}-v`} d={`M${X(midX)},${yA} V${yB}`} />,
        <path key={`${r}-${p}-p`} d={`M${X(midX)},${yP} H${X(parentXLeft)}`} />,
      )
    }
  }
  return (
    <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W_SIDE} height={TOTAL_H}
      style={{ overflow: 'visible' }}>
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none">{lines}</g>
    </svg>
  )
}

// ── Un lado del cuadro ──────────────────────────────────────────────────
function BracketSide({ rounds, mirror, selectedKey, onSelect, tp, tlabels, roundLabels }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: TOTAL_W_SIDE, height: TOTAL_H }}>
      <Connectors mirror={mirror} />
      {rounds.map((matches, r) =>
        matches.map((m, i) => {
          const baseX = r * COL_W
          const x = mirror ? (TOTAL_W_SIDE - baseX - CARD_W) : baseX
          const key = `${mirror ? 'R' : 'L'}-${r}-${i}`
          return (
            <MatchCard key={key} a={m.a} b={m.b} x={x} centerY={CENTERS[r][i]}
              selected={selectedKey === key} tp={tp} tlabels={tlabels}
              onClick={() => onSelect(m.a?.team, m.b?.team, key)} />
          )
        })
      )}
      {roundLabels.map((lbl, r) => {
        const baseX = r * COL_W
        const x = mirror ? (TOTAL_W_SIDE - baseX - CARD_W) : baseX
        return (
          <div key={lbl} className="absolute text-[10px] font-bold uppercase tracking-wider text-white/30 text-center"
            style={{ left: x, top: -24, width: CARD_W }}>
            {lbl}
          </div>
        )
      })}
    </div>
  )
}

function toMatches(slots, from, count) {
  const out = []
  for (let i = 0; i < count; i++) out.push({ a: slots[from + 2 * i], b: slots[from + 2 * i + 1] })
  return out
}

export default function Bracket({ bracket, selectedKey, onSelect }) {
  const { t } = useI18n()
  const tp = { real: t('bracket.scoreReal'), pens: t('bracket.scorePens'), hit: t('legend.hit'), miss: t('legend.miss') }
  const tlabels = { played: t('bracket.played'), view: t('bracket.view') }
  const roundLabels = [t('round.r32'), t('round.r16'), t('round.qf'), t('round.sf')]
  const { r32 = [], r16 = [], qf = [], sf = [], final = [] } = bracket || {}

  const left = [toMatches(r32, 0, 8), toMatches(r16, 0, 4), toMatches(qf, 0, 2), toMatches(sf, 0, 1)]
  const right = [toMatches(r32, 16, 8), toMatches(r16, 8, 4), toMatches(qf, 4, 2), toMatches(sf, 2, 1)]
  const champ = final?.find?.(s => s.win) ||
    (final?.length === 2 ? ((final[0]?.prob ?? 0) >= (final[1]?.prob ?? 0) ? final[0] : final[1]) : null)

  // Auto-ajuste: el cuadro se escala para caber entero en la ventana al abrir.
  const wrapRef = useRef(null)
  const [autoScale, setAutoScale] = useState(0.85)
  const [zoom, setZoom] = useState(1)   // multiplicador manual (control de zoom)

  const recompute = useCallback(() => {
    const el = wrapRef.current
    if (!el || !el.clientWidth) return
    const s = Math.min((el.clientWidth - 16) / BRACKET_W, (el.clientHeight - 16) / BRACKET_H, 1)
    setAutoScale(Math.max(0.4, s))
  }, [])

  useEffect(() => {
    recompute()
    const ro = new ResizeObserver(recompute)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [recompute])

  const scale = Math.min(autoScale * zoom, 2)
  const pct = Math.round(scale * 100)

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-auto">
      {/* Control de zoom */}
      <div className="sticky top-0 z-20 flex justify-end pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg glass px-1 py-1 text-white/70">
          <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            aria-label={t('bracket.zoomOut')} className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-base leading-none">−</button>
          <button onClick={() => setZoom(1)}
            aria-label={t('bracket.zoomFit')} title={t('bracket.zoomFit')}
            className="px-2 h-7 rounded-md hover:bg-white/10 text-[11px] font-semibold tabular-nums min-w-[3rem]">
            {pct}%
          </button>
          <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.15).toFixed(2)))}
            aria-label={t('bracket.zoomIn')} className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-base leading-none">+</button>
        </div>
      </div>

      {/* Caja escalada (reserva el tamaño ya escalado, centrada) */}
      <div style={{ width: BRACKET_W * scale, height: BRACKET_H * scale, margin: '0 auto' }} className="-mt-7">
        <div style={{ width: BRACKET_W, height: BRACKET_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div className="flex items-start justify-center gap-0" style={{ width: BRACKET_W }}>
            <BracketSide rounds={left} mirror={false} selectedKey={selectedKey} onSelect={onSelect} tp={tp} tlabels={tlabels} roundLabels={roundLabels} />

            <div className="flex-shrink-0 flex flex-col items-center"
              style={{ width: CENTER_W, height: TOTAL_H, paddingTop: TOTAL_H / 2 - 124 }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-2">{t('round.final')}</div>
        <button
          onClick={() => final?.length === 2 && onSelect(final[0]?.team, final[1]?.team, 'FINAL')}
          aria-label={t('pred.final')}
          className={`w-[170px] rounded-xl border overflow-hidden mb-4 transition-all hover:scale-[1.03]
            ${selectedKey === 'FINAL'
              ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              : final?.[0]?.played
                ? 'border-emerald-500/70 bg-emerald-500/[0.07]'
                : 'border-amber-500/30 bg-amber-500/[0.04]'}`}>
          <SlotRow slot={final?.[0]} top tp={tp} />
          <SlotRow slot={final?.[1]} tp={tp} />
        </button>
        <div className="relative mb-1.5">
          <TrophyIcon size={34} className="text-amber-400" />
          <div className="absolute -inset-2 rounded-full blur-lg opacity-30 -z-10"
            style={{ background: 'radial-gradient(circle,#f0b93c,transparent)' }} />
        </div>
        <div className="text-[9px] uppercase tracking-widest text-white/40">{t('common.champion')}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {champ?.team && getFlagUrl(champ.team) &&
            <img src={getFlagUrl(champ.team, 40)} alt="" width={26} height={17} className="rounded-[2px]" style={{ height: 17 }} />}
          <span className="text-lg font-black champ-gold">{champ ? teamLabel(champ.team) : '—'}</span>
        </div>
        {champ?.prob != null && <div className="text-[11px] text-amber-400/80 font-bold mt-0.5">{champ.prob}%</div>}
      </div>

            <BracketSide rounds={right} mirror selectedKey={selectedKey} onSelect={onSelect} tp={tp} tlabels={tlabels} roundLabels={roundLabels} />
          </div>
        </div>
      </div>
    </div>
  )
}
