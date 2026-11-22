import React from "react";
import {
  SkeletonBlock,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonTableRows,
} from "../shared";

export default function HorariosEmployeeSkeleton() {
  return (
    <SkeletonPage>
      <div className="mb-4">
        <SkeletonPageHeader />
      </div>

      <SkeletonPanel className="mb-8 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2.5">
            <SkeletonBlock className="h-6 w-2.5 rounded-full" />
            <SkeletonBlock className="h-3.5 w-40" />
          </div>
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
        <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-2.5 w-28" />
            <SkeletonBlock className="h-5 w-24 rounded" />
          </div>
          <SkeletonBlock className="mt-3 h-8 w-56" />
          <SkeletonBlock className="mt-2 h-3 w-64" />
        </div>

        <div className="my-6 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-3 w-56" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex snap-x gap-2 overflow-hidden md:grid md:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonPanel className="min-h-[7.875rem] min-w-[9.5rem] p-2.5 md:min-w-0" key={index}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <SkeletonBlock className="h-2.5 w-10" />
                <SkeletonBlock className="h-4 w-12 rounded" />
              </div>
              <SkeletonBlock className="mt-3 h-4 w-20" />
              <SkeletonBlock className="mt-2 h-2.5 w-24" />
            </SkeletonPanel>
          ))}
        </div>
      </SkeletonPanel>

      <SkeletonPanel className="mb-8">
        <SkeletonBlock className="h-2.5 w-40" />
        <SkeletonBlock className="mt-2 h-8 w-20" />
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-2.5 w-32" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
          <SkeletonBlock className="mt-2 h-3 w-full rounded-full" />
        </div>
      </SkeletonPanel>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <SkeletonBlock className="h-3.5 w-40" />
          <SkeletonBlock className="h-[var(--field-height)] w-full sm:w-56" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[37.5rem]">
            <SkeletonTableRows columns={3} rows={5} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-2">
          <SkeletonBlock className="h-2.5 w-56" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-6" />
            <SkeletonBlock className="h-6 w-6" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  );
}
