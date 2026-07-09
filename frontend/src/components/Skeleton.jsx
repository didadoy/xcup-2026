// Skeleton del cuadro mientras carga (en vez de un simple "Cargando…").
function Card() {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ width: 158 }}>
      {[0, 1].map(i => (
        <div key={i} className={`flex items-center gap-1.5 px-2 h-[31px] ${i ? 'border-t border-white/[0.05]' : ''}`}>
          <span className="w-[7px] h-[7px] rounded-full shimmer flex-shrink-0" />
          <span className="w-[22px] h-[15px] rounded-[2px] shimmer flex-shrink-0" />
          <span className="flex-1 h-2.5 rounded shimmer" />
          <span className="w-6 h-3 rounded shimmer flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function BracketSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="flex items-start gap-10 opacity-70 scale-90">
        {/* columna de 16avos */}
        <div className="flex flex-col gap-[18px]">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} />)}
        </div>
        {/* octavos */}
        <div className="flex flex-col gap-[74px] mt-[46px]">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} />)}
        </div>
        {/* cuartos */}
        <div className="hidden sm:flex flex-col gap-[190px] mt-[120px]">
          {Array.from({ length: 2 }).map((_, i) => <Card key={i} />)}
        </div>
        {/* centro / final */}
        <div className="hidden lg:flex flex-col items-center gap-3 mt-[150px]">
          <div className="w-[170px] h-[62px] rounded-xl shimmer" />
          <div className="w-8 h-8 rounded-full shimmer" />
          <div className="w-24 h-4 rounded shimmer" />
        </div>
      </div>
    </div>
  )
}
