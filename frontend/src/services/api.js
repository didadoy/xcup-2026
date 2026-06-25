const BASE = '/api'

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
