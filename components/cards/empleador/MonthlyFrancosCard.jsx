import React, { useMemo, useState } from "react";
import EmployeeIdentity from "../../EmployeeIdentity";
import { getMonthlyFrancoAllowance } from "../../../data/businessRules";
import { MonthField, formatMonthLabel, todayKey } from "../../DateTimeFields";

// Francos que les corresponden a los empleados en un mes (pedido del cliente):
// cuántos corresponden según la regla de la empresa, cuántos ya están aprobados o
// pendientes y cuántos faltan asignar. Se puede consultar el mes actual o los siguientes.

function datesOf(request) {
  return request.requestedDates ?? [request.requestedDate];
}

export function monthlyFrancoSummary({ employees, requests, weeklyDaysOff, month }) {
  const perEmployee = getMonthlyFrancoAllowance(weeklyDaysOff, month);
  const rows = employees
    .filter((employee) => employee.status === "Activo")
    .map((employee) => {
      const inMonth = (status) =>
        requests
          .filter((request) => request.employeeId === employee.id && request.status === status)
          .reduce((total, request) => total + datesOf(request).filter((date) => date?.startsWith(`${month}-`)).length, 0);
      const approved = inMonth("Aceptado");
      const pending = inMonth("Pendiente de revisión");
      return { employee, allowance: perEmployee, approved, pending, remaining: Math.max(0, perEmployee - approved - pending) };
    });
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  return { perEmployee, rows, total: sum("allowance"), approved: sum("approved"), pending: sum("pending"), remaining: sum("remaining") };
}

function Figure({ label, value, tone = "text-slate-900", note }) {
  return (
    <div>
      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-extrabold leading-tight tracking-tight ${tone}`}>{value}</p>
      {note && <p className="text-[0.5625rem] text-slate-500">{note}</p>}
    </div>
  );
}

export default function MonthlyFrancosCard({ employees, requests, weeklyDaysOff, compact = false, href }) {
  const currentMonth = todayKey().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [showDetail, setShowDetail] = useState(false);
  const summary = useMemo(
    () => monthlyFrancoSummary({ employees, requests, weeklyDaysOff, month }),
    [employees, requests, weeklyDaysOff, month],
  );

  return (
    <section aria-label="Francos del mes" className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm" data-testid="monthly-francos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Francos que corresponden en {formatMonthLabel(month)}</h2>
          <p className="mt-0.5 text-[0.5625rem] text-slate-500">
            {summary.perEmployee} por empleado ({weeklyDaysOff} por semana) · {summary.rows.length} empleados activos
          </p>
        </div>
        {compact ? (
          href && (
            <a className="text-[0.5625rem] font-semibold text-blue-700 hover:underline" href={href}>
              Ver por empleado y meses siguientes
            </a>
          )
        ) : (
          <div className="w-44">
            <MonthField
              aria-label="Mes a consultar"
              min={currentMonth}
              onChange={(event) => setMonth(event.target.value)}
              required
              value={month}
            />
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Corresponden" note="entre todos los empleados" value={summary.total} />
        <Figure label="Aprobados" tone="text-emerald-700" value={summary.approved} />
        <Figure label="Pendientes" tone="text-amber-600" note="esperando aprobación" value={summary.pending} />
        <Figure label="Faltan asignar" tone="text-blue-800" value={summary.remaining} />
      </div>

      {!compact && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            aria-expanded={showDetail}
            className="text-[0.5625rem] font-semibold text-blue-700 hover:underline"
            onClick={() => setShowDetail(!showDetail)}
            type="button"
          >
            {showDetail ? "Ocultar el detalle por empleado" : "Ver el detalle por empleado"}
          </button>
          {showDetail && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-100">
              <table className="hr-data-table w-full">
                <thead className="sticky top-0">
                  <tr>
                    <th>Empleado</th>
                    <th className="text-center">Corresponden</th>
                    <th className="text-center">Aprobados</th>
                    <th className="text-center">Pendientes</th>
                    <th className="text-center">Faltan</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.employee.id}>
                      <td>
                        <EmployeeIdentity avatarStyle={row.employee.avatarStyle} employeeId={row.employee.id} name={row.employee.name} />
                      </td>
                      <td className="text-center">{row.allowance}</td>
                      <td className="text-center text-emerald-700">{row.approved}</td>
                      <td className="text-center text-amber-600">{row.pending}</td>
                      <td className={`text-center font-bold ${row.remaining ? "text-blue-800" : "text-slate-400"}`}>{row.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
