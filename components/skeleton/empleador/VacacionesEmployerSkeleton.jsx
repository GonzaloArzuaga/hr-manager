import React from "react";
import { Block, CardsGridSkeleton, FormGridSkeleton, Panel, TableSkeleton, TitleSkeleton } from "./shared";

export default function VacacionesEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton />
        <FormGridSkeleton fields={4} rows={1} columns={4} />
        <CardsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={6} rows={5} />
      </main>
    </div>
  );
}
