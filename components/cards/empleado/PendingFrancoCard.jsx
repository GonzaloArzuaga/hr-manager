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
      <path d="M8 4h8v16H5V7l3-3zm0 0v4H5m3 4h5m-5 4h5" />
    </svg>
  );
}

export default function PendingFrancoCard({ pendingCount }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="mb-1 text-[0.625rem] font-medium text-slate-500">
            Solicitudes de Francos en Evaluación
          </p>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl font-extrabold leading-none text-slate-900">
              {pendingCount}
            </strong>
            <span className="text-[0.625rem] font-medium text-slate-500">
              {pendingCount === 1 ? "solicitud" : "solicitudes"}
            </span>
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[0.5625rem]">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          En evaluación por RRHH
        </span>
        <a className="font-semibold text-blue-600 hover:text-blue-700" href="#historial">
          Ver estado
        </a>
      </div>
    </article>
  );
}
