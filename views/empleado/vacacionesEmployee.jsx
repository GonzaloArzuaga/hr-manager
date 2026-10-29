import React, { useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import PaginationControls from "../../components/PaginationControls";
import VacationAvailableBalanceCard from "../../components/cards/empleado/VacationAvailableBalanceCard";
import VacationPendingDaysCard from "../../components/cards/empleado/VacationPendingDaysCard";
import VacationTakenDaysCard from "../../components/cards/empleado/VacationTakenDaysCard";
import { usePagination } from "../../hooks/usePagination";
import { getBusinessRules } from "../../data/businessRules";
import { vacacionesData } from "../../data/vacacionesData";
import { entitlementFor, store } from "../../lib/store";
import { cancelMyRequest, submitVacation } from "../../lib/api";
import { toDateKey } from "../../lib/format";
import Select from "../../components/Select";

// Solicitudes propias con la forma que usa esta pantalla
function getOwnRequests() {
  const today = toDateKey(new Date());
  return vacacionesData.requests
    .filter((request) => request.employeeId === store.currentEmployee?.id)
    .map((request) => ({
      id: request.id,
      period: `${request.startDate} al ${request.endDate}`,
      startDate: request.startKey,
      endDate: request.endKey,
      detail: request.status === "Rechazada" && request.resolution
        ? `Motivo: ${request.resolution}`
        : "Solicitud de vacaciones",
      days: request.days,
      requestedAt: request.requestDate,
      cycle: `Ciclo ${request.period}`,
      status: request.status === "Aprobada" && request.endKey < today ? "Gozado" : request.status,
    }));
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

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDisplayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getDatesInRange(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return [];

  const dates = [];
  const date = new Date(`${startDate}T12:00:00`);
  const lastDate = new Date(`${endDate}T12:00:00`);
  while (date <= lastDate) {
    dates.push(getLocalDateValue(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

function VacationDateRangePicker({
  initialStartDate,
  initialEndDate,
  calendarYear,
  minimumDate,
  maxDays,
  blockedDates,
  onSelectionChange,
  onClose,
}) {
  const today = getLocalDateValue(new Date());
  const firstMonth = new Date(calendarYear, 0, 1);
  const lastMonth = new Date(calendarYear, 11, 1);
  const [visibleMonth, setVisibleMonth] = useState(
    initialStartDate
      ? new Date(
          Number(initialStartDate.slice(0, 4)),
          Number(initialStartDate.slice(5, 7)) - 1,
          1,
        )
      : new Date(
          calendarYear,
          calendarYear === new Date().getFullYear()
            ? new Date().getMonth()
            : 0,
          1,
        ),
  );
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const blockedDateSet = new Set(blockedDates);

  function selectDate(date) {
    let nextStart = initialStartDate;
    let nextEnd = initialEndDate;
    if (!initialStartDate || initialEndDate || date < initialStartDate) {
      nextStart = date;
      nextEnd = "";
    } else {
      nextEnd = date;
    }
    onSelectionChange(nextStart, nextEnd);
  }

  return (
    <section
      aria-label="Selector de período de vacaciones"
      className="absolute left-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      role="dialog"
    >
      <div className="mb-3 flex h-8 items-center justify-between">
        <button
          aria-label="Mes anterior"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          disabled={visibleMonth <= firstMonth}
          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          type="button"
        >
          <Icon className="h-3.5 w-3.5">
            <path d="M15 19l-7-7 7-7" />
          </Icon>
        </button>
        <h3 className="text-center text-xs font-bold capitalize text-slate-900">
          {new Intl.DateTimeFormat("es-AR", {
            month: "long",
            year: "numeric",
          }).format(visibleMonth)}
        </h3>
        <button
          aria-label="Mes siguiente"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          disabled={visibleMonth >= lastMonth}
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          type="button"
        >
          <Icon className="h-3.5 w-3.5">
            <path d="M9 5l7 7-7 7" />
          </Icon>
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-[0.5625rem] font-bold uppercase tracking-wide text-slate-400">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-[0.625rem]">
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span aria-hidden="true" className="h-8" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, monthIndex, index + 1);
          const value = getLocalDateValue(date);
          const isStart = value === initialStartDate;
          const isEnd = value === initialEndDate;
          const isInRange =
            initialStartDate &&
            initialEndDate &&
            value > initialStartDate &&
            value < initialEndDate;
          const crossesBlockedDate =
            initialStartDate &&
            !initialEndDate &&
            value > initialStartDate &&
            blockedDates.some(
              (blockedDate) =>
                blockedDate > initialStartDate && blockedDate <= value,
            );
          const maxDate =
            initialStartDate && maxDays > 0
              ? getLocalDateValue(
                  new Date(
                    new Date(`${initialStartDate}T12:00:00`).getTime() +
                      (maxDays - 1) * 86400000,
                  ),
                )
              : "";
          const disabled =
            date.getFullYear() !== calendarYear ||
            value < minimumDate ||
            blockedDateSet.has(value) ||
            crossesBlockedDate ||
            (initialStartDate &&
              !initialEndDate &&
              (value < initialStartDate || value > maxDate));
          const isBlocked = blockedDateSet.has(value);

          return (
            <button
              aria-label={new Intl.DateTimeFormat("es-AR", {
                dateStyle: "full",
              }).format(date)}
              aria-pressed={isStart || isEnd}
              className={`relative flex h-8 items-center justify-center font-medium transition ${
                isBlocked
                  ? "cursor-not-allowed rounded-lg bg-slate-200 font-semibold text-slate-500"
                  : isStart || isEnd
                  ? "rounded-lg bg-blue-700 font-bold text-white"
                  : isInRange
                    ? "bg-blue-100 font-semibold text-blue-900"
                    : disabled
                      ? "cursor-not-allowed rounded-lg text-slate-300"
                      : "rounded-lg text-slate-700 hover:bg-slate-100"
              }`}
              disabled={disabled}
              key={value}
              onClick={() => selectDate(value)}
              type="button"
            >
              {index + 1}
              {value === today && (
                <span className="absolute bottom-0.5 text-[0.375rem] uppercase leading-none text-blue-200">
                  Hoy
                </span>
              )}
            </button>
          );
        })}
      </div>
      <footer className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span aria-live="polite" className="text-[0.5625rem] font-semibold text-slate-600">
          {initialStartDate
            ? `${formatDisplayDate(initialStartDate)} ${
                initialEndDate ? `- ${formatDisplayDate(initialEndDate)}` : "- Hasta"
              }`
            : "Elegí la fecha de inicio"}
        </span>
        <button
          className="rounded-lg bg-blue-700 px-3 py-1.5 text-[0.5625rem] font-semibold text-white transition hover:bg-blue-800"
          onClick={onClose}
          type="button"
        >
          Aplicar
        </button>
      </footer>
    </section>
  );
}

function RequestStatus({ status }) {
  const isPending = status === "Pendiente";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.5625rem] font-semibold ${
        isPending
          ? "border-blue-100 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isPending ? "bg-blue-600" : "bg-slate-500"
        }`}
      />
      {status}
    </span>
  );
}

function formatLocalDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export default function VacacionesEmployee() {
  const businessRules = getBusinessRules();
  const employee = store.currentEmployee;
  const currentYear = new Date().getFullYear();
  const currentCycle = `${currentYear} / ${currentYear + 1}`;
  const accrualPeriods = Array.from({ length: 5 }, (_, index) => {
    const startYear = currentYear + index;
    return `${startYear} / ${startYear + 1}`;
  });
  const [requests, setRequests] = useState(getOwnRequests);
  const [submitting, setSubmitting] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [selectedPeriod, setSelectedPeriod] = useState(currentCycle);
  const selectedAccrualYear = Number(selectedPeriod.split(" / ")[0]);
  const vacationEntitlement = entitlementFor(employee, selectedAccrualYear);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("Solicitudes");
  const requestsForSelectedPeriod = requests.filter(
    (request) =>
      request.cycle === `Ciclo ${selectedPeriod}` &&
      ["Aprobada", "Pendiente", "Gozado"].includes(request.status),
  );
  const daysAlreadyUsed = requestsForSelectedPeriod.reduce(
    (total, request) => total + request.days,
    0,
  );
  const blockedDates = requestsForSelectedPeriod.flatMap((request) =>
    getDatesInRange(request.startDate, request.endDate),
  );
  const periodAllowance = accrualPeriods.includes(selectedPeriod)
    ? vacationEntitlement
    : 0;
  const remainingDays = Math.max(0, periodAllowance - daysAlreadyUsed);
  const dayCount =
    startDate && endDate && endDate >= startDate
      ? Math.round(
          (new Date(`${endDate}T12:00:00`) -
            new Date(`${startDate}T12:00:00`)) /
            86400000,
        ) + 1
      : 0;
  const remainingAfterSelection = Math.max(0, remainingDays - dayCount);
  const earliestDate = new Date();
  earliestDate.setHours(0, 0, 0, 0);
  earliestDate.setDate(earliestDate.getDate() + businessRules.vacationNotice);
  const minimumDate = getLocalDateValue(earliestDate);
  const pendingDays = requests
    .filter((request) => request.status === "Pendiente")
    .reduce((total, request) => total + request.days, 0);
  const requestsCount = requests.filter(
    (request) => request.status !== "Gozado",
  ).length;
  const enjoyedPeriods = requests.filter(
    (request) => request.status === "Gozado",
  );
  const visibleRequests = useMemo(
    () =>
      activeTab === "Solicitudes"
        ? requests.filter((request) => request.status !== "Gozado")
        : enjoyedPeriods,
    [activeTab, enjoyedPeriods, requests],
  );
  const {
    currentPage,
    endIndex,
    pageItems,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(visibleRequests, pageSize);

  function clearSelection() {
    setSelectedPeriod(currentCycle);
    setStartDate("");
    setEndDate("");
    setShowDatePicker(false);
    setNotice("");
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!selectedPeriod || !startDate || !endDate || !dayCount) {
      setNotice("Seleccioná un intervalo de fechas válido.");
      return;
    }
    if (
      Number(startDate.slice(0, 4)) !== selectedAccrualYear ||
      Number(endDate.slice(0, 4)) !== selectedAccrualYear
    ) {
      setNotice(
        `Las fechas deben corresponder al año ${selectedAccrualYear} del período devengado.`,
      );
      return;
    }
    if (startDate < minimumDate) {
      setNotice(
        `Las vacaciones deben solicitarse con al menos ${businessRules.vacationNotice} días de anticipación.`,
      );
      return;
    }
    if (
      getDatesInRange(startDate, endDate).some((date) =>
        blockedDates.includes(date),
      )
    ) {
      setNotice(
        "El intervalo seleccionado incluye días solicitados o aprobados para este período.",
      );
      return;
    }
    if (dayCount > remainingDays) {
      setNotice(
        `El período seleccionado supera los ${remainingDays} días disponibles para este ciclo.`,
      );
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const created = await submitVacation({ startDate, endDate, periodYear: selectedAccrualYear });
      setRequests(getOwnRequests());
      setActiveTab("Solicitudes");
      setStartDate("");
      setEndDate("");
      setShowDatePicker(false);
      toast.success(
        created?.status === "approved"
          ? "Solicitud enviada y aprobada automáticamente según las reglas de tu organización."
          : "Solicitud enviada. Queda pendiente de aprobación.",
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(requestId) {
    const confirmed = await confirmDialog({
      title: "Cancelar solicitud",
      message: "¿Cancelar esta solicitud de vacaciones?",
      confirmLabel: "Cancelar solicitud",
      cancelLabel: "Volver",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await cancelMyRequest("vacation", requestId);
      setRequests(getOwnRequests());
      toast.success("La solicitud se canceló.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500">
                <span>Portal del empleado</span>
                <span aria-hidden="true">&gt;</span>
                <span className="text-blue-600">Gestión de vacaciones</span>
              </div>
              <h1 className="page-title">
                Mis Vacaciones
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-4 w-4">
                  <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                </Icon>
              </span>
              <div>
                <span className="block text-[0.5625rem] font-medium text-slate-400">
                  Antigüedad
                </span>
                <span className="block text-[0.625rem] font-bold text-slate-800">
                  {employee?.tenureLabel}
                </span>
              </div>
            </div>
          </header>

          <section
            aria-label="Resumen de vacaciones"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <VacationAvailableBalanceCard
              period={selectedPeriod}
              value={remainingDays}
            />
            <VacationPendingDaysCard value={pendingDays} />
            <VacationTakenDaysCard cycle={currentCycle} value="0" />
          </section>

          <section className="mb-5">
            <div className="relative rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="relative mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Solicitar Período Vacacional
                  </h2>
                </div>
              </div>

              <form className="space-y-4" onSubmit={submitRequest}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label
                      className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
                      htmlFor="vacation-period"
                    >
                      Período Devengado <span className="text-red-600">*</span>
                    </label>
                    <Select
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-0 text-[0.5625rem] leading-8 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      id="vacation-period"
                      onChange={(event) => {
                        setSelectedPeriod(event.target.value);
                        setStartDate("");
                        setEndDate("");
                        setNotice("");
                      }}
                      required
                      value={selectedPeriod}
                    >
                      <option value="">Seleccionar período...</option>
                      {accrualPeriods.map((period) => (
                        <option key={period} value={period}>
                          Ciclo {period}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="relative">
                    <span className="mb-1 block text-[0.6875rem] font-semibold text-slate-700">
                      Fecha Desde - Hasta <span className="text-red-600">*</span>
                    </span>
                    <button
                      aria-label="Seleccionar período de vacaciones"
                      className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-left text-[0.5625rem] text-slate-700 transition hover:border-blue-400 hover:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedPeriod || remainingDays === 0}
                      onClick={() => setShowDatePicker(true)}
                      type="button"
                    >
                      <span className="truncate font-medium">
                        {startDate
                          ? `${formatDisplayDate(startDate)} - ${
                              endDate ? formatDisplayDate(endDate) : "Hasta"
                            }`
                          : "Desde - Hasta"}
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-blue-700">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2-2Z" />
                      </Icon>
                    </button>
                    {showDatePicker && (
                      <VacationDateRangePicker
                        calendarYear={selectedAccrualYear}
                        initialEndDate={endDate}
                        initialStartDate={startDate}
                        key={selectedPeriod}
                        maxDays={remainingDays}
                        blockedDates={blockedDates}
                        minimumDate={minimumDate}
                        onClose={() => setShowDatePicker(false)}
                        onSelectionChange={(nextStart, nextEnd) => {
                          setStartDate(nextStart);
                          setEndDate(nextEnd);
                          setNotice("");
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <span className="mb-1 block text-[0.6875rem] font-semibold text-slate-700">
                      Días restantes
                    </span>
                    <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200/80 bg-blue-50 px-2.5">
                      <span className="text-[0.5625rem] font-bold text-blue-700">
                        {selectedPeriod ? `${remainingAfterSelection} días` : "—"}
                      </span>
                      <span className="text-[0.5625rem] text-slate-500">
                        para el ciclo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                      onClick={clearSelection}
                      type="button"
                    >
                      Limpiar formulario
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
                      disabled={submitting}
                      type="submit"
                    >
                      <Icon className="h-3 w-3">
                        <path d="M12 4v16m8-8H4" />
                      </Icon>
                      Solicitar Vacaciones
                    </button>
                </div>
                {notice && (
                  <p
                    aria-live="polite"
                    className={`text-[0.625rem] font-medium ${
                      notice.startsWith("Solicitud registrada")
                        ? "text-emerald-700"
                        : "text-rose-600"
                    }`}
                    role="status"
                  >
                    {notice}
                  </p>
                )}
              </form>
            </div>

          </section>

          <section aria-label="Historial de vacaciones">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { label: "Solicitudes", count: requestsCount },
                { label: "Periodos Gozados", count: enjoyedPeriods.length },
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
            <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className={`hr-data-table w-full ${activeTab === "Solicitudes" ? "min-w-[47.5rem]" : "min-w-[35rem]"} border-collapse text-left text-[0.5625rem]`}>
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[0.5rem] font-bold uppercase tracking-wider text-slate-400">
                      {activeTab === "Solicitudes" ? (
                        <>
                          <th className="px-4 py-3 font-semibold sm:px-5">Fecha solicitud</th>
                          <th className="px-3 py-3 font-semibold">Periodo solicitado</th>
                          <th className="px-3 py-3 font-semibold">Cantidad de días</th>
                          <th className="px-4 py-3 text-right font-semibold sm:px-5">Estado</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 font-semibold sm:px-5">Periodo gozado</th>
                          <th className="px-3 py-3 font-semibold">Cantidad de días</th>
                          <th className="px-4 py-3 font-semibold sm:px-5">Periodo</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {pageItems.length > 0 ? (
                      pageItems.map((request, index) => activeTab === "Solicitudes" ? (
                        <tr className="transition-colors hover:bg-slate-50/60" key={request.id ?? `${request.period}-${index}`}>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 sm:px-5">
                            {request.requestedAt}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">
                            {request.period}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5625rem] font-semibold text-blue-700">
                              {request.days} días corridos
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                            <RequestStatus status={request.status} />
                            {request.status === "Pendiente" && (
                              <button
                                className="ml-2 rounded-md px-1.5 py-0.5 text-[0.5625rem] font-semibold text-rose-700 hover:bg-rose-50"
                                onClick={() => cancelRequest(request.id)}
                                type="button"
                              >
                                Cancelar
                              </button>
                            )}
                            {request.status === "Rechazada" && request.detail.startsWith("Motivo") && (
                              <span className="mt-0.5 block text-[0.5rem] text-rose-700">{request.detail}</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        <tr className="transition-colors hover:bg-slate-50/60" key={request.id ?? `${request.period}-${index}`}>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900 sm:px-5">
                            {request.period}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.5625rem] font-semibold text-blue-700">
                              {request.days} días corridos
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 sm:px-5">
                            {request.cycle}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-[0.625rem] text-slate-500 sm:px-5"
                          colSpan={activeTab === "Solicitudes" ? 4 : 3}
                        >
                          {activeTab === "Solicitudes"
                            ? "No hay solicitudes registradas."
                            : "No hay períodos gozados registrados."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="hr-data-table-footer flex flex-col items-start justify-between gap-2 border-t border-slate-200/80 bg-white px-3 py-2.5 text-[0.5625rem] text-slate-600 sm:flex-row sm:items-center sm:px-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span aria-live="polite">
                    Mostrando{" "}
                    <span className="font-semibold text-slate-900">
                      {visibleRequests.length === 0
                        ? 0
                        : `${startIndex + 1}-${endIndex}`}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-slate-900">
                      {visibleRequests.length}
                    </span>{" "}
                    {activeTab === "Solicitudes"
                      ? "solicitudes registradas"
                      : "períodos gozados"}
                  </span>
                  <label className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-600">
                    <span>Filas por página:</span>
                    <Select
                      aria-label="Filas por página"
                      className="min-w-[4.5rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onChange={(event) =>
                        setPageSize(Number(event.target.value))
                      }
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
