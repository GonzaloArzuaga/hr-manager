import React from "react";

export default function SignedReceiptsCard({ receiptCount, settledCount }) {
  return (
    <article className="flex min-h-[7rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-semibold text-slate-500">Recibos en PDF</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m5 0a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      </div>
      <div>
        <div className="mb-1 flex items-baseline gap-1.5">
          <strong className="text-xl font-bold text-slate-900">{receiptCount}</strong>
          <span className="text-[0.5625rem] text-slate-500">/ {settledCount} liquidados</span>
        </div>
        <div className="rounded bg-emerald-50 px-2 py-1 text-[0.5rem] font-medium text-emerald-800">
          <span aria-hidden="true">▧ </span>Guardados en espacio privado
        </div>
        <p className="mt-1.5 text-[0.5rem] text-slate-500">
          {Math.max(0, settledCount - receiptCount)} pagos sin recibo adjunto
        </p>
      </div>
    </article>
  );
}
