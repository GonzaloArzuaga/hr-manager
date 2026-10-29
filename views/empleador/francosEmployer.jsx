import React, { useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import PaginationControls from "../../components/PaginationControls";
import FrancoMetricCard from "../../components/cards/empleador/FrancoMetricCard";
import { usePagination } from "../../hooks/usePagination";
import {
  getBusinessRules,
  getMonthlyFrancoAllowance,
} from "../../data/businessRules";
import { assignDaysOff, resolveDaysOff } from "../../lib/api";
import { empleadosData } from "../../data/empleadosData";
import { getEmployeeById } from "../../data/employeeDirectory";
import { francosData } from "../../data/francosData";
import Select from "../../components/Select";

const statusOptions = ["Todos", "Pendiente de revisión", "Aceptado", "Rechazado"];
const requestStatusOrder = {
  "Pendiente de revisión": 0,
  Aceptado: 1,
  Rechazado: 2,
};

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isPastDayInCurrentMonth(month, day) {
  const now = new Date();
  return month === getCurrentMonth() && day < now.getDate();
}

function getRequestDates(request) {
  return request.requestedDates ?? [request.requestedDate];
}

function getPreviousMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const previousMonth = new Date(year, month - 2, 1);
  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;
}

function requestIncludesMonth(request, monthValue) {
  return getRequestDates(request).some((date) => date.startsWith(`${monthValue}-`));
}

function getMonthFrancoCount(requests, status, monthValue) {
  return requests
    .filter(
      (request) =>
        request.status === status && requestIncludesMonth(request, monthValue),
    )
    .reduce(
      (count, request) =>
        count +
        getRequestDates(request).filter((date) =>
          date.startsWith(`${monthValue}-`),
        ).length,
      0,
    );
}

function formatMonthlyTrend(currentCount, previousCount) {
  if (previousCount === 0) {
    return currentCount === 0 ? "Sin cambios vs mes anterior" : "Sin base mes anterior";
  }

  const percentageChange = Math.round(
    ((currentCount - previousCount) / previousCount) * 100,
  );
  const sign = percentageChange > 0 ? "+" : "";
  return `${sign}${percentageChange}% vs mes anterior`;
}

function formatRequestedDates(dates) {
  const groupedDates = new Map();
  [...dates].sort().forEach((dateValue) => {
    const date = new Date(`${dateValue}T12:00:00`);
    const groupKey = `${date.getFullYear()}-${date.getMonth()}`;
    const group = groupedDates.get(groupKey) ?? {
      days: [],
      month: new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date),
      year: date.getFullYear(),
    };
    group.days.push(new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(date));
    groupedDates.set(groupKey, group);
  });

  return [...groupedDates.values()]
    .map(({ days, month, year }) => {
      const dayList =
        days.length < 2
          ? days[0]
          : `${days.slice(0, -1).join(", ")} y ${days[days.length - 1]}`;
      const capitalizedMonth = month.replace(/^./, (letter) =>
        letter.toLocaleUpperCase("es-AR"),
      );
      return `${dayList} de ${capitalizedMonth} ${year}`;
    })
    .join(" y ");
}

const initialAssignmentForm = {
  employeeId: "",
  month: getCurrentMonth(),
  selectedDays: [],
};
function formatMonthOption(value) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
}

function getDaysInMonth(month) {
  if (!month) return 0;
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

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

function NoticeBadge({ days, requiredDays }) {
  const isOnTime = days >= requiredDays;
  const styles = isOnTime
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-[0.5625rem] font-semibold ${styles}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {days} días - {isOnTime ? "En regla" : "Fuera de término"}
    </span>
  );
}

