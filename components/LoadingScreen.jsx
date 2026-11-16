import React from "react";

// Pantallas de carga. En lugar de un texto "Cargando…" se muestra la forma de la
// pantalla que viene (menú, encabezado, tarjetas y tabla) mientras llegan los datos.

function Block({ className }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// Contenido de una sección del panel: título, tarjetas de indicadores, formulario y tabla
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando la sección" className="px-4 py-4 md:px-5" role="status">
      <div className="mx-auto max-w-[93.75rem] space-y-4">
        <div className="space-y-2">
          <Block className="h-2.5 w-40" />
          <Block className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm" key={item}>
              <Block className="h-2.5 w-24" />
              <Block className="mt-3 h-7 w-16" />
              <Block className="mt-3 h-2 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <Block className="h-3.5 w-48" />
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <Block className="h-2.5 w-20" />
                <Block className="mt-1.5 h-[1.875rem] w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <Block className="h-3.5 w-40" />
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3, 4].map((item) => (
              <Block className="h-6 w-full" key={item} />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

// Primera carga del panel (por ejemplo, al pasar del inicio de sesión al inicio):
// el menú lateral y el contenido aparecen como bloques mientras se leen los datos.
export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans">
      <aside aria-hidden="true" className="sticky top-0 hidden h-screen w-[11.5625rem] shrink-0 flex-col gap-3 bg-[#223247] p-3 lg:flex">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#3b475e]" />
          <div className="space-y-1.5">
            <div className="h-2 w-20 rounded bg-[#3b475e]" />
            <div className="h-1.5 w-14 rounded bg-[#2f3d54]" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="h-6 rounded-md bg-[#2b3a50]" key={index} style={{ opacity: 1 - index * 0.07 }} />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div aria-hidden="true" className="flex h-14 items-center gap-3 bg-[#223247] px-3 lg:hidden">
          <div className="h-6 w-6 rounded bg-[#3b475e]" />
          <div className="h-3 w-28 rounded bg-[#3b475e]" />
        </div>
        <PageSkeleton />
      </div>
    </div>
  );
}

// Páginas públicas y pasos de acceso
export function PublicLoading() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f5f7ff] font-sans" role="status">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-700" />
      <p className="text-[0.6875rem] font-semibold text-slate-500">Cargando…</p>
    </div>
  );
}
