import React from "react";
import {
  SkeletonBlock,
  SkeletonMetricCards,
  SkeletonPage,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function FrancosEmployeeSkeleton() {
  return (
    <SkeletonPage>
      <header className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-2.5 w-36" />
            <SkeletonBlock className="h-2.5 w-2" />
            <SkeletonBlock className="h-2.5 w-32" />
          </div>
          <SkeletonBlock className="h-7 w-64" />
        </div>
        <SkeletonPanel className="flex items-center gap-3 py-2">
          <div className="space-y-2">
            <SkeletonBlock className="h-2 w-24" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        </SkeletonPanel>
      </header>

      <section className="mb-5">
        <SkeletonPanel>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <SkeletonBlock className="h-3.5 w-52" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <SkeletonBlock className="h-2.5 w-44" />
              <SkeletonBlock className="mt-1.5 h-11 w-full rounded-lg" />
            </div>
            <SkeletonPanel className="border-blue-100 bg-blue-50">
              <SkeletonBlock className="h-2 w-40" />
              <SkeletonBlock className="mt-2 h-5 w-28" />
              <SkeletonBlock className="mt-2 h-2 w-36" />
            </SkeletonPanel>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-2 border-t border-slate-100 pt-3 sm:flex-row">
            <SkeletonBlock className="h-7 w-32" />
            <SkeletonBlock className="h-7 w-40" />
          </div>
        </SkeletonPanel>
      </section>

      <SkeletonMetricCards count={2} className="mb-5 md:grid-cols-3" />

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-8 w-32" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-[var(--field-height)] w-36" />
            <SkeletonBlock className="h-[var(--field-height)] w-40" />
          </div>
        </div>
        <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[47.5rem]">
              <SkeletonTableRows columns={5} rows={5} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <SkeletonBlock className="h-2.5 w-44" />
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
