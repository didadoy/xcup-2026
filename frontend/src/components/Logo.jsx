// Marca xCup: un cuadro (bracket) que converge en el balón — la idea del
// producto hecha icono. Mismo dibujo que public/favicon.svg.
export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="xcup-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset="0.55" stopColor="#5b4cf5" />
          <stop offset="1" stopColor="#8b31e8" />
        </linearGradient>
        <linearGradient id="xcup-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="0.55" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#xcup-bg)" />
      <rect width="64" height="64" rx="15" fill="url(#xcup-shine)" />
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.96">
        {/* llave superior */}
        <path d="M13 16 H20 V26 H13 M20 21 H28" />
        {/* llave inferior */}
        <path d="M13 38 H20 V48 H13 M20 43 H28" />
        {/* semifinal → final */}
        <path d="M28 21 V43 M28 32 H34" />
      </g>
      {/* el balón (campeón) */}
      <circle cx="44.5" cy="32" r="8" fill="#fff" opacity="0.97" />
      <path d="M44.5 27.6l4.1 3-1.55 4.8h-5.1l-1.55-4.8 4.1-3Z" fill="url(#xcup-bg)" opacity="0.9" />
    </svg>
  )
}
