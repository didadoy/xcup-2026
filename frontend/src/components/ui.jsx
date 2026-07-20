// Primitivas de UI compartidas — dan cohesión visual a toda la web.
import { getFlagUrl, teamLabel } from '../data/teams.js'

// Cabecera de sección: eyebrow + título + acción opcional a la derecha.
export function SectionHead({ eyebrow, title, right, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h3 className="text-[15px] sm:text-base font-extrabold text-white tracking-tight leading-none">{title}</h3>
      </div>
      {right && <div className="text-[11px] text-white/45 flex-shrink-0">{right}</div>}
    </div>
  )
}

// Tarjeta métrica (stat tile) con valor grande y sub.
export function StatTile({ label, value, sub, accent = 'default' }) {
  const tone = {
    default: 'text-white',
    good: 'text-emerald-300',
    brand: 'brand-text',
    gold: 'champ-gold',
  }[accent] || 'text-white'
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="eyebrow">{label}</div>
      <div className={`text-[26px] sm:text-[30px] font-black mt-1.5 leading-none tnum ${tone}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-white/45 mt-1.5 leading-tight">{sub}</div>}
    </div>
  )
}

// Barra de progreso con degradado y animación de crecimiento.
export function Meter({ value, max = 100, gradient = 'linear-gradient(90deg,#3f7bff,#9b40f0)', height = 8, track = 'rgba(255,255,255,0.06)', className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`rounded-full overflow-hidden ${className}`} style={{ height, background: track }}>
      <div className="h-full rounded-full grow-x" style={{ width: `${Math.max(1, pct)}%`, background: gradient }} />
    </div>
  )
}

// Bandera + nombre de selección, tamaño configurable.
export function Team({ name, size = 20, className = '', bold = true, truncate = true }) {
  const flag = getFlagUrl(name, size >= 24 ? 40 : 20)
  const w = Math.round(size * 1.34)
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      {flag
        ? <img src={flag} alt="" width={w} height={size} className="rounded-[2px] object-cover flex-shrink-0" style={{ height: size }} />
        : <span className="rounded-[2px] bg-white/10 flex-shrink-0" style={{ width: w, height: size }} />}
      <span className={`${bold ? 'font-bold' : 'font-medium'} text-white ${truncate ? 'truncate' : ''}`}>{teamLabel(name)}</span>
    </span>
  )
}

// Chip pequeño con punto de color.
export function LegendChip({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}
