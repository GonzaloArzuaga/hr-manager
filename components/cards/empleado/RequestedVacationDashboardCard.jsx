import React from "react";

export default function RequestedVacationDashboardCard({
  requestedDays,
  remainingDays,
  entitlement,
  rangeLabel = "Sin solicitudes",
  statusLabel = "Sin pedidos",
}) {
  return (
    <article
      className="flex min-h-[8.875rem] flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
      id="vacaciones"
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">
            Vacaciones solicitadas
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5rem] font-semibold text-blue-700">
            {statusLabel}
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{rangeLabel}</h2>
      </div>
      <div className="rounded-lg bg-[#f3f6ff] p-2.5">
        <div className="flex justify-between text-[0.5625rem]">
          <span className="text-slate-600">{requestedDays} días solicitados</span>
          <span className="font-bold text-blue-800">{remainingDays} días restantes</span>
        </div>
        <div className="mt-2 flex justify-between gap-2 text-[0.5rem]">
          <span className="text-slate-500">
            Máximo por antigüedad: {entitlement} días
          </span>
          <a className="font-semibold text-blue-800" href="/employee/vacaciones">
            Ver detalle
          </a>
        </div>
      </div>
    </article>
  );
}
