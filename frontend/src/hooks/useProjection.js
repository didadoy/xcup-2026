import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api.js'

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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const d = await api.projection()
      if (d && d.loading) {            // backend aún calculando → reintenta
        setLoading(true)
        setTimeout(load, 3000)
        return
      }
      setData(d)
      setError(null)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
      setTimeout(load, 4000)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, refresh: load }
}

export function useBacktest() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    let timer
    const load = () => {
      api.backtest()
        .then(d => {
          if (!alive) return
          if (d && d.loading) { timer = setTimeout(load, 3000); return }  // aún calculando
          setData(d); setLoading(false)
        })
        .catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    }
    load()
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
