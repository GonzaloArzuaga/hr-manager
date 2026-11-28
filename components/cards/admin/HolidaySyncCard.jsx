import React, { useEffect, useState } from "react";
import { fetchHolidaySyncStatus, syncHolidays } from "../../../lib/api";
import { toDisplayDate } from "../../../lib/format";

// Calendario de feriados nacionales. Se trae de una API pública, de modo que
// un feriado nuevo o movido por decreto queda reflejado sin tocar el sistema.
//
// El calendario lo usan los calendarios de francos y vacaciones para marcar
// las fechas, y el cálculo de los días hábiles del artículo 151 de la Ley
// 20.744 para descontarlos.

function añosSugeridos() {
  const actual = new Date().getFullYear();
  return [actual, actual + 1];
}

export default function HolidaySyncCard() {
  const [estado, setEstado] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [sincronizando, setSincronizando] = useState(null);

  async function cargar() {
    try {
      setEstado(await fetchHolidaySyncStatus());
    } catch (problema) {
      setError(problema.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function sincronizar(year) {
    setSincronizando(year);
    setMensaje("");
    setError("");
    try {
      const resultado = await syncHolidays(year);
      setMensaje(`Se cargaron ${resultado.total} feriados de ${resultado.year}.`);
      await cargar();
    } catch (problema) {
      setError(problema.message);
    } finally {
      setSincronizando(null);
    }
  }

  const porAño = new Map((estado ?? []).map((fila) => [fila.year, fila]));

  return (
    <section
      aria-label="Calendario de feriados"
      className="flex flex-col rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 className="text-sm font-bold tracking-tight text-slate-900">
        Calendario de feriados nacionales
      </h2>
      <p className="mt-1 text-[0.625rem] leading-relaxed text-slate-500">
        Se sincroniza desde un servicio público que sigue el calendario oficial
        de la Jefatura de Gabinete. Conviene actualizarlo cuando se publica el
        calendario del año siguiente o cuando se agrega un feriado por decreto.
      </p>

      <div className="mt-4 space-y-2">
        {añosSugeridos().map((year) => {
          const fila = porAño.get(year);
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              key={year}
            >
              <div>
                <p className="text-[0.6875rem] font-bold text-slate-800">{year}</p>
                <p className="text-[0.5625rem] text-slate-500">
                  {fila
                    ? `${fila.total} feriados · última sincronización ${
                        fila.last_sync ? toDisplayDate(fila.last_sync.slice(0, 10)) : "manual"
                      }`
                    : "Sin cargar"}
                </p>
              </div>
              <button
                aria-busy={sincronizando === year}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[0.5625rem] font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60"
                disabled={sincronizando !== null}
                onClick={() => sincronizar(year)}
                type="button"
              >
                {sincronizando === year && (
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
                  />
                )}
                {fila ? "Actualizar" : "Cargar"}
              </button>
            </div>
          );
        })}
      </div>

      {mensaje && (
        <p className="mt-3 text-[0.625rem] font-medium text-emerald-700" role="status">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="mt-3 text-[0.625rem] leading-relaxed text-red-700" role="status">
          {error}
        </p>
      )}

      {estado && estado.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[0.5625rem] text-slate-500">
          Años cargados: {estado.map((fila) => fila.year).join(", ")}.
        </p>
      )}
    </section>
  );
}
