import { useEffect, useRef, useState } from 'react'
import { ClockIcon } from './Icons.jsx'
import Logo from './Logo.jsx'
import { useI18n, localeOf } from '../i18n.jsx'

function fmt(ts, lang) {
  if (!ts) return null
  try {
    return new Date(ts * 1000).toLocaleString(localeOf(lang),
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="flex items-center rounded-full border border-white/10 overflow-hidden text-[10px] font-bold">
      {['es', 'en'].map(l => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-2 py-1 uppercase transition-colors ${
            lang === l ? 'bg-blue-600/30 text-blue-200' : 'text-white/45 hover:text-white/80'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

export default function Header({ trainedThrough, lastUpdated, refreshing, onHome }) {
  const { t, lang, setLang } = useI18n()
  const when = fmt(lastUpdated, lang)

  // Destello sutil cuando llegan datos nuevos (cambia lastUpdated).
  const [flash, setFlash] = useState(false)
  const prev = useRef(lastUpdated)
  useEffect(() => {
    if (lastUpdated && prev.current && lastUpdated !== prev.current) {
      setFlash(true)
      const id = setTimeout(() => setFlash(false), 600)
      return () => clearTimeout(id)
    }
    prev.current = lastUpdated
  }, [lastUpdated])
  return (
    <header className="sticky top-0 z-50"
      style={{ background: 'rgba(4, 6, 15, 0.82)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">

      <button onClick={onHome} aria-label="Inicio"
        className="group flex items-center gap-2.5 rounded-lg transition-transform hover:scale-[1.02] active:scale-100">
        <div className="relative">
          <Logo size={36} />
          <div className="absolute -inset-1 rounded-xl blur-md opacity-35 group-hover:opacity-60 transition-opacity -z-10"
            style={{ background: 'linear-gradient(135deg,#2f6bff,#8b31e8)' }} />
        </div>
        <div className="leading-none">
          <span className="text-white font-black text-base sm:text-lg tracking-tight">xCup</span>
          <span className="ml-1.5 font-black text-base sm:text-lg tracking-tight brand-text">2026</span>
          <div className="hidden sm:block text-[8.5px] font-semibold uppercase tracking-[0.22em] text-white/35 mt-1">
            World Cup Predictor
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
        {trainedThrough && (
          <span className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t('header.dataThrough', { d: trainedThrough })}
          </span>
        )}
        {refreshing ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300"
            title={t('header.checking')}>
            <span className="w-3 h-3 rounded-full border-2 border-blue-300/40 border-t-blue-300 animate-spin" />
            <span className="whitespace-nowrap">{t('header.updating')}</span>
          </span>
        ) : when ? (
          <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-white/55 ${
            flash ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'bg-white/5 border-white/10'}`}
            style={{ transition: 'background-color .4s, border-color .4s, color .4s' }}
            title={t('header.autoUpdate')}>
            <ClockIcon size={13} />
            <span className="whitespace-nowrap">{t('header.updated', { when })}</span>
          </span>
        ) : null}
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      </div>
      {/* hairline degradado bajo el header */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />
    </header>
  )
}
