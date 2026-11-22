import React from "react";
import { Block, CardsGridSkeleton, FormGridSkeleton, Panel, TableSkeleton, TitleSkeleton } from "./shared";

export default function SueldosEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <Panel>
          <Block className="h-3.5 w-40" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Block className="h-10 w-full" key={index} />
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Block className="h-[var(--field-height)] w-40" />
            <Block className="h-[var(--field-height)] w-64" />
          </div>
        </Panel>
        <FormGridSkeleton fields={4} rows={1} columns={4} />
        <CardsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={6} rows={5} />
      </main>
    </div>
  );
}
