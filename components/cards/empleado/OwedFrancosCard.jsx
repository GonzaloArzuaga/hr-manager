import React, { useEffect, useState } from "react";
import { fetchEmployeeDaysOffBacklog } from "../../../lib/api";
import { store } from "../../../lib/store";
import { toDisplayDate } from "../../../lib/format";

// Francos que le corresponden al empleado por las semanas completas
// transcurridas desde su ingreso y todavía no le fueron otorgados.
//
// Se muestran los que todavía puede reclamar en término. El artículo 207 de
// la Ley 20.744 le da una ventana para tomarlos avisando con 24 horas, y ese
// día se paga con el 100 % de recargo.

export default function OwedFrancosCard() {
  const [dato, setDato] = useState(null);
  const [error, setError] = useState("");
  const employeeId = store.account?.employee_id;

  useEffect(() => {
    if (!employeeId) return undefined;
    let vigente = true;
    fetchEmployeeDaysOffBacklog(employeeId)
      .then((fila) => {
        if (vigente) setDato(fila);
      })
      .catch((problema) => {
        if (vigente) setError(problema.message);
      });
    return () => {
      vigente = false;
    };
  }, [employeeId]);

  if (error) return null;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="mb-1 text-[0.625rem] font-medium text-slate-500">
            Francos adeudados
          </p>
          <div className="flex items-baseline gap-2">
            {dato ? (
              <>
                <strong
                  className={`text-2xl font-extrabold leading-none ${
                    dato.claimable_days ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {dato.claimable_days}
                </strong>
                <span className="text-[0.625rem] font-medium text-slate-500">
                  {dato.claimable_days === 1 ? "día a favor" : "días a favor"}
                </span>
              </>
            ) : (
              <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" />
            )}
          </div>
        </div>
      </div>
      {dato && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-[0.5625rem] leading-relaxed text-slate-600">
          Desde el {toDisplayDate(dato.computed_from)} pasaron{" "}
          {dato.weeks_elapsed} {dato.weeks_elapsed === 1 ? "semana" : "semanas"}:
          te corresponden {dato.expected_days} y ya tomaste {dato.taken_days}.
          {dato.claimable_days > 0 ? (
            <>
              {" "}
              {dato.claim_deadline
                ? `Podés reclamarlos hasta el ${toDisplayDate(dato.claim_deadline)}.`
                : "Podés reclamarlos."}{" "}
              Si no te los otorgan, la ley te permite tomarlos avisando con 24 horas y
              ese día se paga con el 100 % de recargo.
            </>
          ) : (
            " Estás al día."
          )}
          {dato.expired_days > 0 && (
            <>
              {" "}
              Hay {dato.expired_days} que quedaron fuera del plazo para reclamarlos.
            </>
          )}
        </div>
      )}
    </article>
  );
}
