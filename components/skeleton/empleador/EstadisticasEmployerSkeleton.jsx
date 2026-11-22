import React from "react";
import { Block, CardsGridSkeleton, Panel, TitleSkeleton } from "./shared";

export default function EstadisticasEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <div className="flex gap-3">
          <Block className="h-[var(--field-height)] w-52" />
          <Block className="h-[var(--field-height)] w-40" />
        </div>
        <CardsGridSkeleton count={4} columns={4} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel className="h-[21rem]">
            <Block className="h-3.5 w-40" />
            <Block className="mt-3 h-48 w-full" />
          </Panel>
          <Panel className="h-[21rem]">
            <Block className="h-3.5 w-40" />
            <Block className="mt-3 h-48 w-full" />
          </Panel>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Panel key={index} className="h-28">
              <Block className="h-3.5 w-32" />
              <Block className="mt-3 h-2.5 w-3/4" />
              <Block className="mt-3 h-2 w-2/3" />
            </Panel>
          ))}
        </div>
      </main>
    </div>
  );
}
