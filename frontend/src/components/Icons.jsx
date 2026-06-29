// Iconos SVG (stroke = currentColor) — sin emojis.
// Todos aceptan className y size.

const base = (size) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
})

export function TrophyIcon({ size = 20, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5C3 9.5 4.5 11 7 11" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5C21 9.5 19.5 11 17 11" />
      <path d="M12 13v4" /><path d="M9 21h6" /><path d="M10 17h4l-.5 4h-3L10 17Z" />
    </svg>
  )
}

export function GridIcon({ size = 20, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function ChartIcon({ size = 20, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 21h18" />
      <rect x="5" y="11" width="3.5" height="8" rx="1" />
      <rect x="10.25" y="6" width="3.5" height="13" rx="1" />
      <rect x="15.5" y="14" width="3.5" height="5" rx="1" />
    </svg>
  )
}

export function BallIcon({ size = 20, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.2 2.3-1.2 3.7h-4L8.8 9.8 12 7.5Z" />
      <path d="M12 3v4.5M5 9.5l3.8.3M19 9.5l-3.8.3M7.2 19l1.6-3.4M16.8 19l-1.6-3.4" />
    </svg>
  )
}

export function RefreshIcon({ size = 16, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v5h-5" />
    </svg>
  )
}

export function CloseIcon({ size = 16, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// Puntito de estado de clasificación: verde = clasificado seguro,
// naranja = aún depende. Para 'out'/desconocido deja hueco (alineación).
export function QualDot({ status, className = '' }) {
  if (status === 'in')
    return <span title="Clasificado para el cuadro" aria-label="Clasificado"
      className={`w-[7px] h-[7px] rounded-full bg-emerald-400 flex-shrink-0 ${className}`} />
  if (status === 'maybe')
    return <span title="Aún depende de otros resultados" aria-label="Depende de otros resultados"
      className={`w-[7px] h-[7px] rounded-full bg-amber-400 flex-shrink-0 ${className}`} />
  return <span className={`w-[7px] h-[7px] flex-shrink-0 ${className}`} />
}

// Leyenda de símbolos del cuadro (aciertos, jugados, clasificados).
export function BracketLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/55 ${className}`}>
      <span className="flex items-center gap-1"><span className="text-emerald-400 font-black">✓</span> cruce acertado</span>
      <span className="flex items-center gap-1"><span className="text-rose-500 font-black">✗</span> cruce fallado</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-[3px] border border-emerald-500/70 bg-emerald-500/10 inline-block flex-shrink-0" />
        partido jugado
      </span>
      <span className="flex items-center gap-1">
        <span className="w-[7px] h-[7px] rounded-full bg-emerald-400 inline-block flex-shrink-0" /> clasificado
      </span>
    </div>
  )
}

export function TargetIcon({ size = 20, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ClockIcon({ size = 14, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function AlertIcon({ size = 16, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}

export function SignalIcon({ size = 16, className = '' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 13a9 9 0 0 1 14 0" opacity="0.5" />
      <path d="M8 16a5 5 0 0 1 8 0" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
