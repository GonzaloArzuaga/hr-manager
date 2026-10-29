import React, { useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import PaginationControls from "../../components/PaginationControls";
import PendingFrancoCard from "../../components/cards/empleado/PendingFrancoCard";
import RequestedFrancoCard from "../../components/cards/empleado/RequestedFrancoCard";
import { usePagination } from "../../hooks/usePagination";
import { cancelMyRequest, submitDaysOff } from "../../lib/api";
import {
  getBusinessRules,
  getMonthlyFrancoAllowance,
} from "../../data/businessRules";
import {
  employeeFrancoRequests,
  employeeFrancoTaken,
} from "../../data/francosEmpleadoData";
import Select from "../../components/Select";

const reasons = [
  "Compensación por guardia extendida",
  "Franco compensatorio ordinario",
  "Cambio de turno coordinado",
  "Razones particulares debidamente fundadas",
];

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// El aviso previo se cuenta en días corridos, igual que en la base de datos
function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateValue(date);
}

function formatDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", options).format(
    new Date(`${value}T12:00:00`),
  );
}

function getDateRangeLabel(dates) {
  const datesByMonth = new Map();
  [...dates].sort().forEach((value) => {
    const date = new Date(`${value}T12:00:00`);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const group = datesByMonth.get(key) ?? {
      days: [],
      date,
    };
    group.days.push(
      new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(date),
    );
    datesByMonth.set(key, group);
  });

  return [...datesByMonth.values()]
    .map(({ days, date }) => {
      const dayList =
        days.length < 2
          ? days[0]
          : `${days.slice(0, -1).join(", ")} y ${days[days.length - 1]}`;
      const month = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date);
      return `${dayList} de ${month} de ${date.getFullYear()}`;
    })
    .join("; ");
}

