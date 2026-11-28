import React, { useEffect, useMemo, useState } from "react";
import EmployeeIdentity from "../../EmployeeIdentity";
import { fetchDaysOffBacklog } from "../../../lib/api";
import { employeeDirectory } from "../../../data/employeeDirectory";
import { toDisplayDate } from "../../../lib/format";

// Francos adeudados: los que corresponden por las semanas completas
// transcurridas desde el ingreso de cada empleado y todavía no se otorgaron.
// A diferencia del cupo mensual, esto no se reinicia a fin de mes.
//
// El artículo 207 de la Ley 20.744 le da una ventana al descanso que no se
// otorgó: puede reclamarse durante la semana subsiguiente y se paga con el
// 100 % de recargo. Por eso el acumulado se muestra separado en reclamable y
// vencido: lo reclamable es lo que todavía se puede otorgar en término.

function Figure({ label, value, tone = "text-slate-900", note }) {
  return (
    <div>
      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-extrabold leading-tight tracking-tight ${tone}`}>{value}</p>
      {note && <p className="text-[0.5625rem] text-slate-500">{note}</p>}
    </div>
  );
}

export default function FrancosBacklogCard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetchDaysOffBacklog()
      .then((data) => {
        if (vigente) setRows(data ?? []);
      })
      .catch((problema) => {
        if (vigente) setError(problema.message);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const resumen = useMemo(() => {
    if (!rows) return null;
    const porEmpleado = rows
      .map((row) => {
        const employee = employeeDirectory.find((entry) => entry.dbId === row.employee_id);
        return { ...row, employee };
      })
      .filter((row) => row.employee)
      .sort((a, b) => b.claimable_days - a.claimable_days || b.expired_days - a.expired_days);
    const sumar = (clave) => porEmpleado.reduce((total, row) => total + (row[clave] ?? 0), 0);
    return {
      filas: porEmpleado,
      corresponden: sumar("expected_days"),
      otorgados: sumar("taken_days"),
      reclamables: sumar("claimable_days"),
      vencidos: sumar("expired_days"),
      // owed_days ya respeta la caducidad que configuró la organización.
      conDeuda: porEmpleado.filter((row) => row.owed_days > 0).length,
      desde: porEmpleado.reduce(
        (menor, row) => (!menor || row.computed_from < menor ? row.computed_from : menor),
        null,
      ),
    };
  }, [rows]);

  return (
    <section
      aria-label="Francos adeudados"
      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
      data-testid="francos-backlog"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Francos adeudados
          </h2>
          <p className="mt-0.5 text-[0.5625rem] leading-relaxed text-slate-500">
            Acumulado desde el ingreso de cada empleado, por las semanas ya
            terminadas. No se reinicia a fin de mes.
            {resumen?.desde && ` El cómputo más antiguo arranca el ${toDisplayDate(resumen.desde)}.`}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[0.625rem] text-red-700" role="status">
          {error}
        </p>
      )}

      {!rows && !error && (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-100" />
      )}

      {resumen && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Corresponden" note="desde el ingreso" value={resumen.corresponden} />
            <Figure label="Otorgados" tone="text-emerald-700" value={resumen.otorgados} />
            <Figure
              label="Reclamables"
              note="todavía en término"
              tone={resumen.reclamables ? "text-red-700" : "text-slate-400"}
              value={resumen.reclamables}
            />
            <Figure
              label="Vencidos"
              note="fuera del plazo del art. 207"
              tone={resumen.vencidos ? "text-amber-600" : "text-slate-400"}
              value={resumen.vencidos}
            />
          </div>
          {resumen.reclamables > 0 && (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[0.5625rem] leading-relaxed text-red-800">
              Hay {resumen.reclamables}{" "}
              {resumen.reclamables === 1 ? "franco reclamable" : "francos reclamables"} en{" "}
              {resumen.conDeuda} {resumen.conDeuda === 1 ? "empleado" : "empleados"}. Si no se
              otorgan en término, el empleado puede tomarlos avisando con 24 horas y el día se
              paga con el 100 % de recargo.
            </p>
          )}

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
                      <th className="text-center">Desde</th>
                      <th className="text-center">Semanas</th>
                      <th className="text-center">Corresponden</th>
                      <th className="text-center">Otorgados</th>
                      <th className="text-center">Reclamables</th>
                      <th className="text-center">Vencidos</th>
                      <th className="text-center">Vencen el</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.filas.map((row) => (
                      <tr key={row.employee_id}>
                        <td>
                          <EmployeeIdentity
                            avatarStyle={row.employee.avatarStyle}
                            employeeId={row.employee.id}
                            name={row.employee.name}
                          />
                        </td>
                        <td className="text-center text-slate-500">{toDisplayDate(row.computed_from)}</td>
                        <td className="text-center">{row.weeks_elapsed}</td>
                        <td className="text-center">{row.expected_days}</td>
                        <td className="text-center text-emerald-700">{row.taken_days}</td>
                        <td
                          className={`text-center font-bold ${row.claimable_days ? "text-red-700" : "text-slate-400"}`}
                        >
                          {row.claimable_days}
                        </td>
                        <td
                          className={`text-center ${row.expired_days ? "text-amber-600" : "text-slate-400"}`}
                        >
                          {row.expired_days}
                        </td>
                        <td className="text-center text-slate-500">
                          {row.claim_deadline ? toDisplayDate(row.claim_deadline) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
