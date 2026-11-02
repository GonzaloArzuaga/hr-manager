import React from "react";

export default function NetPayrollCard({ amount, previousMonthChange }) {
  return (
    <article className="flex min-h-[7rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-semibold text-slate-500">Masa Salarial Neta</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 8c-1.5 0-2.5.7-2.5 1.8S10.5 11.5 12 12s2.5 1.1 2.5 2.2S13.5 16 12 16m0-10v12m8-6a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      </div>
      <div>
        <strong className="text-lg font-bold text-slate-900">$ {amount}</strong>
        <div className="mt-1 inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[0.5rem] font-semibold text-emerald-700">
          ↗ {previousMonthChange}% vs mes anterior
        </div>
        <p className="mt-1 text-[0.5rem] text-slate-500">Total neto de los pagos registrados en el período</p>
      </div>
    </article>
  );
}
