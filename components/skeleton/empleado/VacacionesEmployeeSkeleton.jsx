import React from "react";
import {
  SkeletonBlock,
  SkeletonMetricCards,
  SkeletonPage,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function VacacionesEmployeeSkeleton() {
  return (
    <SkeletonPage>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-2.5 w-36" />
            <SkeletonBlock className="h-2.5 w-2" />
            <SkeletonBlock className="h-2.5 w-36" />
          </div>
          <SkeletonBlock className="h-7 w-48" />
        </div>
        <SkeletonPanel className="flex items-center gap-2 py-2">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <SkeletonBlock className="h-2 w-20" />
            <SkeletonBlock className="h-2.5 w-28" />
          </div>
        </SkeletonPanel>
      </header>

      <SkeletonPanel>
        <div className="relative mb-4 border-b border-slate-100 pb-3">
          <SkeletonBlock className="h-3.5 w-52" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <SkeletonBlock className="h-2.5 w-24" />
              <SkeletonBlock className="mt-1.5 h-[var(--field-height)] w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          {[0, 1, 2].map((item) => (
            <div className="space-y-2" key={item}>
              <SkeletonBlock className="h-2 w-32" />
              <SkeletonBlock className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="h-7 w-36" />
        </div>
      </SkeletonPanel>

      <SkeletonMetricCards count={3} className="md:grid-cols-3" />

      <section>
        <div className="mb-2 flex gap-2">
          <SkeletonBlock className="h-8 w-28" />
          <SkeletonBlock className="h-8 w-32" />
        </div>
        <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[47.5rem]">
              <SkeletonTableRows columns={4} rows={5} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3">
            <SkeletonBlock className="h-2.5 w-48" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-6 w-6" />
              <SkeletonBlock className="h-6 w-6" />
              <SkeletonBlock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
