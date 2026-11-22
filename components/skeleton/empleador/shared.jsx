import React from "react";

export function Block({ className = "", style = {} }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

export function Panel({ children, className = "" }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function TitleSkeleton({ compact = false }) {
  return (
    <div className="space-y-2">
      <Block className="h-2.5 w-28" />
      <Block className={compact ? "h-5 w-52" : "h-6 w-64"} />
    </div>
  );
}

const columnClasses = {
  1: "",
  2: "sm:grid-cols-2",
  3: "md:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-2 xl:grid-cols-6",
};

export function FormGridSkeleton({ fields = 3, rows = 1, className = "", columns = 4 }) {
  return (
    <Panel className={className}>
      <Block className="h-3.5 w-40" />
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className={`mt-4 grid grid-cols-1 gap-3 ${columnClasses[columns] ?? columnClasses[4]}`} key={rowIndex}>
          {Array.from({ length: fields }, (_, itemIndex) => (
            <div key={itemIndex}>
              <Block className="h-2.5 w-20" />
              <Block className="mt-1.5 h-[var(--field-height)] w-full" />
            </div>
          ))}
        </div>
      ))}
      <div className="mt-4 flex justify-end gap-2">
        <Block className="h-7 w-24" />
        <Block className="h-7 w-28" />
      </div>
    </Panel>
  );
}

export function CardsGridSkeleton({ count = 4, columns = 4 }) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${columnClasses[columns] ?? columnClasses[4]}`}>
      {Array.from({ length: count }, (_, index) => (
        <Panel key={index}>
          <Block className="h-2.5 w-24" />
          <Block className="mt-3 h-7 w-16" />
          <Block className="mt-3 h-2 w-32" />
        </Panel>
      ))}
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5, compact = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <Block className="h-3.5 w-40" />
        <Block className="h-[var(--field-height)] w-56" />
      </div>
      <div className="grid gap-3 bg-[#edf4ff] px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns || 5}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns || 5 }, (_, item) => (
          <Block className="h-2.5 w-16" key={item} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="grid items-center gap-3 border-t border-slate-100 px-4 py-3" key={rowIndex} style={{ gridTemplateColumns: `repeat(${columns || 5}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns || 5 }, (_, itemIndex) =>
            itemIndex === 0 ? (
              <div className="flex items-center gap-2" key={itemIndex}>
                <Block className="h-7 w-7 shrink-0 rounded-full" />
                <div className="w-full space-y-1.5">
                  <Block className="h-2.5 w-3/4" />
                  <Block className="h-2 w-1/2" />
                </div>
              </div>
            ) : (
              <Block className={compact ? "h-2.5 w-2/3" : "h-2.5 w-2/3"} key={itemIndex} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

export function WeeklyGridSkeleton() {
  return (
    <Panel>
      <Block className="h-3.5 w-40" />
      <div className="mt-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <Block className="h-24 w-full" key={index} />
        ))}
      </div>
    </Panel>
  );
}

export function TwoColumnStackSkeleton({ left, right }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">{left}</div>
      <div className="lg:col-span-5">{right}</div>
    </div>
  );
}
