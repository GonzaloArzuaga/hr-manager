import React from "react";

function Icon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export default function RequestedFrancoCard({ requestedDays, allowance, monthLabel }) {
  const usagePercent = Math.min(
    100,
    allowance === 0 ? 0 : Math.round((requestedDays / allowance) * 100),
  );

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="mb-1 text-[0.625rem] font-medium text-slate-500">
            Francos solicitados en este período
          </p>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl font-extrabold leading-none text-slate-900">
              {requestedDays}
            </strong>
            <span className="text-[0.625rem] font-medium text-slate-500">
              de {allowance} del cupo
            </span>
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon />
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[0.5625rem] font-medium text-slate-500">
          <span>{requestedDays} días solicitados en {monthLabel}</span>
          <span className="font-semibold text-blue-600">{usagePercent}% del cupo</span>
        </div>
      </div>
    </article>
  );
}
