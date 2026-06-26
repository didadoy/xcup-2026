import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api.js'

// ── Caché en navegador (stale-while-revalidate) ─────────────────────────
// Muestra al instante lo último guardado y, con un chequeo minúsculo a
// /api/status, solo descarga la versión completa si el backend tiene datos
// MÁS NUEVOS (p. ej. tras un redeploy o el recálculo de cada 6h). Así no se
// re-simula nada por visita y los cambios aparecen solos, sin botón manual.
function readCache(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null }
  catch { return null }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota/priv */ }
}

// ¿El backend tiene datos más nuevos que los cacheados?
async function backendIsNewer(cached) {
  if (!cached || !cached.last_updated) return true
  try {
    const st = await api.status()
    return !!(st && st.last_refresh && st.last_refresh > cached.last_updated)
  } catch {
    return false   // si el chequeo falla, nos quedamos con la caché
  }
}

export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${breakpoint}px)`)
    const on = () => setIsDesktop(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [breakpoint])
  return isDesktop
}

export function useProjection() {
  const [data, setData] = useState(() => readCache('xcup_projection_v2'))
  const [loading, setLoading] = useState(() => !readCache('xcup_projection_v2'))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const cached = readCache('xcup_projection_v2')
      if (!(await backendIsNewer(cached))) { setLoading(false); return }  // caché al día
      setRefreshing(true)
      const d = await api.projection()
      if (d && d.loading) { setTimeout(load, 3000); return }   // backend calculando
      setData(d); writeCache('xcup_projection_v2', d)
      setError(null); setLoading(false); setRefreshing(false)
    } catch (e) {
      setError(e.message); setLoading(false); setRefreshing(false)
      setTimeout(load, 5000)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60 * 1000)   // re-chequea cada 10 min (pestaña abierta)
    return () => clearInterval(id)
  }, [load])

  return { data, loading, refreshing, error, lastUpdated: data?.last_updated, refresh: load }
}

export function useBacktest() {
  const [data, setData] = useState(() => readCache('xcup_backtest_v2'))
  const [loading, setLoading] = useState(() => !readCache('xcup_backtest_v2'))
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    let timer
    const load = async () => {
      try {
        const cached = readCache('xcup_backtest_v2')
        if (!(await backendIsNewer(cached))) { if (alive) setLoading(false); return }
        const d = await api.backtest()
        if (!alive) return
        if (d && d.loading) { timer = setTimeout(load, 3000); return }
        setData(d); writeCache('xcup_backtest_v2', d); setLoading(false)
      } catch (e) { if (alive) { setError(e.message); setLoading(false) } }
    }
    load()
    const interval = setInterval(load, 10 * 60 * 1000)   // re-chequea cada 10 min
    return () => { alive = false; clearTimeout(timer); clearInterval(interval) }
  }, [])

  return { data, loading, error }
}

export function useMatchPrediction(teamA, teamB) {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!teamA || !teamB) return
    setLoading(true)
    setPrediction(null)
    api.predict(teamA, teamB)
      .then(setPrediction)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [teamA, teamB])

  return { prediction, loading }
}
