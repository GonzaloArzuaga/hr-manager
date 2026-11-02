import React from "react";

export default function NextDayOffCard({
  used,
  allowance,
  nextLabel = "Sin francos próximos",
  badge = "—",
  detail = "",
}) {
  const progress = Math.min(
    100,
    allowance === 0 ? 0 : (used / allowance) * 100,
  );

  return (
    <article className="flex min-h-[8.875rem] flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">
            Próximo franco asignado
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5rem] font-semibold text-blue-700">
            {badge}
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{nextLabel}</h2>
      </div>
      <div className="rounded-lg bg-[#f3f6ff] p-2.5">
        <div className="mb-1 flex justify-between text-[0.5625rem] text-slate-600">
          <span>Francos gozados este mes:</span>
          <span className="font-bold text-slate-800">{used} de {allowance}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[0.5rem]">
          <span className="text-slate-500">{detail}</span>
        </div>
      </div>
    </article>
  );
}
