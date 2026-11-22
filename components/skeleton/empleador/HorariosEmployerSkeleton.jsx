import React from "react";
import { Block, FormGridSkeleton, Panel, TableSkeleton, TitleSkeleton } from "./shared";

export default function HorariosEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <FormGridSkeleton fields={3} rows={1} columns={3} className="mb-1" />
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Block className="h-3.5 w-40" />
            <Block className="h-7 w-20" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, index) => (
              <Block className="h-24 w-full" key={index} />
            ))}
          </div>
        </Panel>
        <TableSkeleton columns={5} rows={5} />
      </main>
    </div>
  );
}
