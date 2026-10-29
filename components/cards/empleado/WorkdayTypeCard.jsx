import React from "react";

export default function WorkdayTypeCard({ department }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de jornada</span>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Jornada Regular</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
        <span className="inline-flex items-center text-slate-700">
          Convenio CCT 40/89 ({department})
        </span>
        <span className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-slate-800">
          Turno fijo
        </span>
      </div>
    </article>
  );
}
