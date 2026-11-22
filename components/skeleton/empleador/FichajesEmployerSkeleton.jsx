import React from "react";
import { Block, CardsGridSkeleton, FormGridSkeleton, Panel, TableSkeleton, TitleSkeleton } from "./shared";

export default function FichajesEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <FormGridSkeleton fields={5} rows={1} columns={5} />
        <CardsGridSkeleton count={3} columns={3} />
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Block className="h-3.5 w-40" />
            <Block className="h-[var(--field-height)] w-44" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3" key={index}>
                <Block className="h-2.5 w-16" />
                <Block className="mt-3 h-6 w-20" />
                <Block className="mt-2 h-2 w-8/12" />
              </div>
            ))}
          </div>
        </Panel>
        <TableSkeleton columns={6} rows={5} />
      </main>
    </div>
  );
}
