import React from "react";

export default function LatestPayrollDashboardCard({
  status,
  amount,
  period,
  detail,
  pending,
}) {
  return (
    <article
      className="flex min-h-[8.875rem] flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
      id="sueldos"
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">
            Última liquidación ({period})
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5rem] font-semibold text-blue-700">
            {status}
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {amount}
          {!pending && (
            <span className="ml-1 text-[0.5625rem] font-normal text-slate-500">Neto</span>
          )}
        </h2>
      </div>
      <div className="rounded-lg bg-[#f3f6ff] p-2.5 text-[0.5625rem] text-slate-500">
        <p>{detail}</p>
      </div>
    </article>
  );
}
