import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api.js'

// ── Caché en navegador (stale-while-revalidate) ─────────────────────────
// Muestra al instante lo último guardado y revalida por detrás. Así no se ve
// el spinner cada vez que entras; solo la primera vez (cuando no hay caché).
function readCache(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null }
  catch { return null }
}
function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota/priv */ }
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
  const cached = readCache('xcup_projection_v2')
  const [data, setData] = useState(cached)
  const [loading, setLoading] = useState(!cached)   // spinner solo sin caché
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const d = await api.projection()
      if (d && d.loading) {                 // backend calculando → reintenta, mantiene caché
        setTimeout(load, 3000)
        return
      }
      setData(d); writeCache('xcup_projection_v2', d)
      setError(null); setLoading(false); setRefreshing(false)
    } catch (e) {
      setError(e.message); setLoading(false); setRefreshing(false)
      setTimeout(load, 5000)                // backend dormido/caído → reintenta
    }
  }, [])

  // Solo se llama al backend cuando hace falta:
  //  - sin caché, o
  //  - ya pasó la hora de actualización (cache.next_update).
  // Si la caché está vigente, se muestra tal cual (cero llamadas) y se programa
  // la revalidación justo para cuando toque (útil si la pestaña queda abierta).
  useEffect(() => {
    const c = readCache('xcup_projection_v2')
    const now = Date.now() / 1000
    if (!c || !c.next_update || now >= c.next_update) { load(); return }
    const ms = Math.min((c.next_update - now) * 1000 + 2000, 2 ** 31 - 1)
    const t = setTimeout(load, ms)
    return () => clearTimeout(t)
  }, [load])

  return { data, loading, refreshing, error, lastUpdated: data?.last_updated, refresh: load }
}

export function useBacktest() {
  const cached = readCache('xcup_backtest_v2')
  const [data, setData] = useState(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    let timer
    const load = () => {
      api.backtest()
        .then(d => {
          if (!alive) return
          if (d && d.loading) { timer = setTimeout(load, 3000); return }
          setData(d); writeCache('xcup_backtest_v2', d); setLoading(false)
        })
        .catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    }
    // mismo criterio que la proyección: solo llama si caduca la caché
    const c = readCache('xcup_backtest_v2')
    const now = Date.now() / 1000
    if (!c || !c.next_update || now >= c.next_update) load()
    else timer = setTimeout(load, Math.min((c.next_update - now) * 1000 + 2000, 2 ** 31 - 1))
    return () => { alive = false; clearTimeout(timer) }
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
