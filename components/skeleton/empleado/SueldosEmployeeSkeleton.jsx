import React from "react";
import {
  SkeletonBlock,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function SueldosEmployeeSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />

      <SkeletonPanel className="overflow-hidden border-t-4 border-t-blue-700 p-4 md:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-2.5 w-28" />
                <SkeletonBlock className="h-4 w-40" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="inline-block rounded-lg bg-blue-50 px-4 py-3">
              <SkeletonBlock className="h-2.5 w-24" />
              <SkeletonBlock className="mt-2 h-6 w-32" />
            </div>
            <div className="mt-3 rounded-lg bg-[#f0f4ff] px-3 py-2">
              <SkeletonBlock className="h-2 w-20" />
              <SkeletonBlock className="mt-2 h-2.5 w-40" />
            </div>
          </div>
          <div className="flex flex-col rounded-lg border border-slate-200/80 bg-[#f8fafd] p-3 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <SkeletonBlock className="h-2.5 w-24" />
              <SkeletonBlock className="h-2 w-12" />
            </div>
            <div className="my-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <SkeletonBlock className="h-7 w-7 rounded" />
              <SkeletonBlock className="h-2.5 w-36" />
            </div>
            <SkeletonBlock className="mt-auto h-8 w-full rounded-lg" />
          </div>
        </div>
      </SkeletonPanel>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <SkeletonBlock className="h-3.5 w-60" />
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-9 w-36 rounded-lg" />
            <SkeletonBlock className="h-[var(--field-height)] w-full sm:w-56" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[57.5rem]">
            <SkeletonTableRows columns={5} rows={5} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#f0f4ff] px-3 py-2">
          <SkeletonBlock className="h-2.5 w-64" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-6" />
            <SkeletonBlock className="h-6 w-6" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
