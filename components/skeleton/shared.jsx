import React from "react";

export function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function SkeletonPanel({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function SkeletonPage({ children }) {
  return (
    <div aria-busy="true" aria-label="Cargando la sección" className="px-4 py-4 md:px-5" role="status">
      <div className="mx-auto max-w-[93.75rem] space-y-4">{children}</div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <header>
      <div aria-hidden="true" className="mb-1 flex items-center gap-2">
        <SkeletonBlock className="h-2.5 w-36" />
        <SkeletonBlock className="h-2.5 w-2" />
        <SkeletonBlock className="h-2.5 w-20" />
      </div>
      <SkeletonBlock className="h-7 w-64" />
    </header>
  );
}

export function SkeletonMetricCards({ count, className = "" }) {
  return (
    <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonPanel key={index}>
          <SkeletonBlock className="h-2.5 w-28" />
          <SkeletonBlock className="mt-3 h-7 w-16" />
          <SkeletonBlock className="mt-3 h-2 w-36" />
        </SkeletonPanel>
      ))}
    </section>
  );
}

export function SkeletonTableRows({ columns, rows = 5, className = "" }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`grid gap-3 bg-[#edf4ff] px-4 py-3 ${className}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock className="h-2.5 w-16" key={index} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          aria-hidden="true"
          className={`grid items-center gap-3 border-t border-slate-100 px-4 py-3 ${className}`}
          key={rowIndex}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <div className="min-w-0" key={columnIndex}>
              <SkeletonBlock className={`h-2.5 ${columnIndex === 0 ? "w-3/4" : "w-2/3"}`} />
              {(columnIndex === 0 || columnIndex === 1 || columnIndex === 5) && (
                <SkeletonBlock className="mt-1.5 h-2 w-1/2" />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}