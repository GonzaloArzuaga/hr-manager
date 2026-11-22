import React, { useEffect, useMemo, useRef } from "react";
import { useExclusiveOverlay } from "../lib/overlays";
import { fieldClass } from "./fieldStyles";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { ChevronIcon } from "./Select";

// Desplegable para elegir los días de franco: un campo que muestra el mes y los días
// elegidos y, al abrirlo, un calendario del mes. Lo usan el empleado (solicitud) y el
// empleador (asignación), así se ven y funcionan igual.

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function monthLabel(month) {
  const [year, number] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(year, number - 1, 1));
  return label.replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
}

export default function FrancoDatePicker({
  disabled = false,
  id,
  minMonth,
  minDate,
  month,
  onChangeMonth,
  onToggleDate,
  open,
  placeholder = "Seleccionar fechas",
  remaining,
  requestedDates,
  selectedDates,
  setOpen,
}) {
  const wrapperRef = useRef(null);
  const close = () => setOpen(false);
  useExclusiveOverlay(open, close);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => !wrapperRef.current?.contains(event.target) && close();
    const onKey = (event) => event.key === "Escape" && close();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const [year, number] = month.split("-").map(Number);
  const leading = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, number, 0).getDate();
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
    [month, daysInMonth],
  );
  const summary = selectedDates.length
    ? `${monthLabel(month)} · ${selectedDates.map((date) => Number(date.slice(8, 10))).join(", ")}`
    : `${monthLabel(month)} · ${placeholder}`;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-controls={id ? `${id}-calendar` : undefined}
        aria-expanded={open}
        className={`${fieldClass} flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${open ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
        disabled={disabled}
        id={id}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <CalendarIcon className="h-[1.15em] w-[1.15em] shrink-0 text-blue-700" />
        <span className={`min-w-0 flex-1 truncate ${selectedDates.length ? "font-semibold text-slate-800" : "text-slate-500"}`}>{summary}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <section
          aria-label="Calendario de francos"
          className="absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          id={id ? `${id}-calendar` : undefined}
          role="dialog"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Mes anterior"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={Boolean(minMonth) && month <= minMonth}
              onClick={() => onChangeMonth(-1)}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
            <h2 className="text-xs font-bold text-slate-800">{monthLabel(month)}</h2>
            <button aria-label="Mes siguiente" className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" onClick={() => onChangeMonth(1)} type="button">
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[0.5625rem] font-semibold text-slate-400">
            {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.625rem] font-medium">
            {Array.from({ length: leading }, (_, index) => <span aria-hidden="true" className="h-8" key={`empty-${index}`} />)}
            {days.map((value) => {
              const day = Number(value.slice(8, 10));
              const selected = selectedDates.includes(value);
              const taken = requestedDates.has(value);
              const tooSoon = Boolean(minDate) && value < minDate;
              const blocked = taken || tooSoon || (!selected && (remaining === 0 || selectedDates.length >= remaining));
              const look = selected
                ? "border-blue-700 bg-blue-700 font-bold text-white shadow-sm"
                : taken
                  ? "cursor-not-allowed border-blue-200 bg-blue-100 font-bold text-blue-800"
                  : tooSoon
                    ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50";
              return (
                <button
                  aria-label={`${day} de ${monthLabel(month)}${selected ? ", seleccionado" : ""}${taken ? ", ya tiene franco" : ""}`}
                  aria-pressed={selected}
                  className={`h-8 rounded-md border transition disabled:cursor-not-allowed ${look}`}
                  data-date={value}
                  disabled={blocked}
                  key={value}
                  onClick={() => onToggleDate(value)}
                  title={taken ? "Ya tiene franco ese día" : undefined}
                  type="button"
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span aria-live="polite" className="text-[0.5625rem] font-semibold text-slate-600">
              {selectedDates.length} seleccionados · {Math.max(0, remaining - selectedDates.length)} disponibles
            </span>
            <button className="rounded-lg bg-blue-700 px-3 py-1.5 text-[0.5625rem] font-semibold text-white transition hover:bg-blue-800" onClick={close} type="button">
              Listo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
