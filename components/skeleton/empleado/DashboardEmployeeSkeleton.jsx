import React from "react";
import { SkeletonBlock, SkeletonPanel } from "../shared";

export default function DashboardEmployeeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando el panel personal"
      className="px-5 py-6 sm:px-8 lg:px-10"
      role="status"
    >
      <div className="mx-auto max-w-[96.875rem] space-y-6">
        <header className="space-y-2">
          <SkeletonBlock className="h-8 w-64 sm:h-9" />
          <SkeletonBlock className="h-3.5 w-80" />
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <SkeletonPanel className="min-h-36" key={card}>
              <SkeletonBlock className="h-2.5 w-28" />
              <SkeletonBlock className="mt-4 h-7 w-24" />
              <SkeletonBlock className="mt-3 h-2.5 w-36" />
              <SkeletonBlock className="mt-4 h-2 w-2/3" />
            </SkeletonPanel>
          ))}
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          <SkeletonPanel className="overflow-hidden p-0 xl:col-span-2">
            <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <SkeletonBlock className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3.5 w-24" />
                    <SkeletonBlock className="h-2.5 w-40" />
                  </div>
                </div>
                <SkeletonBlock className="h-6 w-32 rounded-full" />
              </div>
            </div>
            <div className="space-y-2.5 p-4 sm:p-5">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3" key={index}>
                  <div className="flex min-w-0 items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="space-y-2">
                      <SkeletonBlock className="h-2.5 w-20" />
                      <SkeletonBlock className="h-2 w-28" />
                    </div>
                  </div>
                  <SkeletonBlock className="h-2.5 w-16" />
                </div>
              ))}
            </div>
          </SkeletonPanel>

          <SkeletonPanel className="overflow-hidden p-0">
            <div className="flex items-center justify-between bg-[#0f3e83] p-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-2 w-20" />
                <SkeletonBlock className="h-4 w-36" />
              </div>
              <SkeletonBlock className="h-9 w-9 rounded-full" />
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-lg bg-[#f0f4ff] p-3">
                <SkeletonBlock className="h-2 w-24" />
                <SkeletonBlock className="mt-2 h-5 w-40" />
                <SkeletonBlock className="mt-2 h-2 w-32" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <SkeletonBlock className="h-2.5 w-24" />
                  <SkeletonBlock className="h-2.5 w-28" />
                </div>
                <div className="flex justify-between gap-3">
                  <SkeletonBlock className="h-2.5 w-28" />
                  <SkeletonBlock className="h-2.5 w-24" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <SkeletonBlock className="h-2 w-32" />
                <SkeletonBlock className="mt-3 h-8 w-full rounded-lg" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <SkeletonBlock className="h-8 w-full rounded-lg" />
                  <SkeletonBlock className="h-8 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </SkeletonPanel>
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
