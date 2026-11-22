import React from "react";
import {
  SkeletonBlock,
  SkeletonMetricCards,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function EmpresasAdminSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />

      <SkeletonPanel>
        <div className="mb-3 border-b border-slate-100 pb-2.5">
          <SkeletonBlock className="h-3.5 w-48" />
          <SkeletonBlock className="mt-2 h-2.5 w-3/4" />
          <SkeletonBlock className="mt-1.5 h-2.5 w-2/3" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, field) => (
            <div key={field}>
              <SkeletonBlock className="h-2.5 w-28" />
              <SkeletonBlock className="mt-1.5 h-[var(--field-height)] w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-7 w-28" />
        </div>
      </SkeletonPanel>

      <SkeletonMetricCards count={3} className="md:grid-cols-3" />

      <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <SkeletonBlock className="h-3.5 w-40" />
          <SkeletonBlock className="h-[var(--field-height)] w-full md:w-80" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[50rem]">
            <SkeletonTableRows columns={8} rows={5} />
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