function StatusBadge({ status }) {
  const statusStyles = {
    "Pendiente de revisión": "bg-blue-50 text-blue-700",
    Aceptado: "bg-emerald-50 text-emerald-700",
    Rechazado: "bg-rose-50 text-rose-700",
  };
  const statusIcon = {
    "Pendiente de revisión": <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    Aceptado: <path d="M5 13l4 4L19 7" />,
    Rechazado: <path d="M6 18L18 6M6 6l12 12" />,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[0.5625rem] font-semibold ${statusStyles[status]}`}
    >
      <Icon className="mr-1 h-3 w-3">{statusIcon[status]}</Icon>
      {status}
    </span>
  );
}

function RequestRow({ employee, request, onResolve, requiredNoticeDays }) {
  const requestedDates = getRequestDates(request);

  return (
    <tr className="border-b border-blue-100 transition-colors last:border-0 hover:bg-slate-50/60">
      <td className="employee-identity-cell whitespace-nowrap py-2.5 pl-3 pr-2 text-left sm:pl-5">
        <EmployeeIdentity
          avatarStyle={employee.avatarStyle}
          avatarClassName="ring-1 ring-current/20"
          department={employee.department}
          initials={employee.initials}
          name={employee.name}
          nameClassName="text-[0.625rem] leading-snug"
          metadataClassName="text-[0.5625rem]"
          size="lg"
        />
      </td>
      <td className="px-2 py-2.5 text-center sm:px-3">
        <div className="text-[0.5625rem] font-bold text-slate-800">
          {formatRequestedDates(requestedDates)}
        </div>
        <div className="mt-0.5 text-[0.5rem] font-semibold text-blue-700">
          {requestedDates.length}{" "}
          {requestedDates.length === 1 ? "franco solicitado" : "francos solicitados"}
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5">
        <NoticeBadge
          days={request.noticeDays}
          requiredDays={requiredNoticeDays}
        />
      </td>
      <td className="whitespace-nowrap px-2 py-2.5">
        <StatusBadge status={request.status} />
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-center sm:px-3">
        {request.status === "Pendiente de revisión" ? (
          <div className="flex items-center justify-center gap-1">
            <button
              aria-label={`Aceptar franco de ${employee.name}`}
              className="inline-flex items-center rounded-md bg-blue-700 px-2 py-1 text-[0.5625rem] font-semibold text-white transition-colors hover:bg-blue-800"
              onClick={() => onResolve(request.id, "Aceptado")}
              type="button"
            >
              <Icon className="mr-1 h-3 w-3">
                <path d="M5 13l4 4L19 7" />
              </Icon>
              Aceptar
            </button>
            <button
              aria-label={`Rechazar franco de ${employee.name}`}
              className="inline-flex items-center rounded-md px-1.5 py-1 text-[0.5625rem] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              onClick={() => onResolve(request.id, "Rechazado")}
              type="button"
            >
              <Icon className="mr-0.5 h-3 w-3">
                <path d="M6 18L18 6M6 6l12 12" />
              </Icon>
              Rechazar
            </button>
          </div>
        ) : (
          <span aria-label="Sin acciones disponibles" className="text-[0.625rem] text-slate-500">
            -
          </span>
        )}
      </td>
    </tr>
  );
}

function RulesDialog({ onClose, requiredNoticeDays, weeklyDaysOff }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="rules-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900" id="rules-title">
            Reglas de francos
          </h2>
          <button
            aria-label="Cerrar reglas"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <Icon>
              <path d="M6 18L18 6M6 6l12 12" />
            </Icon>
          </button>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Las solicitudes deben respetar la cobertura mínima del sector.</li>
          <li>
            El preaviso requerido es de al menos {requiredNoticeDays} días.
          </li>
          <li>
            Cada empleado dispone de {weeklyDaysOff} francos por semana.
          </li>
          <li>Las solicitudes superpuestas requieren revisión antes de aprobarse.</li>
        </ul>
        <button
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          onClick={onClose}
          type="button"
        >
          Entendido
        </button>
      </section>
    </div>
  );
}

export default function FrancosEmployer() {
  const businessRules = getBusinessRules();
  const monthlyFrancoAllowance = getMonthlyFrancoAllowance(
    businessRules.weeklyDaysOff,
  );
  const [requests, setRequests] = useState(francosData.requests);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
  const [status, setStatus] = useState("Todos");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("Todos");
  const [pageSize, setPageSize] = useState(5);
  const [showRules, setShowRules] = useState(false);
  const counts = {
    Todos: requests.length,
    "Pendiente de revisión": requests.filter((request) => request.status === "Pendiente de revisión").length,
    Aceptado: requests.filter((request) => request.status === "Aceptado").length,
    Rechazado: requests.filter((request) => request.status === "Rechazado").length,
  };
  const currentMonth = getCurrentMonth();
  // Meses que aparecen en las solicitudes, más el actual
  const monthOptions = [...new Set([currentMonth, ...requests.flatMap(getRequestDates).map((date) => date.slice(0, 7))])]
    .sort()
    .reverse();
  const previousMonth = getPreviousMonth(currentMonth);
  const approvedThisMonth = requests.filter(
    (request) =>
      request.status === "Aceptado" &&
      requestIncludesMonth(request, currentMonth),
  ).length;
  const approvedDaysThisMonth = getMonthFrancoCount(
    requests,
    "Aceptado",
    currentMonth,
  );
  const approvedDaysPreviousMonth = getMonthFrancoCount(
    requests,
    "Aceptado",
    previousMonth,
  );
  const pendingWithLongNotice = requests.filter(
    (request) => request.status === "Pendiente de revisión" && request.noticeDays > 15,
  ).length;
  const rejectedPercentage =
    requests.length === 0
      ? 0
      : Math.round((counts.Rechazado / requests.length) * 100);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("es");

    return requests
      .filter((request) => {
        const matchesStatus = status === "Todos" || request.status === status;
        const matchesMonth =
          month === "Todos" ||
          getRequestDates(request).some((date) => date.slice(0, 7) === month);
        const employee = getEmployeeById(request.employeeId);
        const matchesSearch =
          normalizedQuery.length === 0 ||
          `${employee.name} ${employee.cuil} ${employee.department}`
            .toLocaleLowerCase("es")
            .includes(normalizedQuery);

        return matchesStatus && matchesMonth && matchesSearch;
      })
      .sort((left, right) => {
        const statusDifference =
          (requestStatusOrder[left.status] ?? Number.MAX_SAFE_INTEGER) -
          (requestStatusOrder[right.status] ?? Number.MAX_SAFE_INTEGER);
        if (statusDifference !== 0) return statusDifference;

        const leftFirstDate = [...getRequestDates(left)].sort()[0];
        const rightFirstDate = [...getRequestDates(right)].sort()[0];
        return leftFirstDate.localeCompare(rightFirstDate);
      });
  }, [month, requests, search, status]);

  const {
    currentPage,
    endIndex,
    pageItems: visibleRequests,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(filteredRequests, pageSize);
  const selectedEmployee = empleadosData.employees.find(
    (employee) => employee.id === assignmentForm.employeeId,
  );
  // Francos ya solicitados, asignados o aprobados del empleado en el mes elegido
  const assignedDaysForPeriod = requests
    .filter(
      (request) =>
        request.employeeId === assignmentForm.employeeId &&
        (request.status === "Aceptado" || request.status === "Pendiente de revisión"),
    )
    .reduce(
      (total, request) =>
        total + getRequestDates(request).filter((date) => date.startsWith(`${assignmentForm.month}-`)).length,
      0,
    );
  const takenDaysForPeriod = new Set(
    requests
      .filter(
        (request) =>
          request.employeeId === assignmentForm.employeeId &&
          (request.status === "Aceptado" || request.status === "Pendiente de revisión"),
      )
      .flatMap(getRequestDates)
      .filter((date) => date.startsWith(`${assignmentForm.month}-`))
      .map((date) => Number(date.slice(8, 10))),
  );
  const remainingFrancos = Math.max(
    0,
    monthlyFrancoAllowance - assignedDaysForPeriod,
  );
  const daysInSelectedMonth = getDaysInMonth(assignmentForm.month);
  const [year, monthNumber] = assignmentForm.month.split("-").map(Number);
  const firstWeekday = assignmentForm.month
    ? new Date(year, monthNumber - 1, 1).getDay()
    : 0;

  function updateAssignmentForm(event) {
    const { name, value } = event.target;
    if (name === "month" && value && value < getCurrentMonth()) {
      setAssignmentError("Seleccioná el mes actual o un mes futuro.");
      return;
    }
    setAssignmentForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "employeeId" || name === "month"
        ? { selectedDays: [] }
        : {}),
    }));
    setAssignmentError("");
    setAssignmentSuccess("");
  }

  function toggleAssignmentDay(day) {
    setAssignmentForm((current) => {
      const alreadySelected = current.selectedDays.includes(day);
      if (!alreadySelected && current.selectedDays.length >= remainingFrancos) {
        return current;
      }

      return {
        ...current,
        selectedDays: alreadySelected
          ? current.selectedDays.filter((selectedDay) => selectedDay !== day)
          : [...current.selectedDays, day].sort((a, b) => a - b),
      };
    });
    setAssignmentError("");
    setAssignmentSuccess("");
  }

  function clearAssignmentForm() {
    setAssignmentForm(initialAssignmentForm);
    setAssignmentError("");
    setAssignmentSuccess("");
  }

  async function registerFrancoAssignment(event) {
    event.preventDefault();
    if (!assignmentForm.month || assignmentForm.month < getCurrentMonth()) {
      setAssignmentError("Seleccioná el mes actual o un mes futuro.");
      return;
    }
    if (
      assignmentForm.selectedDays.some((day) =>
        isPastDayInCurrentMonth(assignmentForm.month, day),
      )
    ) {
      setAssignmentError("No se pueden asignar francos en días que ya pasaron.");
      return;
    }
    if (!selectedEmployee) {
      setAssignmentError("Seleccioná un empleado para asignar francos.");
      return;
    }
    if (assignmentForm.selectedDays.length === 0) {
      setAssignmentError("Seleccioná al menos un día para asignar.");
      return;
    }
    if (assignmentForm.selectedDays.length > remainingFrancos) {
      setAssignmentError(
        `Solo quedan ${remainingFrancos} francos disponibles para este empleado en el mes seleccionado.`,
      );
      return;
    }

    const dates = assignmentForm.selectedDays.map(
      (day) => `${assignmentForm.month}-${String(day).padStart(2, "0")}`,
    );
    setSaving(true);
    setAssignmentError("");
    try {
      await assignDaysOff({
        employeeDbId: selectedEmployee.dbId,
        dates,
        reason: "Asignación directa del empleador",
      });
      setRequests([...francosData.requests]);
      toast.success(`Se asignaron ${dates.length} ${dates.length === 1 ? "franco" : "francos"} a ${selectedEmployee.name}.`);
      setAssignmentForm(initialAssignmentForm);
    } catch (error) {
      setAssignmentError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function resolveRequest(requestId, nextStatus) {
    const approve = nextStatus === "Aceptado";
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
      await resolveDaysOff(requestId, approve, note);
      setRequests([...francosData.requests]);
      toast.success(approve ? "Solicitud de franco aprobada." : "Solicitud de franco rechazada.");
    } catch (error) {
      setActionError(error.message);
    }
  }

  function resetFilters() {
    setStatus("Todos");
    setSearch("");
    setMonth("Todos");
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans antialiased text-slate-800">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500">
                <span>Operaciones &amp; RRHH</span>
                <Icon className="h-2 w-2 text-slate-400">
                  <path d="M9 5l7 7-7 7" />
                </Icon>
                <span className="text-blue-700">Planificación horaria</span>
              </div>
              <h1 className="page-title">
                Gestión de Francos
              </h1>
            </div>
            {/* Botón de reglas oculto temporalmente; quitar este comentario para restaurarlo.
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-[0.5625rem] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              onClick={() => setShowRules(true)}
              type="button"
            >
              <Icon className="h-3 w-3 text-slate-400">
                <path d="M4 6h16M7 12h10m-7 6h4M6 4v4m12 2v4m-6 2v4" />
              </Icon>
              <span>
                Reglas de
                <br />
                Francos
              </span>
            </button>
            */}
          </header>

          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="mb-3 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Asignación de Francos
              </h2>
            </div>
            <form className="space-y-3" onSubmit={registerFrancoAssignment}>
              <div className="grid grid-cols-1 items-end gap-2.5 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label
                    className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
                    htmlFor="franco-employee"
                  >
                    Empleado <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <Select
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    id="franco-employee"
                    name="employeeId"
                    onChange={updateAssignmentForm}
                    required
                    value={assignmentForm.employeeId}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleadosData.employees
                      .filter((employee) => employee.status === "Activo")
                      .map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} (Leg. #{employee.id})
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label
                    className="mb-1 block text-[0.6875rem] font-semibold text-slate-700"
                    htmlFor="franco-month"
                  >
                    Período (mes) <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    id="franco-month"
                    min={currentMonth}
                    name="month"
                    onChange={updateAssignmentForm}
                    required
                    type="month"
                    value={assignmentForm.month}
                  />
                </div>
                <div className="md:col-span-3">
                  <span className="mb-1 block text-[0.6875rem] font-semibold text-slate-700">
                    Francos restantes
                  </span>
                  <div
                    aria-live="polite"
                    className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-blue-50 px-2.5 py-1.5"
                  >
                    <span className="flex items-center gap-1 text-[0.5625rem] font-bold text-blue-700">
                      <Icon className="h-3 w-3">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </Icon>
                      {selectedEmployee ? remainingFrancos : "—"} francos
                    </span>
                    <span className="text-[0.5625rem] text-slate-500">
                      {selectedEmployee ? "disponibles en el mes" : "seleccioná empleado"}
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-[0.6875rem] font-semibold text-slate-700">
                    Seleccionados
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-center text-[0.5625rem] font-semibold text-slate-700">
                    {assignmentForm.selectedDays.length} / {remainingFrancos}
                  </div>
                </div>
              </div>

              <fieldset>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-[0.6875rem] font-semibold text-slate-700">
                    Seleccioná los días de franco{" "}
                    <span aria-hidden="true" className="text-red-600">*</span>
                  </legend>
                  <span className="text-[0.5625rem] text-slate-500">
                    Mínimo 1 · máximo {remainingFrancos}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["D", "L", "M", "X", "J", "V", "S"].map((weekday) => (
                    <span
                      className="py-1 text-[0.5625rem] font-semibold text-slate-500"
                      key={weekday}
                    >
                      {weekday}
                    </span>
                  ))}
                  {Array.from({ length: firstWeekday }, (_, index) => (
                    <span aria-hidden="true" key={`empty-${index}`} />
                  ))}
                  {Array.from({ length: daysInSelectedMonth }, (_, index) => {
                    const day = index + 1;
                    const isSelected = assignmentForm.selectedDays.includes(day);
                    const isAtLimit =
                      assignmentForm.selectedDays.length >= remainingFrancos;
                    const isPastDay = isPastDayInCurrentMonth(
                      assignmentForm.month,
                      day,
                    );
                    const isTaken = takenDaysForPeriod.has(day);

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-md border px-1 py-1.5 text-[0.5625rem] font-medium transition ${
                          isPastDay || isTaken
                            ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                            : isSelected
                              ? "border-blue-700 bg-blue-700 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                        disabled={
                          !selectedEmployee ||
                          isPastDay ||
                          isTaken ||
                          (!isSelected && isAtLimit) ||
                          remainingFrancos === 0
                        }
                        key={day}
                        onClick={() => toggleAssignmentDay(day)}
                        type="button"
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {assignmentError && (
                <p className="text-[0.625rem] font-medium text-rose-600" role="alert">
                  {assignmentError}
                </p>
              )}
              {assignmentSuccess && (
                <p className="text-[0.625rem] font-medium text-emerald-700" role="status">
                  {assignmentSuccess}
                </p>
              )}
              {selectedEmployee && remainingFrancos === 0 && (
                <p className="text-[0.625rem] font-medium text-amber-700" role="status">
                  Este empleado ya no tiene francos disponibles para el mes elegido.
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  onClick={clearAssignmentForm}
                  type="button"
                >
                  Limpiar formulario
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Icon className="h-3 w-3">
                    <path d="M12 4v16m8-8H4" />
                  </Icon>
                  Registrar Franco
                </button>
              </div>
            </form>
          </section>

          <section
            aria-label="Resumen de solicitudes"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <FrancoMetricCard
              badge={pendingWithLongNotice > 0 ? "Atención requerida" : "Sin pendientes urgentes"}
              note={`${pendingWithLongNotice} con preaviso superior a 15 días`}
              style="amber"
              title="Pendientes de resolución"
              value={counts["Pendiente de revisión"]}
            />
            <FrancoMetricCard
              badge={formatMonthlyTrend(
                approvedDaysThisMonth,
                approvedDaysPreviousMonth,
              )}
              note={`${approvedDaysThisMonth} días de franco aceptados este mes`}
              style="green"
              title="Aceptados este mes"
              value={approvedThisMonth}
            />
            <FrancoMetricCard
              badge={`${rejectedPercentage}% del total`}
              note={`${counts.Rechazado} de ${counts.Todos} solicitudes rechazadas`}
              style="slate"
              title="Rechazados / desestimados"
              value={counts.Rechazado}
            />
          </section>

          {actionError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[0.625rem] font-medium text-rose-700" role="alert">
              {actionError}
            </p>
          )}
          <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Solicitudes de franco
              </h2>
            </div>
            <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-100 p-3.5 lg:flex-row">
              <label className="relative w-full lg:w-96">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Icon className="h-3.5 w-3.5">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </Icon>
                </span>
                <input
                  aria-label="Buscar por empleado, DNI o área"
                  className="w-full rounded-lg border border-slate-200/80 bg-slate-50/70 py-2 pl-9 pr-3 text-[0.5625rem] placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por empleado, DNI o área..."
                  type="search"
                  value={search}
                />
              </label>
              <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:justify-end">
                <div
                  aria-label="Filtrar por estado"
                  className="inline-flex max-w-full overflow-x-auto rounded-lg bg-blue-50/80 p-1 text-[0.5625rem] font-semibold text-slate-600"
                >
                  {statusOptions.map((option) => (
                    <button
                      aria-pressed={status === option}
                      className={`whitespace-nowrap rounded-md px-2 py-1.5 transition-colors ${
                        status === option
                          ? "bg-white font-bold text-slate-900 shadow-sm"
                          : "hover:text-slate-900"
                      }`}
                      key={option}
                      onClick={() => setStatus(option)}
                      type="button"
                    >
                      {option} ({counts[option]})
                    </button>
                  ))}
                </div>
                <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.5625rem] font-semibold text-slate-700">
                  <Icon className="h-3 w-3 text-slate-500">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </Icon>
                  <span className="sr-only">Filtrar por mes</span>
                  <Select
                    aria-label="Filtrar por mes"
                    className="w-36 cursor-pointer border-0 bg-transparent p-0 pr-4 text-[0.5625rem] font-semibold focus:ring-0"
                    onChange={(event) => setMonth(event.target.value)}
                    value={month}
                  >
                    <option value="Todos">Todos los meses</option>
                    {monthOptions.map((value) => (
                      <option key={value} value={value}>{formatMonthOption(value)}</option>
                    ))}
                  </Select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="hr-data-table hr-data-table--standard w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f0f4ff] text-[0.5rem] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 pl-3 pr-2 sm:pl-5" scope="col">
                      EMPLEADO
                    </th>
                    <th className="px-2 py-2.5 text-center sm:px-3" scope="col">
                      DÍAS SOLICITADOS
                    </th>
                    <th className="px-2 py-2.5" scope="col">
                      Días de preaviso
                    </th>
                    <th className="px-2 py-2.5" scope="col">
                      Estado
                    </th>
                    <th
                      className="px-2 py-2.5 text-center sm:px-3"
                      scope="col"
                    >
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <RequestRow
                      employee={getEmployeeById(request.employeeId)}
                      key={request.id}
                      onResolve={resolveRequest}
                      request={request}
                      requiredNoticeDays={businessRules.daysOffNotice}
                    />
                  ))}
                  {visibleRequests.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-xs text-slate-500"
                        colSpan="5"
                      >
                        No hay solicitudes que coincidan con estos filtros.
                        <button
                          className="ml-1 font-semibold text-blue-700 hover:underline"
                          onClick={resetFilters}
                          type="button"
                        >
                          Limpiar filtros
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="hr-data-table-footer flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.5625rem] text-slate-500 sm:flex-row">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>
                  Mostrando{" "}
                  <span className="font-medium text-slate-700">
                    {visibleRequests.length === 0
                      ? "0"
                      : `${startIndex + 1}-${endIndex}`}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-slate-700">
                    {filteredRequests.length}
                  </span>{" "}
                  solicitudes
                </span>
                <span className="text-slate-300">|</span>
                <label className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-600">
                  <span>Filas por página:</span>
                  <Select
                    aria-label="Filas por página"
                    className="min-w-[3.25rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    value={pageSize}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
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
      {showRules && (
        <RulesDialog
          onClose={() => setShowRules(false)}
          requiredNoticeDays={businessRules.daysOffNotice}
          weeklyDaysOff={businessRules.weeklyDaysOff}
        />
      )}
    </div>
  );
}
