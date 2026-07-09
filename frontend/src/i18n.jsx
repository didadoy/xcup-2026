import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { STR } from './strings.js'

const LangCtx = createContext(null)

function initialLang() {
  try {
    const saved = localStorage.getItem('xcup_lang')
    if (saved === 'es' || saved === 'en') return saved
  } catch { /* ignore */ }
  return (typeof navigator !== 'undefined' && /^en/i.test(navigator.language)) ? 'en' : 'es'
}

// Rellena {placeholders} en una plantilla.
function fill(tpl, params) {
  if (!params) return tpl
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`))
}

// Parte una cadena con **negrita** en nodos React.
export function rich(str) {
  const parts = String(str).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="text-white/85">{p.slice(2, -2)}</strong>
      : p)
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  useEffect(() => {
    try { document.documentElement.lang = lang } catch { /* ignore */ }
  }, [lang])
  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('xcup_lang', l) } catch { /* ignore */ }
  }, [])
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
}

// Hook principal: t(key, params) → string; tr(key, params) → nodos (con **negrita**).
export function useI18n() {
  const ctx = useContext(LangCtx)
  const lang = ctx?.lang || 'es'
  const t = useCallback((key, params) => {
    const entry = STR[key]
    if (!entry) return key
    return fill(entry[lang] ?? entry.es, params)
  }, [lang])
  const tr = useCallback((key, params) => rich(t(key, params)), [t])
  return { lang, setLang: ctx?.setLang || (() => {}), t, tr }
}

export const localeOf = (lang) => (lang === 'en' ? 'en-GB' : 'es-ES')
