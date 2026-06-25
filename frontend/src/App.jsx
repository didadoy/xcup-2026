import { useState } from 'react'
import Header from './components/Header.jsx'
import Bracket from './components/Bracket.jsx'
import BracketMobile from './components/BracketMobile.jsx'
import PredictionPanel from './components/PredictionPanel.jsx'
import GroupsPanel from './components/GroupsPanel.jsx'
import FavouritesPanel from './components/FavouritesPanel.jsx'
import AccuracyPanel from './components/AccuracyPanel.jsx'
import { useProjection, useIsDesktop } from './hooks/useProjection.js'
import { TrophyIcon, GridIcon, ChartIcon, TargetIcon, SignalIcon, AlertIcon } from './components/Icons.jsx'

const VIEWS = [
  { id: 'bracket', label: 'Cuadro', Icon: TrophyIcon },
  { id: 'groups', label: 'Grupos', Icon: GridIcon },
  { id: 'favourites', label: 'Favoritos', Icon: ChartIcon },
  { id: 'accuracy', label: 'Precisión', Icon: TargetIcon },
]

const TITLES = {
  bracket: 'Cuadro proyectado', groups: 'Fase de grupos',
  favourites: 'Favoritos al título', accuracy: 'Precisión del modelo',
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-72 text-white/30 gap-3 px-4 text-center">
      <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin flex-shrink-0" />
      Cargando…
    </div>
  )
}

export default function App() {
  const { data, loading, refreshing, error, lastUpdated } = useProjection()
  const [sel, setSel] = useState(null)
  const [view, setView] = useState('bracket')
  const isDesktop = useIsDesktop()

  const onSelect = (teamA, teamB, key) => {
    if (!teamA || !teamB) return
    setSel({ teamA, teamB, key, label: key === 'FINAL' ? 'Final proyectada' : 'Predicción del cruce' })
    setView('bracket')
  }
  const panelOpen = !!sel && view === 'bracket'

  return (
    <div className="min-h-screen flex flex-col noise"
      style={{ background: 'linear-gradient(160deg,#04060f 0%,#060914 60%,#080c1a 100%)' }}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle,#3b82f6,transparent)', filter: 'blur(120px)' }} />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen h-screen">
        <Header trainedThrough={data?.model?.trained_through} lastUpdated={lastUpdated} refreshing={refreshing} />

        {/* Barra: título + pestañas (responsive) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-6 pt-3 sm:pt-4 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mr-auto">
            {TITLES[view]}
            <span className="ml-2 text-xs sm:text-sm font-normal text-white/30">· Mundial 2026</span>
          </h1>
          <div role="tablist" aria-label="Vistas"
            className="flex rounded-xl border border-white/10 overflow-x-auto text-xs">
            {VIEWS.map(v => {
              const active = view === v.id
              return (
                <button key={v.id} onClick={() => setView(v.id)} role="tab" aria-selected={active}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 font-semibold whitespace-nowrap transition-colors border-l first:border-l-0 border-white/10 ${
                    active ? 'bg-blue-600/25 text-blue-300' : 'text-white/55 hover:text-white hover:bg-white/5'}`}>
                  <v.Icon size={15} />
                  <span>{v.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Aviso proyección (solo en Cuadro) */}
        {view === 'bracket' && !loading && !error && (
          <div className="px-4 sm:px-6 pt-2 flex-shrink-0">
            <div className="flex items-start sm:items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/20 text-[11px] text-blue-200/90">
              <SignalIcon size={16} className="text-blue-300 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Proyección con datos reales</strong> · {data?.played_group_matches} jugados,
                {' '}{data?.remaining_group_matches} simulados ({data?.simulations?.toLocaleString('es')} sim.). Los 32 son los
                {' '}<strong>más probables</strong>; en cada cruce <strong>avanza el favorito</strong> (›). Pulsa un partido para la predicción.
              </span>
            </div>
          </div>
        )}

        {error && !data && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 flex items-center gap-2">
            <AlertIcon size={15} className="flex-shrink-0" /><span>Conectando con el servidor… (puede tardar si estaba en reposo)</span>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 relative overflow-hidden">
          {view === 'bracket' && (
            <div className="h-full overflow-hidden">
              {loading ? <Loading /> : (
                isDesktop
                  ? <div className="h-full px-4 pt-2 pb-3"><Bracket bracket={data?.bracket} selectedKey={sel?.key} onSelect={onSelect} /></div>
                  : <div className="h-full overflow-auto pt-2"><BracketMobile bracket={data?.bracket} champion={data?.champion} selectedKey={sel?.key} onSelect={onSelect} /></div>
              )}
            </div>
          )}
          {view === 'groups' && <div className="h-full overflow-auto">{loading ? <Loading /> : <GroupsPanel groups={data?.groups} />}</div>}
          {view === 'favourites' && <div className="h-full overflow-auto">{loading ? <Loading /> : <FavouritesPanel favourites={data?.favourites} simulations={data?.simulations} />}</div>}
          {view === 'accuracy' && <div className="h-full overflow-auto"><AccuracyPanel /></div>}

          {/* Panel de predicción: lateral en desktop, bottom-sheet en móvil */}
          {panelOpen && (
            <>
              <button aria-label="Cerrar predicción" tabIndex={-1}
                className="fixed lg:absolute inset-0 z-30 bg-black/60 lg:bg-black/20 cursor-default"
                onClick={() => setSel(null)} />
              <div role="dialog" aria-label="Predicción del partido"
                className="z-40 overflow-y-auto bg-[rgba(6,9,20,0.98)] border-white/10 shadow-2xl
                  fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t
                  lg:absolute lg:inset-x-auto lg:right-0 lg:top-0 lg:bottom-0 lg:max-h-none lg:w-[370px] lg:rounded-none lg:border-t-0 lg:border-l"
                style={{ backdropFilter: 'blur(24px)' }}>
                <div className="lg:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />
                <PredictionPanel teamA={sel.teamA} teamB={sel.teamB} label={sel.label} onClose={() => setSel(null)} />
              </div>
            </>
          )}
        </div>

        <footer className="flex-shrink-0 py-2 px-4 sm:px-6 flex items-center justify-between gap-3 border-t border-white/[0.05]">
          <span className="text-[10px] text-white/40 truncate">Datos oficiales reales · proyección estadística, no pronóstico oficial</span>
          <span className="text-[10px] text-white/40 hidden sm:block flex-shrink-0">Elo + Poisson · {data?.model?.n_matches?.toLocaleString('es')} partidos</span>
        </footer>
      </div>
    </div>
  )
}
