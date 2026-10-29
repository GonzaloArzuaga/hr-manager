import React from "react";

export default function VacationAvailableBalanceCard({ value, period }) {
  return (
    <article className="flex min-h-32 flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <span className="text-[0.625rem] font-medium text-slate-500">
        Saldo Total Disponible
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <strong className="text-2xl font-extrabold text-slate-900">{value}</strong>
        <span className="text-sm font-bold text-blue-600">días</span>
      </div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">
        Saldo restante del ciclo {period}
      </p>
    </article>
  );
}
