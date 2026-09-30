// Bloques compartidos por las páginas públicas
export function Etiqueta({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-info-light/70 px-3 py-1 text-[11px] font-semibold text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Encabezado({ antetitulo, titulo, descripcion, centrado = false }) {
  return (
    <div className={centrado ? 'text-center max-w-2xl mx-auto' : 'max-w-3xl'}>
      {antetitulo && <p className="text-xs font-semibold text-info mb-2">{antetitulo}</p>}
      <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">{titulo}</h2>
      {descripcion && <p className="text-sm text-muted mt-2 leading-relaxed">{descripcion}</p>}
    </div>
  )
}

export function Tarjeta({ icono: Icono, titulo, children, pie }) {
  return (
    <article className="bg-white rounded-xl border border-line/70 shadow-card flex flex-col">
      <div className="p-5 flex-1">
        <div className="h-9 w-9 rounded-lg bg-info-light/70 text-primary grid place-items-center mb-4">
          <Icono size={18} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold text-ink">{titulo}</h3>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">{children}</p>
      </div>
      {pie && <p className="px-5 py-3 border-t border-line/60 text-xs font-semibold text-info">{pie}</p>}
    </article>
  )
}

export function BandaAzul({ antetitulo, titulo, descripcion, children }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <div className="rounded-2xl bg-primary px-6 py-10 sm:px-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="max-w-xl">
          {antetitulo && <p className="text-[11px] font-semibold text-white/70 mb-2">{antetitulo}</p>}
          <h2 className="text-2xl font-bold text-white tracking-tight">{titulo}</h2>
          {descripcion && <p className="text-sm text-white/75 mt-2 leading-relaxed">{descripcion}</p>}
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  )
}
