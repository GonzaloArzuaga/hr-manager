import React, { useMemo, useState } from "react";
import { employeeOptionLabel } from "../../data/employeeDirectory";
import { DateField } from "../../components/DateTimeFields";
import { fieldClass, labelClass } from "../../components/fieldStyles";
import { CheckIcon } from "../../components/icons";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import PaginationControls from "../../components/PaginationControls";
import VacationMetricCard from "../../components/cards/empleador/VacationMetricCard";
import { usePagination } from "../../hooks/usePagination";
import {
  getBusinessRules,
} from "../../data/businessRules";
import { entitlementFor } from "../../lib/store";
import { assignVacation, resolveVacation } from "../../lib/api";
import { vacacionesData } from "../../data/vacacionesData";
import Select from "../../components/Select";

const filters = ["Todas", "Pendientes", "Aprobadas", "Rechazadas"];
const statusForFilter = {
  Todas: null,
  Pendientes: "Pendiente",
  Aprobadas: "Aprobada",
  Rechazadas: "Rechazada",
};
const initialForm = {
  employeeId: "",
  period: "",
  startDate: "",
  endDate: "",
};

function Icon({ className = "h-4 w-4", children }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAccrualPeriods() {
  const firstYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, index) => {
    const year = firstYear + index;
    return { value: `${year} / ${year + 1}`, label: `${year} - ${year + 1}` };
  });
}

