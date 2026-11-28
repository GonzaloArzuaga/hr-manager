import { holidayOn } from "../lib/store";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExclusiveOverlay } from "../lib/overlays";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "./icons";

// Campos de fecha, mes y hora propios del sistema. Reemplazan a los <input type="date">,
// "month" y "time" del navegador para que todos se vean igual que los desplegables.
// Se usan igual que un input: value, onChange, name, required, min, max y disabled.
// value usa el mismo formato que los nativos: "AAAA-MM-DD", "AAAA-MM" y "HH:MM".

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const pad = (value) => String(value).padStart(2, "0");

export function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function emit(onChange, name, id, value) {
  const target = { name, id, value };
  onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
}

function parseDisplayDate(text) {
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function toDisplayDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function maskDate(text) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskTime(text) {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function validTime(text) {
  const match = text.match(/^(\d{2}):(\d{2})$/);
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? text : null;
}

// Posición del panel: debajo del campo, o arriba si abajo no entra
function usePopover(open, anchorRef, minWidthRem) {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const width = Math.min(window.innerWidth - 16, Math.max(rect.width, minWidthRem * rem));
      const below = window.innerHeight - rect.bottom - 8;
      const openUp = below < 18 * rem && rect.top > below;
      setStyle({
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, minWidthRem]);
  return style;
}

function useDismiss(open, refs, close) {
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (refs.some((ref) => ref.current?.contains(event.target))) return;
      close();
    }
    function onKey(event) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refs, close]);
}

