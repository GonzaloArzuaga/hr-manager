import React, { useMemo, useState } from "react";
import { DateField } from "./DateTimeFields";
import { removeCompanyHoliday, saveCompanyHoliday } from "../lib/api";
import { store } from "../lib/store";
import { toDisplayDate } from "../lib/format";
import { PlusIcon } from "./icons";

// Feriados que ve la organización: los nacionales, que administra el
// administrador del sistema y se sincronizan desde el calendario oficial, y
// los propios, que carga cada empresa para los feriados provinciales, los
// locales o los que fija su convenio.

const tipoLegible = {
  inamovible: "Inamovible",
  trasladable: "Trasladable",
  puente: "Puente turístico",
  no_laborable: "Día no laborable",
  local: "Propio de la empresa",
  otro: "Feriado",
};

export default function CompanyHolidays({ disabled = false, onNotice }) {
  const [form, setForm] = useState({ date: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const feriados = useMemo(() => {
    return [...store.holidays.values()]
      .filter((feriado) => feriado.date.startsWith(String(year)))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [year, store.holidays]);

  const propios = feriados.filter((feriado) => feriado.isCompany).length;

  async function agregar(event) {
    event.preventDefault();
    if (!form.date || !form.name.trim()) {
      onNotice?.("Completá la fecha y el nombre del feriado.");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyHoliday({ date: form.date, name: form.name.trim() });
      setForm({ date: "", name: "" });
      onNotice?.("Se agregó el feriado.");
    } catch (problema) {
      onNotice?.(problema.message);
    } finally {
      setSaving(false);
    }
  }

  async function quitar(fecha) {
    setSaving(true);
    try {
      await removeCompanyHoliday(fecha);
      onNotice?.("Se quitó el feriado.");
    } catch (problema) {
      onNotice?.(problema.message);
    } finally {
      setSaving(false);
    }
  }

  const años = [new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Feriados</h3>
          <p className="mt-1 text-[0.625rem] leading-relaxed text-slate-500">
            Los feriados nacionales los mantiene actualizados el administrador
            del sistema desde el calendario oficial. Acá podés agregar los
            propios de tu provincia, tu localidad o tu convenio. Los feriados
            se marcan en los calendarios de francos y vacaciones, y se
            descuentan de los días hábiles con que se calculan las vacaciones.
          </p>
        </div>
        <div className="flex gap-1">
          {años.map((valor) => (
            <button
              className={`rounded-lg border px-3 py-1.5 text-[0.5625rem] font-bold transition ${
                valor === year
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              key={valor}
              onClick={() => setYear(valor)}
              type="button"
            >
              {valor}
            </button>
          ))}
        </div>
      </div>

      {feriados.length === 0 ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[0.625rem] leading-relaxed text-amber-900">
          Todavía no hay feriados cargados para {year}. Mientras no los haya, los
          calendarios no los marcan y el cálculo de los días hábiles los cuenta
          como días comunes. Pedile al administrador del sistema que sincronice
          el calendario.
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
          <table className="hr-data-table w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#edf4ff] text-[0.625rem] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2" scope="col">Fecha</th>
                <th className="px-4 py-2" scope="col">Feriado</th>
                <th className="px-4 py-2" scope="col">Tipo</th>
                <th className="px-4 py-2 text-right" scope="col">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feriados.map((feriado) => (
                <tr key={feriado.date}>
                  <td className="px-4 py-2 font-semibold text-slate-800">
                    {toDisplayDate(feriado.date)}
                  </td>
                  <td className="px-4 py-2">{feriado.name}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {tipoLegible[feriado.kind] ?? feriado.kind}
                    {!feriado.nonWorking && " · se puede trabajar"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {feriado.isCompany ? (
                      <button
                        className="text-[0.5625rem] font-semibold text-red-700 hover:underline disabled:opacity-60"
                        disabled={disabled || saving}
                        onClick={() => quitar(feriado.date)}
                        type="button"
                      >
                        Quitar
                      </button>
                    ) : (
                      <span className="text-[0.5rem] uppercase tracking-wide text-slate-400">
                        Nacional
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        onSubmit={agregar}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
              htmlFor="holiday-date"
            >
              Fecha
            </label>
            <DateField
              id="holiday-date"
              name="holidayDate"
              onChange={(event) => setForm((actual) => ({ ...actual, date: event.target.value }))}
              value={form.date}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
              htmlFor="holiday-name"
            >
              Nombre
            </label>
            <input
              className="h-9 w-56 rounded-md border border-slate-200 px-2.5 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="holiday-name"
              onChange={(event) => setForm((actual) => ({ ...actual, name: event.target.value }))}
              placeholder="Ej. Fiesta patronal"
              value={form.name}
            />
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900 disabled:opacity-60"
          disabled={disabled || saving}
          type="submit"
        >
          <PlusIcon />
          Agregar feriado propio
        </button>
      </form>
      {propios > 0 && (
        <p className="mt-2 text-[0.5625rem] text-slate-500">
          {propios} {propios === 1 ? "feriado propio" : "feriados propios"} en {year}.
        </p>
      )}
    </div>
  );
}
