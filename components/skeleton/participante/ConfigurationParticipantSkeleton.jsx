import React from "react";
import {
  SkeletonBlock,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonPanel,
} from "../shared";

function SkeletonSectionTitle({ width = "w-56" }) {
  return (
    <div aria-hidden="true" className="mb-3 flex items-center gap-2">
      <SkeletonBlock className="h-4 w-4 shrink-0" />
      <SkeletonBlock className={`h-3.5 ${width}`} />
    </div>
  );
}

function SkeletonField({ className = "" }) {
  return (
    <div className={className}>
      <SkeletonBlock className="h-2.5 w-32" />
      <SkeletonBlock className="mt-2 h-[var(--field-height)] w-full" />
    </div>
  );
}

function SkeletonTable({ columns, rows, minWidth }) {
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <div className="min-w-full" style={{ minWidth }}>
        <div
          aria-hidden="true"
          className="grid gap-3 bg-[#edf4ff] px-4 py-3"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }, (_, index) => (
            <SkeletonBlock className="h-2.5 w-16" key={index} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            aria-hidden="true"
            className="grid items-center gap-3 border-t border-slate-100 px-4 py-3"
            key={row}
            style={{ gridTemplateColumns }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <SkeletonBlock
                className={`h-2.5 ${column === 0 ? "w-3/4" : "w-2/3"}`}
                key={column}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesSkeleton() {
  return (
    <section aria-hidden="true">
      <SkeletonSectionTitle />
      <SkeletonPanel className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonField key={index} />
          ))}
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <SkeletonBlock className="h-2.5 w-40" />
          <SkeletonBlock className="h-2.5 w-72" />
          <SkeletonBlock className="h-2.5 w-64" />
          <SkeletonBlock className="mt-4 h-2.5 w-20" />
          <SkeletonBlock className="h-2.5 w-80" />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <SkeletonBlock className="h-7 w-36" />
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <SkeletonBlock className="h-3.5 w-64" />
            <SkeletonBlock className="mt-2 h-2.5 w-52" />
          </div>
          <SkeletonTable columns={5} rows={3} minWidth="38.75rem" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-3 gap-3 sm:flex">
              {Array.from({ length: 3 }, (_, index) => (
                <SkeletonField className="w-full sm:w-20" key={index} />
              ))}
            </div>
            <SkeletonBlock className="h-7 w-28" />
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-5">
          <SkeletonBlock className="h-3.5 w-36" />
          <SkeletonBlock className="h-2.5 w-80" />
          <SkeletonTable columns={4} rows={3} minWidth="40.625rem" />
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <SkeletonBlock className="h-3.5 w-44" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <SkeletonField key={index} />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <SkeletonBlock className="h-7 w-36" />
              <SkeletonBlock className="h-7 w-28" />
            </div>
          </div>
        </div>
      </SkeletonPanel>
    </section>
  );
}

function CompanyStructureSkeleton() {
  return (
    <section aria-hidden="true">
      <SkeletonSectionTitle width="w-48" />
      <SkeletonPanel>
        <SkeletonBlock className="mb-3 h-2.5 w-80" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="overflow-hidden rounded-lg border border-slate-200/80" key={index}>
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-2.5 w-12" />
              </div>
              <div className="space-y-3 px-3 py-3">
                {Array.from({ length: 3 }, (_, row) => (
                  <div className="flex items-center justify-between gap-2" key={row}>
                    <div className="space-y-1.5">
                      <SkeletonBlock className="h-2.5 w-24" />
                      <SkeletonBlock className="h-2 w-16" />
                    </div>
                    <SkeletonBlock className="h-2.5 w-16" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-2">
                <SkeletonBlock className="h-6 min-w-0 flex-1" />
                <SkeletonBlock className="h-6 w-14" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonPanel>
    </section>
  );
}

function UserConfigurationSkeleton() {
  return (
    <section aria-hidden="true">
      <SkeletonSectionTitle width="w-32" />
      <SkeletonPanel className="mb-6 flex flex-wrap items-center gap-4">
        <SkeletonBlock className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-[12rem] flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-2.5 w-full max-w-xl" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-7 w-24" />
        </div>
      </SkeletonPanel>
      <SkeletonPanel className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="mb-5 flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-3.5 w-32" />
          </div>
          <SkeletonField />
          <SkeletonBlock className="h-2.5 w-full" />
          <SkeletonBlock className="h-2.5 w-4/5" />
        </div>
        <div className="space-y-4">
          <div className="mb-5 flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-3.5 w-48" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonField key={index} />
          ))}
          <div className="flex gap-2 pt-1">
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <SkeletonBlock className="h-7 w-40" />
          </div>
        </div>
      </SkeletonPanel>
    </section>
  );
}

export default function ConfigurationParticipantSkeleton({ isEmployer = false }) {
  return (
    <SkeletonPage>
      <SkeletonPageHeader />
      <SkeletonBlock aria-hidden="true" className="-mt-3 h-2.5 w-64" />
      <div className="space-y-8">
        {isEmployer && (
          <>
            <RulesSkeleton />
            <CompanyStructureSkeleton />
          </>
        )}
        <UserConfigurationSkeleton />
      </div>
    </SkeletonPage>
  );
}
