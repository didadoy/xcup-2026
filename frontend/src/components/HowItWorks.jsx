import { useState, useRef } from 'react'
import { useMatchPrediction } from '../hooks/useProjection.js'
import { getFlagUrl, teamLabel } from '../data/teams.js'

// Paleta categórica validada (CVD + contraste) sobre la superficie oscura.
const SERIES = ['#3987e5', '#199e70', '#c98500', '#9085e9', '#e66767']
const GRID_INK = 'rgba(255,255,255,0.08)'
const AXIS_INK = 'rgba(255,255,255,0.40)'

// ── Tooltip compartido (div posicionado sobre el gráfico) ────────────────
function useTooltip() {
  const [tip, setTip] = useState(null)   // {x, y, node}
  const show = (e, node, host) => {
    const r = host.getBoundingClientRect()
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, node })
  }
  return [tip, show, () => setTip(null)]
}

function Tip({ tip }) {
  if (!tip) return null
  return (
    <div className="absolute z-30 pointer-events-none rounded-lg border border-white/15 bg-[#0d1322]/95 px-2.5 py-2 text-[11px] shadow-xl"
      style={{ left: Math.max(4, tip.x + 12), top: tip.y + 12, backdropFilter: 'blur(8px)' }}>
      {tip.node}
    </div>
  )
}

