import React from "react";
import {
  SkeletonBlock,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function SolicitudesAdminSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonPanel key={index}>
            <SkeletonBlock className="h-2.5 w-24" />
            <SkeletonBlock className="mt-3 h-7 w-14" />
            <SkeletonBlock className="mt-3 h-2 w-32" />
          </SkeletonPanel>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonBlock className="h-6 w-20 rounded-full" key={index} />
            ))}
          </div>
          <SkeletonBlock className="h-[var(--field-height)] w-full lg:w-72" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[56rem]">
            <SkeletonTableRows columns={7} rows={7} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
          <SkeletonBlock className="h-2.5 w-40" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-6" />
            <SkeletonBlock className="h-6 w-6" />
            <SkeletonBlock className="h-6 w-6" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