function getDayCount(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

function getCounts(requests) {
  return {
    Todas: requests.length,
    Pendientes: requests.filter((request) => request.status === "Pendiente").length,
    Aprobadas: requests.filter((request) => request.status === "Aprobada").length,
    Rechazadas: requests.filter((request) => request.status === "Rechazada").length,
  };
}

function StatusBadge({ status }) {
  const styles = {
    Pendiente: "bg-amber-50 text-amber-700 ring-amber-200/50",
    Aprobada: "bg-emerald-50 text-emerald-700 ring-emerald-200/50",
    Rechazada: "bg-rose-50 text-rose-700 ring-rose-200/50",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold ring-1 ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function RequestRow({ request, employee, onResolve }) {
  return (
    <tr className="transition-colors hover:bg-slate-50/80">
      <td className="employee-identity-cell px-[0.3125rem] py-2.5 text-left">
        <EmployeeIdentity
          avatarStyle={employee.avatarStyle}
          employeeId={employee.id}
          department={employee.department}
          initials={employee.initials}
          name={employee.name}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[0.5625rem] font-medium text-slate-600">
        {request.requestDate}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1 text-[0.5625rem]">
          <span className="font-semibold text-slate-900">{request.startDate}</span>
          <span className="text-slate-400">→</span>
          <span className="font-semibold text-slate-900">{request.endDate}</span>
          <span className="rounded border border-blue-200/50 bg-blue-50 px-1 py-0.5 text-[0.5rem] font-bold text-blue-700">
            {request.days} días
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[0.5625rem] font-semibold text-slate-700">
        {request.remainingBalance} días
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <StatusBadge status={request.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center">
        {request.status === "Pendiente" ? (
          <div className="flex items-center justify-center gap-1">
            <button
              aria-label={`Aprobar vacaciones de ${employee.name}`}
              className="inline-flex items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50 px-2 py-1 text-[0.5625rem] font-semibold text-emerald-700 transition hover:bg-emerald-100"
              onClick={() => onResolve(request.id, "Aprobada")}
              type="button"
            >
              <Icon className="h-3 w-3">
                <path d="M5 13l4 4L19 7" />
              </Icon>
              Aprobar
            </button>
            <button
              aria-label={`Rechazar vacaciones de ${employee.name}`}
              className="inline-flex items-center gap-1 rounded border border-rose-200/70 bg-rose-50 px-2 py-1 text-[0.5625rem] font-semibold text-rose-700 transition hover:bg-rose-100"
              onClick={() => onResolve(request.id, "Rechazada")}
              type="button"
            >
              <Icon className="h-3 w-3">
                <path d="M6 18L18 6M6 6l12 12" />
              </Icon>
              Rechazar
            </button>
          </div>
        ) : (
          <span className="font-bold text-slate-400">-</span>
        )}
      </td>
    </tr>
  );
}

export default function VacacionesEmployer() {
  const [requests, setRequests] = useState(vacacionesData.requests);
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const counts = getCounts(requests);
  const businessRules = getBusinessRules();
  const selectedEmployee = vacacionesData.employees.find(
    (employee) => employee.id === form.employeeId,
  );
  const computedDays = getDayCount(form.startDate, form.endDate);
  const daysAlreadyUsedInPeriod =
    selectedEmployee && form.period
      ? requests
          .filter(
            (request) =>
              request.employeeId === selectedEmployee.id &&
              request.period === form.period &&
              request.status !== "Rechazada",
          )
          .reduce((total, request) => total + request.days, 0)
      : 0;
  const periodYear = form.period ? Number(form.period.slice(0, 4)) : null;
  const periodAllowance = selectedEmployee && periodYear
    ? entitlementFor(selectedEmployee, periodYear)
    : 0;
  const remainingBeforeSelection = Math.max(
    0,
    periodAllowance - daysAlreadyUsedInPeriod,
  );
  const remainingAfterSelection =
    selectedEmployee && form.period && form.startDate && form.endDate
      ? Math.max(0, remainingBeforeSelection - computedDays)
      : remainingBeforeSelection;
  const accrualPeriods = getAccrualPeriods();
  // Las fechas no tienen límite de año: solo no pueden empezar antes de hoy.
  // El calendario abre en el año del período elegido para que sea más cómodo.
  const todayValue = getLocalDateValue(new Date());
  const periodStart = todayValue;
  const periodOpenAt = periodYear && `${periodYear}-01-01` > todayValue ? `${periodYear}-01-01` : todayValue;
  const exceedsBalance = computedDays > remainingBeforeSelection;

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    const requestedStatus = statusForFilter[filter];

    return requests.filter((request) => {
      const employee = vacacionesData.employees.find(
        (item) => item.id === request.employeeId,
      );
      const matchesStatus =
        requestedStatus === null || request.status === requestedStatus;
      const matchesSearch =
        query.length === 0 ||
        `${employee.name} ${employee.id} ${employee.department}`
          .toLocaleLowerCase("es")
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [filter, requests, search]);
  const {
    currentPage,
    endIndex,
    pageItems: visibleRequests,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(filteredRequests, pageSize);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "employeeId" || name === "period"
        ? { startDate: "", endDate: "" }
        : {}),
    }));
    setFormError("");
  }

  function clearForm() {
    setForm(initialForm);
    setFormError("");
  }

  async function registerVacation(event) {
    event.preventDefault();
    if (!selectedEmployee) {
      setFormError("Seleccioná un empleado para registrar las vacaciones.");
      return;
    }
    if (!form.period) {
      setFormError("Seleccioná el período devengado.");
      return;
    }
    if (!form.startDate || !form.endDate || !computedDays) {
      setFormError("Seleccioná una fecha de inicio y otra de fin.");
      return;
    }
    if (form.startDate < getLocalDateValue(new Date())) {
      setFormError("No se pueden registrar vacaciones que empiezan en una fecha pasada.");
      return;
    }
    if (computedDays > remainingBeforeSelection) {
      setFormError(
        `El período seleccionado supera los ${remainingBeforeSelection} días disponibles para este empleado en el ciclo elegido.`,
      );
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await assignVacation({
        employeeDbId: selectedEmployee.dbId,
        startDate: form.startDate,
        endDate: form.endDate,
        periodYear,
      });
      setRequests([...vacacionesData.requests]);
      setFilter("Todas");
      setSearch("");
      clearForm();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function resolveRequest(requestId, nextStatus) {
    const approve = nextStatus === "Aprobada";
    let note = null;
    if (!approve) {
      note = await promptDialog({
        title: "Rechazar solicitud",
        message: "El empleado va a ver este motivo en su notificación.",
        label: "Motivo del rechazo",
        placeholder: "Ej. Se superpone con otra ausencia del área",
        confirmLabel: "Rechazar",
        required: true,
        tone: "danger",
      });
      if (note === null) return;
    }
    setActionError("");
    try {
      await resolveVacation(requestId, approve, note);
      setRequests([...vacacionesData.requests]);
      toast.success(approve ? "Solicitud de vacaciones aprobada." : "Solicitud de vacaciones rechazada.");
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-[0.8125rem] text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500">
                <span>Operaciones &amp; RRHH</span>
                <Icon className="h-3 w-3 text-slate-400">
                  <path d="M9 5l7 7-7 7" />
                </Icon>
                <span className="font-medium text-blue-700">
                  Vacaciones del Personal
                </span>
              </div>
              <h1 className="page-title">
                Gestión de Vacaciones
              </h1>
            </div>
          </header>

          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="mb-3 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Asignación de Vacaciones
              </h2>
            </div>
            <form className="space-y-3" onSubmit={registerVacation}>
              <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label
                    className={labelClass}
                    htmlFor="vacation-employee"
                  >
                    Empleado <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <Select
                    className={fieldClass}
                    id="vacation-employee"
                    name="employeeId"
                    onChange={updateForm}
                    required
                    value={form.employeeId}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {vacacionesData.employees.filter((employee) => employee.status !== "Baja").map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employeeOptionLabel(employee)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label
                    className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
                    htmlFor="vacation-period"
                  >
                    Período Devengado{" "}
                    <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <Select
                    className={fieldClass}
                    disabled={!form.employeeId}
                    id="vacation-period"
                    name="period"
                    onChange={updateForm}
                    required
                    value={form.period}
                  >
                    <option value="">Seleccionar período...</option>
                    {accrualPeriods.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass} htmlFor="vacation-start">
                    Fecha desde <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <DateField
                    className={fieldClass}
                    disabled={!form.employeeId || !form.period}
                    id="vacation-start"
                    min={periodStart}
                    name="startDate"
                    openAt={periodOpenAt}
                    onChange={(event) => {
                      const startDate = event.target.value;
                      setForm((current) => ({
                        ...current,
                        startDate,
                        endDate: current.endDate && current.endDate < startDate ? "" : current.endDate,
                      }));
                      setFormError("");
                    }}
                    required
                    value={form.startDate}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass} htmlFor="vacation-end">
                    Fecha hasta <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <DateField
                    className={fieldClass}
                    disabled={!form.employeeId || !form.period}
                    id="vacation-end"
                    min={form.startDate || periodStart}
                    name="endDate"
                    openAt={form.startDate || periodOpenAt}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, endDate: event.target.value }));
                      setFormError("");
                    }}
                    required
                    value={form.endDate}
                  />
                </div>
              </div>
              {selectedEmployee && form.period && (
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
                        {computedDays} <span className="text-xs font-semibold">{computedDays === 1 ? "día" : "días"}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Disponibles en el período</p>
                      <p className="text-lg font-bold leading-tight text-slate-800">{remainingBeforeSelection} días</p>
                    </div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Quedarían</p>
                      <p className={`text-lg font-bold leading-tight ${exceedsBalance ? "text-rose-700" : "text-emerald-700"}`}>
                        {exceedsBalance ? `Excede por ${computedDays - remainingBeforeSelection}` : `${remainingAfterSelection} días`}
                      </p>
                    </div>
                  </div>
                  {(form.startDate || form.endDate) && (
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                      onClick={() => {
                        setForm((current) => ({ ...current, startDate: "", endDate: "" }));
                        setFormError("");
                      }}
                      type="button"
                    >
                      Cancelar selección de fechas
                    </button>
                  )}
                </div>
              )}
              {formError && (
                <p className="text-[0.625rem] font-medium text-rose-600" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  onClick={clearForm}
                  type="button"
                >
                  Limpiar formulario
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <CheckIcon />
                  Registrar Vacaciones
                </button>
              </div>
            </form>
          </section>

          <section
            aria-label="Indicadores de vacaciones"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <VacationMetricCard
              actionHref="#requests"
              actionLabel="Ver todas"
              badge="Revisión"
              note={`${vacacionesData.summary.upcomingDeadlines} con fecha límite próxima`}
              title="Solicitudes pendientes"
              tone="amber"
              value={counts.Pendientes}
            />
            <VacationMetricCard
              actionHref="#requests"
              actionLabel="Nómina"
              icon="umbrella"
              note={`Planta operativa activa: ${vacacionesData.summary.activeStaffing}%`}
              title="En goce de vacaciones"
              tone="green"
              value={vacacionesData.summary.onLeave}
            />
            <VacationMetricCard
              actionLabel="Cumplido"
              icon="calendar"
              note={vacacionesData.summary.staffingStatus}
              title="Días asignados mes"
              tone="blue"
              value={vacacionesData.summary.daysAssignedThisMonth}
            />
            <VacationMetricCard
              icon="balance"
              note={vacacionesData.summary.legalExpiry}
              suffix="días / colab."
              title="Saldo promedio de días"
              tone="blue"
              value={vacacionesData.summary.averageBalance}
            />
          </section>

          <section
            className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
            id="requests"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Solicitudes de Vacaciones
                </h2>
                <span className="rounded-full border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-[0.5625rem] font-semibold text-blue-700">
                  {counts.Todas} en total
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  aria-label="Filtrar solicitudes"
                  className="inline-flex overflow-x-auto rounded-lg bg-slate-100 p-0.5 text-[0.5625rem] font-medium text-slate-600"
                >
                  {filters.map((item) => (
                    <button
                      aria-pressed={filter === item}
                      className={`whitespace-nowrap rounded-md px-2 py-1 transition ${
                        filter === item
                          ? "bg-white font-semibold text-blue-700 shadow-sm"
                          : "hover:text-slate-900"
                      }`}
                      key={item}
                      onClick={() => setFilter(item)}
                      type="button"
                    >
                      {item} ({counts[item]})
                    </button>
                  ))}
                </div>
                <label className="relative min-w-[12.5rem]">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <Icon className="h-3 w-3">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </Icon>
                  </span>
                  <input
                    aria-label="Buscar por empleado o legajo"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-3 text-[0.5625rem] placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por empleado o legajo..."
                    type="search"
                    value={search}
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              {actionError && (
                <p className="mx-3 my-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.625rem] font-medium text-rose-700" role="alert">
                  {actionError}
                </p>
              )}
              <table className="hr-data-table hr-data-table--standard w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[0.5rem] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5 text-left sm:px-4">EMPLEADO</th>
                    <th className="px-3 py-2.5 sm:px-4">Fecha solicitud</th>
                    <th className="px-3 py-2.5 text-center sm:px-4">Período solicitado</th>
                    <th className="px-3 py-2.5 sm:px-4">Saldo restante</th>
                    <th className="px-3 py-2.5 sm:px-4">Estado</th>
                    <th className="px-3 py-2.5 text-center sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[0.5625rem] text-slate-700">
                  {visibleRequests.map((request) => {
                    const employee = vacacionesData.employees.find(
                      (item) => item.id === request.employeeId,
                    );

                    return (
                      <RequestRow
                        employee={employee}
                        key={request.id}
                        onResolve={resolveRequest}
                        request={request}
                      />
                    );
                  })}
                  {visibleRequests.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-xs text-slate-500"
                        colSpan="6"
                      >
                        No hay solicitudes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="hr-data-table-footer flex flex-col items-start justify-between gap-2 border-t border-slate-200/80 bg-white px-3 py-2.5 text-[0.5625rem] text-slate-600 sm:flex-row sm:items-center sm:px-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span>
                  Mostrando{" "}
                  <span className="font-semibold text-slate-900">
                    {filteredRequests.length === 0
                      ? 0
                      : `${startIndex + 1}-${endIndex}`}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-900">
                    {counts.Todas}
                  </span>{" "}
                  solicitudes registradas
                </span>
                <label className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-600">
                  <span>Filas por página:</span>
                  <Select
                    aria-label="Filas por página"
                    className="min-w-[4.5rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          </section>
        </div>
      </main>
    </div>
  );
}