function Icon({ className = "h-4 w-4", children }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function StatusBadge({ status }) {
  const styles = status === "Pendiente de revisión"
    ? "bg-blue-50 text-blue-700"
    : status === "Aceptado"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-rose-50 text-rose-700";
  const icon =
    status === "Pendiente de revisión" ? (
      <circle cx="12" cy="12" r="9" />
    ) : status === "Aceptado" ? (
      <path d="M5 13l4 4L19 7" />
    ) : (
      <path d="M6 18L18 6M6 6l12 12" />
    );

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.625rem] font-semibold ${styles}`}>
      <Icon className="h-3 w-3">{icon}</Icon>
      {status}
    </span>
  );
}

function CalendarCard({
  month,
  currentPeriodValue,
  selectedDates,
  requestedDates,
  minRequestDate,
  remainingFrancos,
  onToggleDate,
  onChangeMonth,
  onClose,
}) {
  const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
  const [year, monthNumber] = month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const referenceDate = new Date(year, monthIndex, 1);
  const monthName = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(referenceDate);
  const monthValue = `${year}-${String(monthNumber).padStart(2, "0")}`;
  const leadingEmptyDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: leadingEmptyDays }, (_, index) => ({
      key: `empty-${index}`,
      day: null,
      value: "",
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const value = `${monthValue}-${String(day).padStart(2, "0")}`;
      return {
        key: value,
        day,
        value,
      };
    }),
  ];

  return (
    <section
      aria-label="Calendario de francos"
      className="absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      role="dialog"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Mes anterior"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          disabled={month <= currentPeriodValue}
          onClick={() => onChangeMonth(-1)}
          type="button"
        >
          <Icon className="h-3.5 w-3.5">
            <path d="M15 19l-7-7 7-7" />
          </Icon>
        </button>
        <h2 className="text-xs font-bold capitalize text-slate-800">{monthName}</h2>
        <button
          aria-label="Mes siguiente"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          onClick={() => onChangeMonth(1)}
          type="button"
        >
          <Icon className="h-3.5 w-3.5">
            <path d="M9 5l7 7-7 7" />
          </Icon>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.5625rem] font-semibold text-slate-400">
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.625rem] font-medium">
        {calendarDays.map(({ day, key, value }) => {
          if (day === null) {
            return <span aria-hidden="true" className="h-8" key={key} />;
          }
          const selected = selectedDates.includes(value);
          const alreadyRequested = requestedDates.has(value);
          const isPastOrTooSoon = value < minRequestDate;
          const disabled =
            alreadyRequested ||
            isPastOrTooSoon ||
            (!selected &&
              (remainingFrancos === 0 ||
                selectedDates.length >= remainingFrancos));
          const className = selected
            ? "border-blue-700 bg-blue-700 font-bold text-white shadow-sm"
            : alreadyRequested
              ? "cursor-not-allowed border-blue-200 bg-blue-100 font-bold text-blue-800"
              : isPastOrTooSoon
                ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50";
          return (
            <button
              aria-label={`${day} de ${monthName}${selected ? ", seleccionado" : ""}${alreadyRequested ? ", ya solicitado" : ""}`}
              aria-pressed={selected}
              className={`h-8 rounded-md border transition disabled:cursor-not-allowed ${className}`}
              disabled={disabled}
              key={key}
              onClick={() => onToggleDate(value)}
              title={alreadyRequested ? "Ya solicitado para este período" : undefined}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span aria-live="polite" className="text-[0.5625rem] font-semibold text-slate-600">
          {selectedDates.length} seleccionados · {remainingFrancos - selectedDates.length} disponibles
        </span>
        <button
          className="rounded-lg bg-blue-700 px-3 py-1.5 text-[0.5625rem] font-semibold text-white transition hover:bg-blue-800"
          onClick={onClose}
          type="button"
        >
          Listo
        </button>
      </div>
    </section>
  );
}

export default function FrancosEmployee() {
  const businessRules = getBusinessRules();
  const monthlyFrancoAllowance = getMonthlyFrancoAllowance(
    businessRules.weeklyDaysOff,
  );
  const now = new Date();
  const currentPeriodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [requests, setRequests] = useState(employeeFrancoRequests);
  const [selectedMonth, setSelectedMonth] = useState(currentPeriodValue);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [observations, setObservations] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [periodFilter, setPeriodFilter] = useState("Todos");
  const [pageSize, setPageSize] = useState(5);
  const [activeTab, setActiveTab] = useState("Solicitudes");
  const periodLabelParts = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).formatToParts(now);
  const periodLabel = periodLabelParts
    .filter((part) => part.type === "month" || part.type === "year")
    .map((part) => part.value)
    .join(" ");
  const currentMonthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${currentPeriodValue}-01T12:00:00`));
  const minRequestDate = getDateAfterDays(businessRules.daysOffNotice);
  const [submitting, setSubmitting] = useState(false);
  const pendingCount = requests.filter((request) =>
    request.status.startsWith("Pendiente"),
  ).length;
  const selectedMonthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${selectedMonth}-01T12:00:00`));
  const requestedDates = useMemo(
    () =>
      new Set(
        requests
          .filter((request) => !request.status.startsWith("Rechazado") && !request.status.startsWith("Cancelado"))
          .flatMap((request) => request.dates)
          .filter((date) => date.startsWith(`${selectedMonth}-`)),
      ),
    [requests, selectedMonth],
  );
  const currentPeriodRequestedDates = useMemo(
    () =>
      new Set(
        requests
          .filter((request) => !request.status.startsWith("Rechazado"))
          .flatMap((request) => request.dates)
          .filter((date) => date.startsWith(`${currentPeriodValue}-`)),
      ),
    [currentPeriodValue, requests],
  );
  const remainingFrancos = Math.max(
    0,
    monthlyFrancoAllowance - requestedDates.size,
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const matchesStatus =
          statusFilter === "Todos" || request.status.startsWith(statusFilter);
        const matchesPeriod =
          periodFilter === "Todos" ||
          request.dates.some((date) => date.slice(0, 7) === periodFilter);
        return matchesStatus && matchesPeriod;
      }),
    [periodFilter, requests, statusFilter],
  );
  const filteredTaken = useMemo(
    () =>
      employeeFrancoTaken.filter(
        (record) =>
          periodFilter === "Todos" ||
          record.dates.some((date) => date.slice(0, 7) === periodFilter),
      ),
    [periodFilter],
  );
  const visibleRows =
    activeTab === "Solicitudes" ? filteredRequests : filteredTaken;
  const {
    currentPage,
    endIndex,
    pageItems,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(visibleRows, pageSize);

  function changeMonth(amount) {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + amount, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (nextMonth < currentPeriodValue) return;
    setSelectedMonth(nextMonth);
    setSelectedDates([]);
    setMessage("");
  }

  function toggleDate(date) {
    setSelectedDates((dates) => {
      if (dates.includes(date)) {
        return dates.filter((selectedDate) => selectedDate !== date);
      }
      if (dates.length >= remainingFrancos || requestedDates.has(date)) {
        return dates;
      }
      return [...dates, date].sort();
    });
    setMessage("");
  }

  function clearForm() {
    setSelectedMonth(currentPeriodValue);
    setSelectedDates([]);
    setShowCalendar(false);
    setReason(reasons[0]);
    setObservations("");
    setMessage("");
  }

  async function submitRequest(event) {
    event.preventDefault();
    const dates = [...selectedDates].sort();

    if (dates.length === 0) {
      setMessage("Seleccioná al menos un día de franco.");
      return;
    }
    if (dates.some((date) => !date.startsWith(`${selectedMonth}-`))) {
      setMessage("Todas las fechas deben pertenecer al período seleccionado.");
      return;
    }
    if (dates.some((date) => date < minRequestDate)) {
      setMessage(
        `La solicitud debe realizarse con al menos ${businessRules.daysOffNotice} ${
          businessRules.daysOffNotice === 1 ? "día" : "días"
        } de anticipación.`,
      );
      return;
    }
    if (dates.some((date) => requestedDates.has(date))) {
      setMessage("Ya hay francos solicitados para una o más fechas elegidas.");
      return;
    }
    if (dates.length > remainingFrancos) {
      setMessage(`Solo quedan ${remainingFrancos} francos disponibles en ${selectedMonthLabel}.`);
      return;
    }

    const fullReason = observations.trim() ? `${reason}. ${observations.trim()}` : reason;
    setSubmitting(true);
    setMessage("");
    try {
      const created = await submitDaysOff({ dates, reason: fullReason });
      setRequests([...employeeFrancoRequests]);
      setStatusFilter("Todos");
      setPeriodFilter("Todos");
      setSelectedDates([]);
      setShowCalendar(false);
      setReason(reasons[0]);
      setObservations("");
      toast.success(
        created?.status === "approved"
          ? "Solicitud enviada y aprobada automáticamente según las reglas de tu organización."
          : "Solicitud enviada. Queda pendiente de aprobación.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(requestId) {
    const confirmed = await confirmDialog({
      title: "Cancelar solicitud",
      message: "¿Cancelar esta solicitud de franco?",
      confirmLabel: "Cancelar solicitud",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await cancelMyRequest("days_off", requestId);
      setRequests([...employeeFrancoRequests]);
      toast.success("La solicitud se canceló.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-700 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem]">
          <header className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500">
                <span>Portal del empleado</span>
                <span aria-hidden="true">&gt;</span>
                <span className="text-blue-600">Gestión de francos</span>
              </div>
              <h1 className="page-title">
                Mis Francos y Descansos
              </h1>
            </div>
            <div className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white px-3.5 py-2 shadow-sm">
              <div>
                <span className="block text-[0.5625rem] font-semibold uppercase leading-tight text-slate-400">
                  Período en curso
                </span>
                <span className="text-[0.6875rem] font-bold capitalize text-slate-800">
                  {periodLabel}
                </span>
              </div>
            </div>
          </header>

          <section className="mb-5">
            <div className="relative rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold tracking-tight text-slate-800">
                      Nueva Solicitud de Franco(s)
                    </h2>
                  <div className="group relative">
                    <button
                      aria-label="Información sobre Reglas de Francos"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="button"
                    >
                      <Icon className="h-4 w-4">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5m0-8h.01" />
                      </Icon>
                    </button>
                    <section
                      aria-label="Reglas de Francos"
                      className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] translate-y-1 rounded-xl border border-slate-200 bg-white p-4 opacity-0 shadow-xl transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                      id="franco-rules"
                      role="tooltip"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-xs font-bold text-blue-700">
                          Reglas de Francos
                        </h3>
                      </div>
                      <ul className="space-y-2.5 text-[0.625rem] leading-relaxed text-slate-600">
                        <li className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-3 w-3 shrink-0 text-blue-600">
                            <path d="M5 13l4 4L19 7" />
                          </Icon>
                          <span>
                            <strong>Preaviso:</strong> La solicitud debe realizarse
                            con al menos {businessRules.daysOffNotice}{" "}
                            {businessRules.daysOffNotice === 1
                              ? "día hábil"
                              : "días hábiles"}{" "}
                            de anticipación.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-3 w-3 shrink-0 text-blue-600">
                            <path d="M5 13l4 4L19 7" />
                          </Icon>
                          <span>
                            <strong>Cupo de francos:</strong>{" "}
                            {businessRules.weeklyDaysOff}{" "}
                            {businessRules.weeklyDaysOff === 1
                              ? "franco por semana"
                              : "francos por semana"}{" "}
                            ({monthlyFrancoAllowance} por período mensual).
                          </span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={submitRequest}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <label
                      className="mb-1.5 block text-[0.625rem] font-bold text-slate-700"
                      htmlFor="franco-date-field"
                    >
                      Período y fechas solicitadas <span className="text-rose-500">*</span>
                    </label>
                    <button
                      aria-controls="franco-calendar"
                      aria-expanded={showCalendar}
                      className="flex min-h-[2.625rem] w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[0.625rem] font-medium text-slate-700 transition hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      id="franco-date-field"
                      onClick={() => setShowCalendar((visible) => !visible)}
                      type="button"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-blue-600">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </Icon>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold capitalize">{selectedMonthLabel}</span>
                        <span className="block truncate text-[0.5625rem] text-slate-500">
                          {selectedDates.length
                            ? selectedDates
                                .map((date) =>
                                  new Intl.DateTimeFormat("es-AR", {
                                    day: "2-digit",
                                  }).format(new Date(`${date}T12:00:00`)),
                                )
                                .join(", ")
                            : "Seleccionar fechas"}
                        </span>
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400">
                        <path d={showCalendar ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                      </Icon>
                    </button>
                    {showCalendar && (
                      <div id="franco-calendar">
                        <CalendarCard
                          currentPeriodValue={currentPeriodValue}
                          minRequestDate={minRequestDate}
                          month={selectedMonth}
                          onChangeMonth={changeMonth}
                          onClose={() => setShowCalendar(false)}
                          onToggleDate={toggleDate}
                          remainingFrancos={remainingFrancos}
                          requestedDates={requestedDates}
                          selectedDates={selectedDates}
                        />
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <span className="block text-[0.5625rem] font-semibold uppercase tracking-wide text-blue-700">
                      Francos restantes en {selectedMonthLabel}
                    </span>
                    <span aria-live="polite" className="mt-0.5 block text-sm font-bold text-blue-900">
                      {remainingFrancos - selectedDates.length}{" "}
                      {remainingFrancos - selectedDates.length === 1 ? "día disponible" : "días disponibles"}
                    </span>
                    <span className="block text-[0.5625rem] text-blue-700">
                      {selectedDates.length} seleccionados · cupo mensual de {monthlyFrancoAllowance}
                    </span>
                  </div>
                </div>

                {/*
                <div>
                  <label
                    className="mb-1.5 block text-[0.625rem] font-bold text-slate-700"
                    htmlFor="franco-reason"
                  >
                    Motivo de la solicitud <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.625rem] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    id="franco-reason"
                    onChange={(event) => setReason(event.target.value)}
                    required
                    value={reason}
                  >
                    {reasons.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-[0.625rem] font-bold text-slate-700"
                    htmlFor="franco-observations"
                  >
                    Observaciones o detalle justificativo
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 p-3 text-[0.625rem] text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    id="franco-observations"
                    onChange={(event) => setObservations(event.target.value)}
                    placeholder="Detalle cualquier información relevante para agilizar la aprobación del jefe de área y el departamento de Personas..."
                    rows={3}
                    value={observations}
                  />
                </div>
                */}

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 transition hover:bg-slate-100"
                    onClick={clearForm}
                    type="button"
                  >
                    Limpiar formulario
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-[#0d47a1] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition hover:bg-[#0b3c8a] disabled:opacity-60"
                    disabled={submitting}
                    type="submit"
                  >
                    <Icon className="mr-2 h-3 w-3">
                      <path d="M22 2L11 13" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </Icon>
                    Enviar solicitud de franco
                  </button>
                </div>
                {message && (
                  <p
                    aria-live="polite"
                    className={`text-[0.625rem] font-medium ${
                      message.includes("registrada") || message.includes("canceló")
                        ? "text-emerald-700"
                        : "text-rose-600"
                    }`}
                    role="status"
                  >
                    {message}
                  </p>
                )}
              </form>
            </div>
          </section>

          <section
            aria-label="Resumen de francos"
            className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <RequestedFrancoCard
              allowance={monthlyFrancoAllowance}
              monthLabel={currentMonthLabel}
              requestedDays={currentPeriodRequestedDates.size}
            />
            <PendingFrancoCard pendingCount={pendingCount} />

            {/*
            <article className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="mb-1 text-[0.625rem] font-medium text-slate-500">
                    Francos compensatorios disponibles
                  </p>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl font-extrabold leading-none text-slate-900">2</strong>
                    <span className="text-[0.625rem] font-medium text-slate-500">días a favor</span>
                  </div>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </Icon>
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[0.5625rem]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Icon className="h-3 w-3 text-blue-500">
                    <path d="M20 7v5h-5M4 17v-5h5m-4.5-2a8 8 0 0113.3-2L20 12M4 12l2.2 4a8 8 0 0013.3-2" />
                  </Icon>
                  Devengados por guardia rotativa
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[0.5rem] font-semibold text-slate-700">
                  Vencen en 45d
                </span>
              </div>
            </article>
            */}
          </section>

          <section
            aria-label="Historial de solicitudes y francos gozados"
            id="historial"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { label: "Solicitudes", count: requests.length },
                  { label: "Francos Gozados", count: employeeFrancoTaken.length },
                ].map(({ label, count }, index) => (
                  <button
                    aria-pressed={activeTab === label}
                    className={`-mb-px relative z-10 inline-flex items-center gap-2 rounded-t-lg border-x border-t px-3 py-2 text-[0.5625rem] transition sm:px-4 sm:text-[0.625rem] ${
                      activeTab === label
                        ? "border-slate-200/80 bg-white font-bold text-blue-700 shadow-sm"
                        : "border-transparent font-medium text-slate-500 hover:text-slate-800"
                    }`}
                    key={label}
                    onClick={() => {
                      setActiveTab(label);
                      setPage(1);
                    }}
                    type="button"
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[0.5rem] ${
                        index === 0
                          ? "bg-blue-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 pb-1">
                <label>
                  <span className="sr-only">Filtrar por período</span>
                  <Select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(event) => setPeriodFilter(event.target.value)}
                    value={periodFilter}
                  >
                    <option value="Todos">Todos los períodos</option>
                    <option value={currentPeriodValue}>{currentMonthLabel} (Actual)</option>
                    <option value="2026-09">Septiembre 2026</option>
                  </Select>
                </label>
                {activeTab === "Solicitudes" && (
                  <label className="min-w-[9.375rem]">
                    <span className="sr-only">Filtrar por estado</span>
                    <Select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
                    >
                      <option value="Todos">Todos los estados</option>
                      <option value="Pendiente de revisión">Pendiente de revisión</option>
                      <option value="Aceptado">Aceptado</option>
                      <option value="Rechazado">Rechazado</option>
                    </Select>
                  </label>
                )}
              </div>
            </div>
            <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table
                className={`hr-data-table w-full ${
                  activeTab === "Solicitudes" ? "min-w-[47.5rem]" : "min-w-[35rem]"
                } border-collapse text-left text-[0.5625rem]`}
              >
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[0.5rem] font-bold uppercase tracking-wider text-slate-400">
                    {activeTab === "Solicitudes" ? (
                      <>
                        <th className="px-4 py-3 sm:px-5">Días solicitados</th>
                        <th className="px-3 py-3">Cantidad de días</th>
                        <th className="px-3 py-3">Fecha de solicitud</th>
                        <th className="px-3 py-3">Estado</th>
                        <th className="px-4 py-3 text-right sm:px-5">Acción</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 sm:px-5">Días gozados</th>
                        <th className="px-3 py-3">Cantidad de días</th>
                        <th className="px-3 py-3">Fecha de solicitud</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {pageItems.map((record) => {
                    if (activeTab === "Solicitudes") {
                      const request = record;
                      return (
                        <tr className="transition hover:bg-slate-50/40" key={request.id}>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                            <span className="font-bold text-slate-900">
                              {getDateRangeLabel(request.dates)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5625rem] font-semibold text-blue-700">
                              {request.dates.length}{" "}
                              {request.dates.length === 1 ? "día" : "días"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                            {formatDate(request.sentAt)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                            {request.status.startsWith("Pendiente") ? (
                              <button
                                className="text-[0.5625rem] font-semibold text-rose-600 transition hover:text-rose-700"
                                onClick={() => cancelRequest(request.id)}
                                type="button"
                              >
                                Cancelar
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    const takenRecord = record;
                    const originalRequest = requests.find(
                      (request) => request.id === takenRecord.requestId,
                    );
                    return (
                      <tr className="transition hover:bg-slate-50/40" key={takenRecord.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900 sm:px-5">
                          {getDateRangeLabel(takenRecord.dates)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5625rem] font-semibold text-blue-700">
                            {takenRecord.dates.length}{" "}
                            {takenRecord.dates.length === 1 ? "día" : "días"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                          {originalRequest ? formatDate(originalRequest.sentAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-[0.625rem] text-slate-500"
                        colSpan={activeTab === "Solicitudes" ? 5 : 3}
                      >
                        {activeTab === "Solicitudes"
                          ? "No hay solicitudes que coincidan con los filtros."
                          : "No hay francos gozados registrados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="hr-data-table-footer flex flex-col justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.5625rem] text-slate-500 sm:flex-row sm:items-center sm:px-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span aria-live="polite">
                  Mostrando{" "}
                  <strong className="font-semibold text-slate-800">
                    {visibleRows.length === 0 ? 0 : `${startIndex + 1}-${endIndex}`} de {visibleRows.length}
                  </strong>{" "}
                  {activeTab === "Solicitudes"
                    ? "solicitudes del período seleccionado"
                    : "francos gozados"}
                </span>
                <label className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-600">
                  <span>Filas por página:</span>
                  <Select
                    aria-label="Filas por página"
                    className="min-w-[3.25rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    value={pageSize}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </Select>
                </label>
              </div>
              <PaginationControls
                currentPage={currentPage}
                onPageChange={setPage}
                totalPages={totalPages}
              />
            </footer>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
