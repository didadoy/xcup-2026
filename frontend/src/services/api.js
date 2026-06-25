// En desarrollo usa el proxy de Vite (/api). En producción, define
// VITE_API_URL con la URL del backend desplegado (p. ej. https://...onrender.com).
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

async function get(path) {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export const api = {
  projection: () => get('/projection'),
  backtest: () => get('/backtest'),
  status: () => get('/status'),
  predict: (teamA, teamB) =>
    get(`/predict/${encodeURIComponent(teamA.replace(/ /g, '_'))}/${encodeURIComponent(teamB.replace(/ /g, '_'))}`),
  health: () => get('/health'),
}
