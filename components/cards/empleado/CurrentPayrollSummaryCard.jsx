import React from "react";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export default function CurrentPayrollSummaryCard({
  period,
  status,
  amount,
  paymentDate,
  receiptId,
  receiptName,
  pending,
  onViewReceipt,
}) {
  return (
    <section
      aria-label="Resumen del período actual"
      className="overflow-hidden rounded-xl border border-slate-200/80 border-t-4 border-t-blue-700 bg-white p-4 shadow-sm md:p-5"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between lg:col-span-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="block text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-400">
                  Período en curso
                </span>
                <h2 className="text-base font-bold text-slate-900">{period}</h2>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.5625rem] font-semibold ${
                  pending
                    ? "border-amber-100 bg-amber-50 text-amber-800"
                    : "border-blue-100 bg-blue-50 text-blue-700"
                }`}
              >
                <span
                  className={`mr-2 h-1.5 w-1.5 rounded-full ${
                    pending ? "bg-amber-500" : "bg-blue-600"
                  }`}
                />
                {status}
              </span>
            </div>

            <div className="inline-block rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-[0.5625rem] font-bold uppercase tracking-wide text-blue-700">
                {pending ? "Monto liquidado" : "Neto cobrado"}
              </p>
              <p className="mt-1 text-xl font-extrabold text-blue-800">
                {pending ? "$ -" : `$ ${amount}`}
                {!pending && (
                  <span className="ml-1.5 text-[0.5625rem] font-medium text-slate-500">
                    ARS
                  </span>
                )}
              </p>
            </div>

            <div className="mt-3 rounded-lg bg-[#f0f4ff] px-3 py-2 text-[0.5625rem]">
              <p className="text-slate-500">Fecha de pago</p>
              <p className="font-bold text-slate-800">{paymentDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-lg border border-slate-200/80 bg-[#f8fafd] p-3 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2 text-[0.5625rem]">
            <span className="font-bold uppercase tracking-wider text-slate-500">
              Recibo oficial
            </span>
            <span className="font-mono text-slate-400">{receiptId}</span>
          </div>
          <div className="my-3 flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-100 text-[0.5625rem] font-bold text-red-600">
              PDF
            </span>
            <span className="truncate text-[0.5625rem] font-medium text-slate-700">
              {pending ? "Recibo pendiente de acreditación" : receiptName}
            </span>
          </div>
          <button
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[0.625rem] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            onClick={onViewReceipt}
            type="button"
          >
            <Icon className="h-4 w-4 text-slate-600">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.257-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </Icon>
            {pending ? "Recibo pendiente" : "Visualizar recibo"}
          </button>
        </div>
      </div>
    </section>
  );
}
