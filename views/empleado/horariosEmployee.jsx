import React, { useMemo, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
// import WeeklyHoursCard from "../../components/cards/empleado/WeeklyHoursCard";
// import WorkdayTypeCard from "../../components/cards/empleado/WorkdayTypeCard";
import { employeeFrancoRequests } from "../../data/francosEmpleadoData";
import { horariosData } from "../../data/horariosData";
import { vacacionesData } from "../../data/vacacionesData";
import { store } from "../../lib/store";
import { usePagination } from "../../hooks/usePagination";
import Select from "../../components/Select";

const weekdayLabels = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

function getAttendance(entry) {
  if (!entry.clockIn) return { status: "Ausente" };

  const [scheduledHours, scheduledMinutes] = entry.scheduledStart
    .split(":")
    .map(Number);
  const [clockInHours, clockInMinutes] = entry.clockIn.split(":").map(Number);
  const scheduledMinutesTotal = scheduledHours * 60 + scheduledMinutes;
  const clockInMinutesTotal = clockInHours * 60 + clockInMinutes;
  const minutesLate = clockInMinutesTotal - scheduledMinutesTotal;

  if (minutesLate <= 10) return { status: "Presente" };
  return { status: "Llegó tarde", minutesLate };
}

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function getWeekStartDate(date) {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return getLocalDateValue(weekStart);
}

function getDayAssignment(date, employeeId) {
  const dateValue = getLocalDateValue(date);
  const vacation = vacacionesData.requests.find((request) => {
    if (request.employeeId !== employeeId || request.status !== "Aprobada") {
      return false;
    }
    return (
      normalizeDateValue(request.startDate) <= dateValue &&
      normalizeDateValue(request.endDate) >= dateValue
    );
  });
  if (vacation) return { type: "vacation" };

  const franco = employeeFrancoRequests.find((request) => {
    if (request.employeeId !== employeeId || request.status !== "Aceptado") {
      return false;
    }
    const dates = request.requestedDates ?? request.dates ?? [request.requestedDate];
    return dates.includes(dateValue);
  });
  if (franco) return { type: "franco" };

  const schedule = horariosData.schedules.find(
    (item) =>
      item.employeeId === employeeId &&
      item.weekStartDate === getWeekStartDate(date) &&
      item.status === "Confirmado",
  );
  return schedule ? { type: "schedule", schedule } : { type: "unassigned" };
}

function getIsoWeekNumber(date) {
  const thursday = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const weekday = (thursday.getUTCDay() + 6) % 7;
  thursday.setUTCDate(thursday.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  return 1 + Math.round((thursday - firstThursday) / 604800000);
}

function Icon({ path, className = "h-4 w-4", fill = "none" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={fill}
      stroke={fill === "none" ? "currentColor" : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

export default function HorariosEmployee() {
  const [historySearch, setHistorySearch] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [notice, setNotice] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const employee = store.currentEmployee;
  if (!employee) {
    throw new Error("No se encontró el perfil del empleado para consultar sus horarios.");
  }

  const employeeWeeklyHistory = useMemo(
    () =>
      horariosData.weeklyHistory
        .filter((entry) => entry.employeeId === employee.id)
        .map((entry) => {
          const schedule = horariosData.schedules.find(
            (item) =>
              item.employeeId === entry.employeeId &&
              item.weekStartDate === entry.weekStartDate &&
              item.status === "Confirmado",
          );
          if (!schedule) return null;
          return {
            ...entry,
            scheduledStart: schedule.start,
            shift: `${schedule.start} - ${schedule.end} (${schedule.shift})`,
          };
        })
        .filter(Boolean)
        .sort((first, second) =>
          second.weekStartDate.localeCompare(first.weekStartDate),
        ),
    [employee.id],
  );
  const attendanceSummary = employeeWeeklyHistory.reduce(
    (summary, entry) => {
      const attendance = getAttendance(entry);
      return {
        total: summary.total + 1,
        absent: summary.absent + (attendance.status === "Ausente" ? 1 : 0),
      };
    },
    { total: 0, absent: 0 },
  );
  const attendancePercentage =
    attendanceSummary.total === 0
      ? 0
      : Math.round(
          ((attendanceSummary.total - attendanceSummary.absent) /
            attendanceSummary.total) *
            1000,
        ) / 10;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(
    currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7),
  );
  const displayedWeekStart = new Date(currentWeekStart);
  displayedWeekStart.setDate(displayedWeekStart.getDate() + weekOffset * 7);
  const displayedWeekEnd = new Date(displayedWeekStart);
  displayedWeekEnd.setDate(displayedWeekEnd.getDate() + 6);
  const weekNumber = getIsoWeekNumber(displayedWeekStart);
  const currentWeekNumber = getIsoWeekNumber(today);
  const formattedToday = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);
  const todayAssignment = getDayAssignment(today, employee.id);
  const todaySchedule =
    todayAssignment.type === "schedule" ? todayAssignment.schedule : null;
  const todayStatusLabel =
    todayAssignment.type === "vacation"
      ? "VACACIONES APROBADAS"
      : todayAssignment.type === "franco"
        ? "FRANCO APROBADO"
        : todaySchedule
          ? "HORARIO ASIGNADO"
          : "SIN HORARIO ASIGNADO";
  const todayScheduleDetails = todaySchedule
    ? `Entrada: ${todaySchedule.start} hs · Salida: ${todaySchedule.end} hs`
    : todayAssignment.type === "vacation"
      ? "Hoy corresponde un período de vacaciones aprobado."
      : todayAssignment.type === "franco"
        ? "Hoy corresponde un día de franco aprobado."
        : "No hay un turno confirmado para hoy.";
  const formattedWeekStart = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(displayedWeekStart);
  const formattedWeekEnd = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(displayedWeekEnd);
  const displayedDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(displayedWeekStart);
    date.setDate(date.getDate() + index);
    const dateValue = getLocalDateValue(date);
    const isToday =
      weekOffset === 0 && date.getTime() === today.getTime();
    const assignment = getDayAssignment(date, employee.id);
    const isSchedule = assignment.type === "schedule";
    const isFranco = assignment.type === "franco";
    const isVacation = assignment.type === "vacation";
    return {
      dateValue,
      day: `${weekdayLabels[date.getDay()]} ${date.getDate()}${isToday ? " (HOY)" : ""}`,
      type: assignment.type,
      isToday,
      badge: isFranco
        ? ""
        : isVacation
          ? "Vacaciones"
          : isSchedule
            ? "Turno asignado"
            : "Sin asignación",
      badgeClass: isVacation
        ? "bg-amber-100 text-amber-800"
        : isFranco
          ? "bg-purple-100 text-purple-800"
          : isSchedule
            ? isToday
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 border border-slate-200"
            : "bg-slate-100 text-slate-500 border border-slate-200",
      title: isVacation
        ? "VACACIONES"
        : isFranco
          ? "FRANCO"
          : isSchedule
            ? `${assignment.schedule.start} - ${assignment.schedule.end} hs`
            : "SIN HORARIO",
      detail: isVacation
        ? "Período aprobado"
        : isFranco
          ? ""
          : isSchedule
            ? `Entrada: ${assignment.schedule.start} · Salida: ${assignment.schedule.end}`
            : "No hay horarios asignados para este día.",
      cardClass: isVacation
        ? "bg-amber-50/60 border-amber-200"
        : isFranco
          ? "bg-purple-50/50 border-purple-200/80"
          : isToday && isSchedule
            ? "bg-blue-50/70 border-2 border-blue-600 ring-2 ring-blue-100"
            : "bg-white border-slate-200 hover:border-slate-300",
      titleClass: isVacation
        ? "text-amber-900"
        : isFranco
          ? "text-purple-900"
          : isToday && isSchedule
            ? "text-blue-950"
            : "text-slate-900",
      detailClass: isVacation
        ? "text-amber-800"
        : isFranco
          ? "text-purple-700"
          : isToday && isSchedule
            ? "text-blue-800"
            : "text-slate-500",
    };
  });
  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase("es");
    if (!query) return employeeWeeklyHistory;
    return employeeWeeklyHistory.filter((entry) =>
      `${entry.week} ${entry.period}`.toLocaleLowerCase("es").includes(query),
    );
  }, [employeeWeeklyHistory, historySearch]);
  const {
    currentPage,
    pageItems,
    setPage,
    totalPages,
  } = usePagination(filteredHistory, pageSize);

  function showDemoNotice() {
    setHistorySearch("");
    setNotice("Se limpió el filtro del historial.");
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-900 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem]">
          <header className="mb-4">
            <nav
              aria-label="Ruta de navegación"
              className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
            >
              <span>Portal del empleado</span>
              <span aria-hidden="true">›</span>
              <span className="text-blue-700">Horarios</span>
            </nav>
            <h1 className="page-title">Mis Horarios Asignados</h1>
          </header>

          <section
            aria-labelledby="schedule-section-heading"
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="h-6 w-2.5 rounded-full bg-blue-700" />
                  <h2
                    className="text-sm font-bold tracking-tight text-slate-900"
                    id="schedule-section-heading"
                  >
                    Cronograma Semanal
                  </h2>
                </div>
              </div>
              <div className="group relative shrink-0">
                <button
                  aria-label="Información sobre el registro de horarios"
                  aria-describedby="schedule-information"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  type="button"
                >
                  <Icon
                    className="h-4 w-4"
                    path="M12 8h.01M11 12h1v4h1m-1 5a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                  />
                </button>
                <section
                  aria-label="Información sobre el registro de horarios"
                  className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] translate-y-1 rounded-xl border border-slate-200 bg-white p-4 opacity-0 shadow-xl transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  id="schedule-information"
                  role="tooltip"
                >
                  <h3 className="mb-3 text-xs font-bold text-blue-700">
                    Información de horarios
                  </h3>
                  <ul className="space-y-3 text-[0.625rem] leading-relaxed text-slate-600">
                    <li className="flex items-start gap-2">
                      <Icon
                        className="mt-0.5 h-3 w-3 shrink-0 text-blue-600"
                        path="M5 13l4 4L19 7"
                      />
                      <span>
                        <strong className="text-slate-800">
                          Tolerancia de ingreso:
                        </strong>{" "}
                        Hasta 10 minutos de gracia antes de computar tardanza
                        injustificada.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon
                        className="mt-0.5 h-3 w-3 shrink-0 text-blue-600"
                        path="M5 13l4 4L19 7"
                      />
                      <span>
                        <strong className="text-slate-800">
                          Fichaje:
                        </strong>{" "}
                        Registrá tu entrada y tu salida desde el panel de Inicio.
                        La hora la toma el servidor.
                      </span>
                    </li>
                  </ul>
                </section>
              </div>
            </div>

            {notice && (
              <p aria-live="polite" className="mt-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800" role="status">
                {notice}
              </p>
            )}

            <div className="relative mt-6 overflow-hidden rounded-xl border border-blue-700 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-5 text-white shadow-md">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-extrabold text-white">
                    {todayStatusLabel}
                  </span>
                  <span className="text-xs font-semibold text-blue-200">
                    {formattedToday}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">•</span>
                  <span className="rounded border border-blue-600/60 bg-blue-950/70 px-2 py-0.5 font-mono text-xs text-blue-100">
                    Semana {currentWeekNumber}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white">
                  {todaySchedule
                    ? `${todaySchedule.start} - ${todaySchedule.end} hs`
                    : todayAssignment.type === "vacation"
                      ? "Vacaciones"
                      : todayAssignment.type === "franco"
                        ? "Franco"
                        : "Sin turno asignado"}
                </h3>
                <p className="text-sm font-medium text-blue-100">
                  {todayScheduleDetails}
                </p>
              </div>
            </div>

            <nav
              aria-label="Navegación de semanas"
              className="mt-6 mb-3 flex items-center justify-between gap-3"
            >
              <button
                aria-label="Ver semana anterior"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setWeekOffset((offset) => offset - 1)}
                type="button"
              >
                <Icon className="h-4 w-4" path="M15 18l-6-6 6-6" />
              </button>
              <span
                aria-live="polite"
                className="text-center text-xs font-semibold text-slate-600"
              >
                Semana {weekNumber} · {formattedWeekStart} – {formattedWeekEnd}
              </span>
              <button
                aria-label="Ver semana siguiente"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setWeekOffset((offset) => offset + 1)}
                type="button"
              >
                <Icon className="h-4 w-4" path="M9 18l6-6-6-6" />
              </button>
            </nav>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-7">
              {displayedDays.map((day) => (
                <article
                  className={`flex min-h-[7.875rem] flex-col rounded-xl border p-3.5 shadow-sm ${day.cardClass}`}
                  key={day.dateValue}
                >
                  <div>
                    <div
                      className={`flex flex-wrap items-center justify-between gap-1.5 border-b pb-2 ${
                        day.type === "franco"
                          ? "border-purple-100"
                          : day.type === "vacation"
                            ? "border-amber-100"
                            : day.isToday
                              ? "border-blue-200"
                              : "border-slate-200/80"
                      }`}
                    >
                      <h3
                        className={`text-xs font-bold ${
                          day.isToday ? "text-blue-900" : "text-slate-800"
                        }`}
                      >
                        {day.day}
                      </h3>
                      {day.badge && (
                        <span
                          className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[0.5625rem] font-bold ${day.badgeClass}`}
                        >
                          {day.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p
                        className={`text-sm font-extrabold tracking-tight ${day.titleClass}`}
                      >
                        {day.title}
                      </p>
                      {day.detail && (
                        <p className={`mt-1 text-[0.625rem] font-medium ${day.detailClass}`}>
                          {day.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

          </section>

          <section
            aria-label="Resumen de horarios y asistencia"
            className="mb-8 grid grid-cols-1 gap-5"
          >
            {/* <WeeklyHoursCard /> */}
            {/* <WorkdayTypeCard department={employee.department} /> */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <div>
                  <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
                    Porcentaje de asistencia
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                      {attendancePercentage}
                    </span>
                    <span className="text-sm font-bold text-slate-600">%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-[0.625rem] font-bold text-slate-700">
                  <span>Asistencia registrada</span>
                  <span className="text-red-700">
                    Días faltados: {attendanceSummary.absent}
                  </span>
                </div>
                <div
                  aria-label={`Porcentaje de asistencia: ${attendancePercentage}%`}
                  aria-valuemax="100"
                  aria-valuemin="0"
                  aria-valuenow={attendancePercentage}
                  className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                >
                  <div
                    className="h-3 rounded-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            </article>
          </section>

          <section
            aria-labelledby="history-heading"
            className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900" id="history-heading">
                  Horarios Semanales
                </h2>
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Buscar por mes o semana</span>
                  <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-[0.5625rem] font-medium text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Filtrar por mes o semana..."
                    type="search"
                    value={historySearch}
                  />
                </label>
                <button
                  className="inline-flex shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[0.5625rem] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => showDemoNotice("Filtros de historial")}
                  type="button"
                >
                  <Icon className="mr-1.5 h-4 w-4 text-slate-500" path="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  Filtros
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table
                className="hr-data-table hr-data-table--standard w-full min-w-[37.5rem]"
                id="history-table"
              >
                <thead>
                  <tr>
                    <th scope="col">Semana / Período</th>
                    <th scope="col">Turno asignado</th>
                    <th className="text-center" scope="col">Asistencia</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {pageItems.map((entry) => {
                    const attendance = getAttendance(entry);
                    return (
                    <tr className="transition-colors hover:bg-slate-50/80" key={entry.id}>
                      <td className="whitespace-nowrap">
                        <div className="font-bold text-slate-900">{entry.week}</div>
                        <div className="text-xs font-medium text-slate-500">{entry.period}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center text-slate-900">
                          <span className="mr-2 h-2 w-2 rounded-full bg-blue-600" />
                          {entry.shift}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-extrabold ${
                              attendance.status === "Presente"
                                ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                : attendance.status === "Ausente"
                                  ? "border-red-300 bg-red-100 text-red-900"
                                  : "border-amber-300 bg-amber-100 text-amber-900"
                            }`}
                          >
                            {attendance.status}
                          </span>
                          {attendance.minutesLate && (
                            <span className="text-[0.625rem] font-medium text-amber-800">
                              {attendance.minutesLate}{" "}
                              {attendance.minutesLate === 1 ? "minuto" : "minutos"} tarde
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-xs text-slate-500" colSpan="3">
                        No se encontraron semanas con ese filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="hr-data-table-footer flex flex-col items-center justify-between gap-3 border-t border-slate-200 text-xs text-slate-600 sm:flex-row">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Mostrando{" "}
                  <strong className="font-extrabold text-slate-950">
                    {pageItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                    {pageItems.length > 0 && `-${(currentPage - 1) * pageSize + pageItems.length}`}
                  </strong>{" "}
                  de <strong className="font-extrabold text-slate-950">{filteredHistory.length}</strong>{" "}
                  semanas registradas en el período fiscal 2026.
                </span>
                <label className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
                  Filas por página
                  <Select
                    aria-label="Filas por página"
                    className="min-w-[3.25rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700"
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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
