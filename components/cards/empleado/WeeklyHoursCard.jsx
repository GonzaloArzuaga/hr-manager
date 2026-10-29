import React from "react";

export default function WeeklyHoursCard() {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Horas a cumplir</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">40</span>
            <span className="text-sm font-bold text-slate-600">horas semanales</span>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Registradas: 32 hrs</span>
          <span className="text-blue-800">8 hrs restantes (80%)</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div aria-valuemax="100" aria-valuemin="0" aria-valuenow="80" className="h-3 rounded-full bg-blue-600 transition-all duration-300" role="progressbar" style={{ width: "80%" }} />
        </div>
      </div>
    </article>
  );
}
