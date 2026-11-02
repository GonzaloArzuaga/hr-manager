import React from "react";

export default function ActiveStaffingCard({ employees }) {
  const activeEmployees = employees.filter((employee) => employee.status === "Activo").length;
  const employeesOnLeave = employees.filter((employee) => employee.status === "En Licencia").length;

  return (
    <article className="flex min-h-[5.75rem] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[0.5625rem] font-bold tracking-wide text-slate-600">DOTACIÓN ACTIVA</h2>
        <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M14 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <div className="flex items-baseline gap-2">
        <strong className="text-2xl font-extrabold tracking-tight text-slate-900">{employees.length}</strong>
        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.5rem] font-semibold text-emerald-700">
          {activeEmployees} activos
        </span>
      </div>
      <p className="text-[0.5rem] text-slate-500">{employeesOnLeave} en licencia</p>
    </article>
  );
}
