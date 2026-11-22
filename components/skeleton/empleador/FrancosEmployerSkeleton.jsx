import React from "react";
import { Block, CardsGridSkeleton, FormGridSkeleton, Panel, TableSkeleton, TitleSkeleton } from "./shared";

export default function FrancosEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <FormGridSkeleton fields={3} rows={1} columns={3} />
        <CardsGridSkeleton count={3} columns={3} />
        <Panel>
          <Block className="h-3.5 w-56" />
          <Block className="mt-4 h-24 w-full" />
        </Panel>
        <TableSkeleton columns={5} rows={5} />
      </main>
    </div>
  );
}
