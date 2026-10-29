import React from "react";

export default function MissingPayrollsCard({ pendingCount, departmentsPending, legalDueDate }) {
  return (
    <article className="flex min-h-[7rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-semibold text-slate-500">Sueldos Faltantes</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 8v4l2.5 2.5M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      </div>
      <div>
        <div className="mb-1 flex items-baseline gap-1.5">
          <strong className="text-xl font-bold text-amber-700">{pendingCount}</strong>
          <span className="text-[0.5625rem] text-amber-700">por liquidar</span>
        </div>
        <div className="truncate rounded bg-amber-50 px-2 py-1 text-[0.5rem] font-medium text-amber-800">
          {departmentsPending}
        </div>
        <p className="mt-1.5 text-[0.5rem] text-slate-500">Vencimiento legal: {legalDueDate}</p>
      </div>
    </article>
  );
}