// ── 1) Evolución del Elo (líneas) ────────────────────────────────────────
export function EloChart({ history }) {
  const hostRef = useRef(null)
  const [tip, showTip, hideTip] = useTooltip()
  const [hoverYear, setHoverYear] = useState(null)
  const years = history?.years || []
  const series = history?.series || []
  if (!years.length || !series.length) return null

  const W = 720, H = 290, ML = 46, MR = 96, MT = 12, MB = 26
  const all = series.flatMap(s => s.elo)
  const lo = Math.floor(Math.min(...all) / 100) * 100
  const hi = Math.ceil(Math.max(...all) / 100) * 100
  const X = i => ML + (i / (years.length - 1)) * (W - ML - MR)
  const Y = v => MT + (1 - (v - lo) / (hi - lo)) * (H - MT - MB)
  const ticks = []
  for (let v = lo; v <= hi; v += 200) ticks.push(v)

  // etiquetas al final de línea, sin colisiones (separación mínima 14px)
  const ends = series.map((s, k) => ({ k, name: teamLabel(s.team), y: Y(s.elo[s.elo.length - 1]) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14
  const endY = Object.fromEntries(ends.map(e => [e.k, e.y]))

  const onMove = (e) => {
    const r = hostRef.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.max(0, Math.min(years.length - 1,
      Math.round(((px - ML) / (W - ML - MR)) * (years.length - 1))))
    setHoverYear(i)
    const rows = series.map((s, k) => ({ k, name: teamLabel(s.team), v: s.elo[i] }))
      .sort((a, b) => b.v - a.v)
    showTip(e, (
      <div>
        <div className="font-bold text-white mb-1">{years[i]}</div>
        {rows.map(rw => (
          <div key={rw.k} className="flex items-center gap-1.5 text-white/75">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: SERIES[rw.k] }} />
            <span className="flex-1 pr-2">{rw.name}</span>
            <span className="font-bold tabular-nums">{rw.v}</span>
          </div>
        ))}
      </div>
    ), hostRef.current)
  }

  return (
    <div ref={hostRef} className="relative" onMouseLeave={() => { hideTip(); setHoverYear(null) }}>
      {/* leyenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px] text-white/60">
        {series.map((s, k) => (
          <span key={s.team} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: SERIES[k] }} />
            {teamLabel(s.team)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} role="img"
        aria-label="Evolución del Elo de las cinco selecciones más fuertes desde 1990">
        {ticks.map(v => (
          <g key={v}>
            <line x1={ML} x2={W - MR} y1={Y(v)} y2={Y(v)} stroke={GRID_INK} strokeWidth="1" />
            <text x={ML - 6} y={Y(v) + 3.5} textAnchor="end" fontSize="10" fill={AXIS_INK}>{v.toLocaleString('es')}</text>
          </g>
        ))}
        {years.map((y, i) => (y % 5 === 0 &&
          <text key={y} x={X(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={AXIS_INK}>{y}</text>
        ))}
        {hoverYear != null && (
          <line x1={X(hoverYear)} x2={X(hoverYear)} y1={MT} y2={H - MB} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        )}
        {series.map((s, k) => (
          <path key={s.team} fill="none" stroke={SERIES[k]} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            d={s.elo.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} />
        ))}
        {series.map((s, k) => (
          <g key={s.team}>
            <circle cx={X(years.length - 1)} cy={Y(s.elo[s.elo.length - 1])} r="4"
              fill={SERIES[k]} stroke="#0a0e1a" strokeWidth="2" />
            <text x={X(years.length - 1) + 9} y={endY[k] + 3.5} fontSize="10.5" fontWeight="600"
              fill="rgba(255,255,255,0.75)">{teamLabel(s.team)}</text>
          </g>
        ))}
      </svg>
      <Tip tip={tip} />
    </div>
  )
}

// ── 2) Matriz de marcadores (heatmap Poisson) ────────────────────────────
function lerpColor(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

export function ScoreHeatmap({ teamA, teamB }) {
  const hostRef = useRef(null)
  const [tip, showTip, hideTip] = useTooltip()
  const { prediction } = useMatchPrediction(teamA, teamB)
  const grid = prediction?.score_grid
  if (!grid) return <div className="h-48 flex items-center justify-center text-white/30 text-xs">Calculando matriz…</div>

  const max = Math.max(...grid.flat())
  const cell = (v) => lerpColor('#12305e', '#cde2fb', max ? Math.pow(v / max, 0.7) : 0)

  return (
    <div ref={hostRef} className="relative" onMouseLeave={hideTip}>
      <div className="text-[11px] text-white/55 mb-2">
        Goles de <strong className="text-white/85">{teamLabel(teamA)}</strong> (filas) ×
        {' '}goles de <strong className="text-white/85">{teamLabel(teamB)}</strong> (columnas) ·
        {' '}xG {prediction.xg?.a} – {prediction.xg?.b}
      </div>
      <div className="inline-grid" style={{ gridTemplateColumns: `28px repeat(6, 40px)`, gap: 2 }}>
        <span />
        {[0, 1, 2, 3, 4, 5].map(j => (
          <span key={j} className="text-center text-[10px] text-white/40 pb-0.5">{j}</span>
        ))}
        {grid.map((row, i) => (
          [<span key={`l${i}`} className="flex items-center justify-center text-[10px] text-white/40">{i}</span>,
          ...row.map((v, j) => {
            const light = Math.pow(v / max, 0.7) > 0.55
            return (
              <div key={`${i}-${j}`}
                className="h-10 rounded-[4px] flex items-center justify-center text-[10px] font-bold cursor-default"
                style={{ background: cell(v), color: light ? '#0b1220' : 'rgba(255,255,255,0.75)' }}
                onMouseMove={e => showTip(e, (
                  <div className="text-white/85">
                    <strong>{teamLabel(teamA)} {i} – {j} {teamLabel(teamB)}</strong>
                    <div className="text-white/60">probabilidad {v}%</div>
                  </div>
                ), hostRef.current)}>
                {v >= 5 ? `${Math.round(v)}` : ''}
              </div>
            )
          })]
        ))}
      </div>
      <Tip tip={tip} />
    </div>
  )
}

// ── 3) Distribución del campeón (barras) ─────────────────────────────────
export function ChampBars({ favourites }) {
  const hostRef = useRef(null)
  const [tip, showTip, hideTip] = useTooltip()
  const top = (favourites || []).slice(0, 10)
  if (!top.length) return null
  const max = top[0].champion || 1

  return (
    <div ref={hostRef} className="relative space-y-1.5" onMouseLeave={hideTip}>
      {top.map(t => (
        <div key={t.team} className="flex items-center gap-2"
          onMouseMove={e => showTip(e, (
            <div className="text-white/85">
              <strong>{teamLabel(t.team)}</strong>
              <div className="text-white/60">octavos {t.r16}% · cuartos {t.qf}%</div>
              <div className="text-white/60">semis {t.sf}% · final {t.final}%</div>
              <div className="text-white/85 font-bold">campeón {t.champion}%</div>
            </div>
          ), hostRef.current)}>
          <span className="w-28 flex items-center gap-1.5 text-[11px] text-white/70 flex-shrink-0">
            {getFlagUrl(t.team) && <img src={getFlagUrl(t.team, 20)} alt="" width={16} height={11}
              className="rounded-[1px]" style={{ height: 11 }} />}
            <span className="truncate">{teamLabel(t.team)}</span>
          </span>
          <div className="flex-1 h-[18px]">
            <div className="h-full rounded-r-[4px]"
              style={{ width: `${Math.max(1.5, (t.champion / max) * 100)}%`, background: '#3987e5' }} />
          </div>
          <span className="w-11 text-right text-[11px] font-bold text-white/80 tabular-nums flex-shrink-0">
            {t.champion}%
          </span>
        </div>
      ))}
      <Tip tip={tip} />
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div className="glass rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-5 h-5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200 text-[10px] font-black flex items-center justify-center">{n}</span>
        <span className="text-[12px] font-bold text-white">{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-white/55">{children}</p>
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <section className="mb-8">
      <h3 className="text-sm font-black text-white mb-0.5">{title}</h3>
      {sub && <p className="text-[11px] text-white/45 mb-3">{sub}</p>}
      {children}
    </section>
  )
}

export default function HowItWorks({ data, onGoAccuracy }) {
  const finalists = data?.bracket?.final?.map(s => s?.team).filter(Boolean) || []
  const [ta, tb] = finalists.length === 2 ? finalists : ['Spain', 'Argentina']

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-10">
      <p className="text-xs sm:text-sm text-white/55 leading-relaxed mb-6">
        Nada de esta web está inventado: cada probabilidad sale de un modelo estadístico entrenado con
        {' '}<strong className="text-white/85">{data?.model?.n_matches?.toLocaleString('es') ?? '~49.500'} partidos internacionales
        oficiales desde 1872</strong>. Así funciona, de los datos a la predicción.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
        <Step n="1" title="Datos reales">
          Resultados oficiales (martj42/international_results): 154 años de partidos con torneo, sede y marcador.
          Se actualizan solos tras cada jornada.
        </Step>
        <Step n="2" title="Elo: fuerza global">
          Se procesa toda la historia en orden. Ganar sube tu rating según la dificultad del rival, la importancia
          del torneo y la diferencia de goles.
        </Step>
        <Step n="3" title="Poisson: goles esperados">
          Un GLM (scikit-learn) aprende el ataque y la defensa de cada selección, pesando más lo reciente y los
          Mundiales. De ahí salen los xG y la matriz de marcadores.
        </Step>
        <Step n="4" title="Monte Carlo: el torneo">
          Se simula el cuadro completo 40.000 veces partido a partido (prórroga y penaltis incluidos). Las
          probabilidades son frecuencias de esas simulaciones.
        </Step>
      </div>

      <Section title="La fuerza de cada selección, entrenada sobre 154 años"
        sub="Rating Elo al cierre de cada año — las 5 selecciones más fuertes hoy. Pasa el ratón para comparar cualquier año.">
        <div className="glass rounded-xl p-4"><EloChart history={data?.model?.elo_history} /></div>
      </Section>

      <Section title="De dos equipos a un marcador: la matriz Poisson"
        sub={`Probabilidad de cada marcador exacto en ${teamLabel(ta)} – ${teamLabel(tb)} según los goles esperados del modelo. Ningún marcador supera ~el 12%: por eso el titular son las probabilidades, no "el resultado".`}>
        <div className="glass rounded-xl p-4 overflow-x-auto"><ScoreHeatmap teamA={ta} teamB={tb} /></div>
      </Section>

      <Section title="40.000 Mundiales simulados"
        sub="Probabilidad de título: en cuántas de las 40.000 simulaciones cada selección acaba levantando la copa.">
        <div className="glass rounded-xl p-4"><ChampBars favourites={data?.favourites} /></div>
      </Section>

      <Section title="Validación honesta"
        sub="El modelo se evalúa reentrenándolo SIN los partidos del Mundial 2026 y prediciendo lo que nunca vio (out-of-sample). Sin fuga de datos: la métrica que ves es la que tendría en la vida real.">
        <button onClick={onGoAccuracy}
          className="px-4 py-2 rounded-xl bg-blue-600/25 border border-blue-500/40 text-blue-200 text-xs font-bold hover:bg-blue-600/35 transition-colors">
          Ver la precisión medida partido a partido
        </button>
      </Section>
    </div>
  )
}