function Panel({ panelRef, style, label, children }) {
  if (!style) return null;
  return createPortal(
    <div
      aria-label={label}
      className="hr-dropdown-panel z-[90] rounded-xl border border-slate-200 bg-white p-2.5 text-[0.6875rem] text-slate-700 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)]"
      onMouseDown={(event) => event.target.tagName !== "INPUT" && event.preventDefault()}
      ref={panelRef}
      role="dialog"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

function NavButton({ label, onClick, disabled, children }) {
  return (
    <button
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function cellClass(selected, disabled, today) {
  if (selected) return "bg-blue-700 font-bold text-white";
  if (disabled) return "cursor-not-allowed text-slate-300";
  return `text-slate-700 hover:bg-blue-50 hover:text-blue-800 ${today ? "font-bold text-blue-700 ring-1 ring-inset ring-blue-200" : ""}`;
}

// El campo visible: mismo aspecto que un input del sistema, con un botón a la derecha
function FieldShell({ className, disabled, open, children, onToggle, icon, label, anchorRef }) {
  return (
    <div
      className={`${className} hr-field flex items-center gap-1.5 ${open ? "border-blue-500 ring-1 ring-blue-500" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      ref={anchorRef}
    >
      {children}
      <button
        aria-label={label}
        className="-mr-1 flex shrink-0 items-center rounded p-0.5 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
        disabled={disabled}
        onClick={onToggle}
        tabIndex={-1}
        type="button"
      >
        {icon}
      </button>
    </div>
  );
}

const defaultLook =
  "hr-field w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500";

// ---------------------------------------------------------------------------
// Fecha
// ---------------------------------------------------------------------------
export function DateField({
  className = defaultLook,
  defaultView = "days",
  disabled = false,
  id,
  max,
  min,
  name,
  onChange,
  openAt,
  placeholder = "DD/MM/AAAA",
  required = false,
  value = "",
  ...rest
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(toDisplayDate(value));
  const [view, setView] = useState("days");
  // Mes que muestra el calendario al abrirse si todavía no hay fecha elegida
  const reference = value || openAt || (max && max < todayKey() ? max : min && min > todayKey() ? min : todayKey());
  const [cursor, setCursor] = useState(() => ({ year: Number(reference.slice(0, 4)), month: Number(reference.slice(5, 7)) - 1 }));
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const style = usePopover(open, anchorRef, 16);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const close = () => setOpen(false);
  useDismiss(open, refs, close);
  useExclusiveOverlay(open, close);

  useEffect(() => setText(toDisplayDate(value)), [value]);

  function outOfRange(key) {
    return Boolean((min && key < min) || (max && key > max));
  }

  function openPanel() {
    if (disabled) return;
    const base = value || reference;
    setCursor({ year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 });
    // Para fechas lejanas (por ejemplo, la de nacimiento) conviene empezar eligiendo el año
    setView(value ? "days" : defaultView);
    setOpen(true);
  }

  function choose(key) {
    if (outOfRange(key)) return;
    setText(toDisplayDate(key));
    emit(onChange, name, inputId, key);
    setOpen(false);
    inputRef.current?.focus();
  }

  function typed(event) {
    const masked = maskDate(event.target.value);
    setText(masked);
    if (masked === "" && !required) emit(onChange, name, inputId, "");
    const key = parseDisplayDate(masked);
    if (key && !outOfRange(key)) {
      emit(onChange, name, inputId, key);
      setCursor({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1 });
    }
  }

  function blurred() {
    const key = parseDisplayDate(text);
    if (!key || outOfRange(key)) setText(toDisplayDate(value));
  }

  function shiftMonth(step) {
    setCursor(({ year, month }) => {
      const date = new Date(year, month + step, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const today = todayKey();
  const first = new Date(cursor.year, cursor.month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const minYear = min ? Number(min.slice(0, 4)) : 1900;
  const maxYear = max ? Number(max.slice(0, 4)) : new Date().getFullYear() + 20;
  const yearPageStart = Math.max(minYear, cursor.year - (cursor.year % 12));
  const prevDisabled = Boolean(min && `${cursor.year}-${pad(cursor.month + 1)}` <= min.slice(0, 7));
  const nextDisabled = Boolean(max && `${cursor.year}-${pad(cursor.month + 1)}` >= max.slice(0, 7));

  return (
    <>
      <FieldShell
        anchorRef={anchorRef}
        className={className}
        disabled={disabled}
        icon={<CalendarIcon />}
        label="Abrir calendario"
        onToggle={() => (open ? close() : openPanel())}
        open={open}
      >
        <input
          {...rest}
          autoComplete="off"
          className="hr-field-inner h-[1.4em] min-w-0 flex-1 border-0 bg-transparent p-0 text-[1em] leading-none shadow-none text-inherit placeholder:text-slate-400 focus:outline-none focus:ring-0"
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onBlur={blurred}
          onChange={typed}
          onClick={() => !open && openPanel()}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || (event.key === "Enter" && !open)) {
              event.preventDefault();
              openPanel();
            }
          }}
          pattern="\d{2}/\d{2}/\d{4}"
          placeholder={placeholder}
          ref={inputRef}
          required={required}
          title="Formato DD/MM/AAAA"
          value={text}
        />
        {name && <input name={name} type="hidden" value={value} />}
      </FieldShell>
      {open && (
        <Panel label="Calendario" panelRef={panelRef} style={style}>
          <div className="mb-2 flex items-center justify-between gap-1">
            <NavButton
              disabled={view === "days" ? prevDisabled : yearPageStart <= minYear}
              label={view === "days" ? "Mes anterior" : "Años anteriores"}
              onClick={() => (view === "days" ? shiftMonth(-1) : setCursor((c) => ({ ...c, year: Math.max(minYear, c.year - 12) })))}
            >
              <ChevronLeftIcon />
            </NavButton>
            <button
              className="rounded-lg px-2 py-1 text-[0.75rem] font-bold capitalize text-slate-900 transition hover:bg-slate-100"
              onClick={() => setView(view === "days" ? "years" : "days")}
              type="button"
            >
              {view === "days" ? `${MONTHS[cursor.month]} ${cursor.year}` : view === "months" ? cursor.year : `${yearPageStart} – ${Math.min(maxYear, yearPageStart + 11)}`}
            </button>
            <NavButton
              disabled={view === "days" ? nextDisabled : yearPageStart + 12 > maxYear}
              label={view === "days" ? "Mes siguiente" : "Años siguientes"}
              onClick={() => (view === "days" ? shiftMonth(1) : setCursor((c) => ({ ...c, year: Math.min(maxYear, c.year + 12) })))}
            >
              <ChevronRightIcon />
            </NavButton>
          </div>

          {view === "days" && (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-[0.5625rem] font-bold uppercase tracking-wide text-slate-400">
                {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const key = `${cursor.year}-${pad(cursor.month + 1)}-${pad(index + 1)}`;
                  const off = outOfRange(key);
                  // El feriado se marca pero no bloquea la fecha.
                  const holiday = holidayOn(key);
                  return (
                    <button
                      aria-label={`${toDisplayDate(key)}${holiday ? `, feriado: ${holiday.name}` : ""}`}
                      aria-pressed={key === value}
                      className={`relative flex h-7 items-center justify-center rounded-lg transition ${cellClass(key === value, off, key === today)} ${holiday && key !== value && !off ? "text-amber-900" : ""}`}
                      data-date={key}
                      disabled={off}
                      key={key}
                      onClick={() => choose(key)}
                      title={holiday ? holiday.name : undefined}
                      type="button"
                    >
                      {index + 1}
                      {holiday && key !== value && !off && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === "years" && (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, index) => yearPageStart + index)
                .filter((year) => year <= maxYear)
                .map((year) => (
                  <button
                    className={`rounded-lg py-2 transition ${cellClass(year === cursor.year, false, year === new Date().getFullYear())}`}
                    key={year}
                    onClick={() => {
                      setCursor((c) => ({ ...c, year }));
                      setView("months");
                    }}
                    type="button"
                  >
                    {year}
                  </button>
                ))}
            </div>
          )}

          {view === "months" && (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((label, month) => {
                const key = `${cursor.year}-${pad(month + 1)}`;
                const off = Boolean((min && key < min.slice(0, 7)) || (max && key > max.slice(0, 7)));
                return (
                  <button
                    className={`rounded-lg py-2 capitalize transition ${cellClass(month === cursor.month, off, false)}`}
                    disabled={off}
                    key={label}
                    onClick={() => {
                      setCursor((c) => ({ ...c, month }));
                      setView("days");
                    }}
                    type="button"
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[0.625rem] font-semibold">
            <button
              className="rounded-md px-2 py-1 text-blue-700 transition hover:bg-blue-50 disabled:text-slate-300"
              disabled={outOfRange(today)}
              onClick={() => choose(today)}
              type="button"
            >
              Hoy
            </button>
            {!required && value && (
              <button
                className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => {
                  setText("");
                  emit(onChange, name, inputId, "");
                  setOpen(false);
                }}
                type="button"
              >
                Borrar
              </button>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mes
// ---------------------------------------------------------------------------
export function formatMonthLabel(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  return `${MONTHS[month - 1].replace(/^./, (letter) => letter.toUpperCase())} ${year}`;
}

export function MonthField({
  className = defaultLook,
  disabled = false,
  id,
  max,
  min,
  name,
  onChange,
  placeholder = "Seleccionar mes",
  required = false,
  value = "",
  ...rest
}) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((value || todayKey()).slice(0, 4)));
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const style = usePopover(open, anchorRef, 14);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const close = () => setOpen(false);
  useDismiss(open, refs, close);
  useExclusiveOverlay(open, close);
  const minYear = min ? Number(min.slice(0, 4)) : 1900;
  const maxYear = max ? Number(max.slice(0, 4)) : 2200;
  const current = todayKey().slice(0, 7);

  function toggle() {
    if (disabled) return;
    if (!open) setYear(Number((value || current).slice(0, 4)));
    setOpen(!open);
  }

  return (
    <>
      <span className="relative block w-full" ref={anchorRef}>
        <button
          {...rest}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`${className} flex items-center justify-between gap-2 text-left ${open ? "border-blue-500 ring-1 ring-blue-500" : ""} disabled:cursor-not-allowed disabled:opacity-60`}
          data-value={value}
          disabled={disabled}
          id={buttonId}
          onClick={toggle}
          role="combobox"
          type="button"
        >
          <span className={`min-w-0 truncate ${value ? "" : "text-slate-400"}`}>{value ? formatMonthLabel(value) : placeholder}</span>
          <CalendarIcon className="h-[1.15em] w-[1.15em] text-blue-700" />
        </button>
        <input
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          name={name}
          onChange={() => {}}
          onFocus={() => document.getElementById(buttonId)?.focus()}
          required={required}
          tabIndex={-1}
          value={value}
        />
      </span>
      {open && (
        <Panel label="Seleccionar mes" panelRef={panelRef} style={style}>
          <div className="mb-2 flex items-center justify-between">
            <NavButton disabled={year <= minYear} label="Año anterior" onClick={() => setYear(year - 1)}>
              <ChevronLeftIcon />
            </NavButton>
            <span className="text-[0.75rem] font-bold text-slate-900">{year}</span>
            <NavButton disabled={year >= maxYear} label="Año siguiente" onClick={() => setYear(year + 1)}>
              <ChevronRightIcon />
            </NavButton>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, index) => {
              const key = `${year}-${pad(index + 1)}`;
              const off = Boolean((min && key < min) || (max && key > max));
              return (
                <button
                  className={`rounded-lg py-2 capitalize transition ${cellClass(key === value, off, key === current)}`}
                  data-month={key}
                  disabled={off}
                  key={key}
                  onClick={() => {
                    emit(onChange, name, buttonId, key);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hora
// ---------------------------------------------------------------------------
export function TimeField({
  className = defaultLook,
  disabled = false,
  id,
  name,
  onChange,
  placeholder = "HH:MM",
  required = false,
  value = "",
  ...rest
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const style = usePopover(open, anchorRef, 9);
  const refs = useMemo(() => [anchorRef, panelRef], []);
  const close = () => setOpen(false);
  useDismiss(open, refs, close);
  useExclusiveOverlay(open, close);
  useEffect(() => setText(value), [value]);
  const [hour, minute] = (value || "").split(":");

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      hoursRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "center" });
      minutesRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "center" });
    });
  }, [open]);

  function set(nextHour, nextMinute, done) {
    const next = `${nextHour}:${nextMinute}`;
    setText(next);
    emit(onChange, name, inputId, next);
    if (done) setOpen(false);
  }

  function typed(event) {
    const masked = maskTime(event.target.value);
    setText(masked);
    if (masked === "" && !required) emit(onChange, name, inputId, "");
    if (validTime(masked)) emit(onChange, name, inputId, masked);
  }

  const column = (items, selected, onPick, ref, label) => (
    <div aria-label={label} className="max-h-44 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-slate-100 p-0.5" ref={ref}>
      {items.map((item) => (
        <button
          aria-pressed={item === selected}
          className={`block w-full rounded-md py-1 text-center transition ${cellClass(item === selected, false, false)}`}
          key={item}
          onClick={() => onPick(item)}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <FieldShell
        anchorRef={anchorRef}
        className={className}
        disabled={disabled}
        icon={<ClockIcon />}
        label="Elegir hora"
        onToggle={() => setOpen(!open)}
        open={open}
      >
        <input
          {...rest}
          autoComplete="off"
          className="hr-field-inner h-[1.4em] min-w-0 flex-1 border-0 bg-transparent p-0 text-[1em] leading-none shadow-none text-inherit placeholder:text-slate-400 focus:outline-none focus:ring-0"
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onBlur={() => !validTime(text) && setText(value)}
          onChange={typed}
          onClick={() => !open && !disabled && setOpen(true)}
          pattern="\d{2}:\d{2}"
          placeholder={placeholder}
          required={required}
          title="Formato HH:MM, 24 horas"
          value={text}
        />
        {name && <input name={name} type="hidden" value={value} />}
      </FieldShell>
      {open && (
        <Panel label="Elegir hora" panelRef={panelRef} style={style}>
          <div className="mb-1 grid grid-cols-2 gap-1.5 text-center text-[0.5625rem] font-bold uppercase tracking-wide text-slate-400">
            <span>Hora</span>
            <span>Minutos</span>
          </div>
          <div className="flex gap-1.5">
            {column(Array.from({ length: 24 }, (_, i) => pad(i)), hour, (h) => set(h, minute ?? "00", false), hoursRef, "Hora")}
            {column(Array.from({ length: 60 }, (_, i) => pad(i)), minute, (m) => set(hour ?? "00", m, true), minutesRef, "Minutos")}
          </div>
        </Panel>
      )}
    </>
  );
}
