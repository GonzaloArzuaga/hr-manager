import React from "react";
import {
  SkeletonBlock,
  SkeletonMetricCards,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
} from "../shared";

export default function DashboardAdminSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />
      <SkeletonMetricCards count={5} className="xl:grid-cols-5" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonPanel className="lg:col-span-2">
          <SkeletonBlock className="h-3.5 w-44" />
          <SkeletonBlock className="mt-1.5 h-2.5 w-52" />
          <SkeletonBlock className="mt-4 h-64 w-full" />
        </SkeletonPanel>
        <SkeletonPanel>
          <SkeletonBlock className="h-3.5 w-40" />
          <SkeletonBlock className="mt-1.5 h-2.5 w-44" />
          <SkeletonBlock className="mt-4 h-64 w-full" />
        </SkeletonPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <SkeletonPanel key={panel}>
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-3.5 w-44" />
                <SkeletonBlock className="h-2.5 w-52" />
              </div>
              {panel === 0 && <SkeletonBlock className="h-2.5 w-16" />}
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }, (_, row) => (
                <div className="flex items-center justify-between gap-3 py-3" key={row}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-2.5 w-2/3" />
                    <SkeletonBlock className="h-2 w-1/2" />
                  </div>
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonPanel>
        ))}
      </div>
    </SkeletonPage>
  );
}
