import React, { useMemo, useState } from "react";
import { CheckIcon } from "../../components/icons";
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
import { DateField } from "../../components/DateTimeFields";
import { fieldClass, labelClass } from "../../components/fieldStyles";

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
  // Mismo criterio que el empleador: sin límite de año, el calendario abre en el período elegido
  const periodOpenAt =
    `${selectedAccrualYear}-01-01` > minimumDate ? `${selectedAccrualYear}-01-01` : minimumDate;
  const exceedsBalance = dayCount > remainingDays;
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
    setNotice("");
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!selectedPeriod || !startDate || !endDate || !dayCount) {
      setNotice("Seleccioná un intervalo de fechas válido.");
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
                    <label className={labelClass} htmlFor="vacation-period">
                      Período Devengado <span className="text-red-600">*</span>
                    </label>
                    <Select
                      className={fieldClass}
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
                  <div>
                    <label className={labelClass} htmlFor="vacation-start">
                      Fecha desde <span aria-hidden="true" className="text-red-600">*</span>
                    </label>
                    <DateField
                      className={fieldClass}
                      disabled={!selectedPeriod || remainingDays === 0}
                      id="vacation-start"
                      min={minimumDate}
                      name="startDate"
                      onChange={(event) => {
                        const next = event.target.value;
                        setStartDate(next);
                        if (endDate && endDate < next) setEndDate("");
                        setNotice("");
                      }}
                      openAt={periodOpenAt}
                      required
                      value={startDate}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="vacation-end">
                      Fecha hasta <span aria-hidden="true" className="text-red-600">*</span>
                    </label>
                    <DateField
                      className={fieldClass}
                      disabled={!selectedPeriod || remainingDays === 0}
                      id="vacation-end"
                      min={startDate || minimumDate}
                      name="endDate"
                      onChange={(event) => {
                        setEndDate(event.target.value);
                        setNotice("");
                      }}
                      openAt={startDate || periodOpenAt}
                      required
                      value={endDate}
                    />
                  </div>
                </div>

                {selectedPeriod && (
                  <div
                    aria-live="polite"
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      exceedsBalance ? "border-rose-200 bg-rose-50" : "border-blue-100 bg-blue-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div>
                        <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Días seleccionados</p>
                        <p className={`text-2xl font-extrabold leading-tight ${exceedsBalance ? "text-rose-700" : "text-blue-800"}`} data-testid="vacation-selected-days">
                          {dayCount} <span className="text-xs font-semibold">{dayCount === 1 ? "día" : "días"}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Disponibles en el período</p>
                        <p className="text-lg font-bold leading-tight text-slate-800">{remainingDays} días</p>
                      </div>
                      <div>
                        <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Quedarían</p>
                        <p className={`text-lg font-bold leading-tight ${exceedsBalance ? "text-rose-700" : "text-emerald-700"}`}>
                          {exceedsBalance ? `Excede por ${dayCount - remainingDays}` : `${remainingAfterSelection} días`}
                        </p>
                      </div>
                    </div>
                    {(startDate || endDate) && (
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                          setNotice("");
                        }}
                        type="button"
                      >
                        Cancelar selección de fechas
                      </button>
                    )}
                  </div>
                )}

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
                      <CheckIcon />
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
