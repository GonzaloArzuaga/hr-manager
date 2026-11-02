import React from "react";

export default function SettledPayrollsCard({
  settledCount,
  employeeCount,
  progress,
  pendingCount,
}) {
  return (
    <article className="flex min-h-[7rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-semibold text-slate-500">Sueldos Liquidados</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m5 0a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      </div>
      <div>
        <div className="mb-1 flex items-baseline gap-1.5">
          <strong className="text-xl font-bold text-slate-900">{settledCount}</strong>
          <span className="text-[0.5625rem] text-slate-500">/ {employeeCount} empleados</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-800" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[0.5rem]">
          <span className="font-semibold text-blue-800">{progress}% completado</span>
          <span className="text-slate-500">{pendingCount} pendientes</span>
        </div>
      </div>
    </article>
  );
}
