import React from "react";

function BreakIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

export default function BreakScheduleCard() {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pausa reglamentaria</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">45</span>
            <span className="text-sm font-bold text-slate-600">minutos diarios</span>
          </div>
        </div>
        <div aria-hidden="true" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-700">
          <BreakIcon />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-700">
        <span>Franja: 13:00 - 14:15 hs</span>
        <span className="inline-flex items-center text-blue-700">
          <span className="mr-1.5 h-2 w-2 rounded-full bg-blue-600" />
          Comedor Planta 1
        </span>
      </div>
    </article>
  );
}
