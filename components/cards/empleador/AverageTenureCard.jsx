import React from "react";

function getTenureInMonths(tenureLabel) {
  const years = Number(tenureLabel.match(/(\d+)\s*año/)?.[1] ?? 0);
  const months = Number(tenureLabel.match(/(\d+)\s*mes/)?.[1] ?? 0);
  return years * 12 + months;
}

export default function AverageTenureCard({ employees }) {
  const averageTenureYears = employees.length === 0
    ? 0
    : employees.reduce(
        (total, employee) => total + getTenureInMonths(employee.tenureLabel),
        0,
      ) / employees.length / 12;

  return (
    <article className="flex min-h-[5.75rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-bold tracking-wide text-slate-600">ANTIGÜEDAD PROMEDIO</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 101.8-5.4L3 9m0-6v6h6m3-1v5l3 2" />
        </svg>
      </div>
      <div className="flex items-baseline gap-1.5">
        <strong className="text-2xl font-extrabold tracking-tight text-slate-900">{averageTenureYears.toFixed(1)}</strong>
        <span className="text-[0.625rem] font-medium text-slate-600">años</span>
      </div>
      <p className="text-[0.5rem] text-slate-500">Antigüedad promedio de la empresa</p>
    </article>
  );
}
