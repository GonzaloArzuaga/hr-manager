import { navigate } from "../../lib/router";
import React, { useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import { resolveDaysOff, resolveVacation } from "../../lib/api";
import DashboardMetricCard from "../../components/cards/empleador/DashboardMetricCard";
import { dashboardData } from "../../data/dashboardData";
import { getEmployeeById } from "../../data/employeeDirectory";

const metricIcons = {
  employees: (
    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  ),
  calendar: (
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  vacation: (
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  ),
  clock: (
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
};

function Icon({ children, className = "h-4 w-4" }) {
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

function RequestRow({ request, onResolve, busy }) {
  const employee = getEmployeeById(request.employeeId);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-transparent bg-[#f3f6ff] p-2.5 transition-colors hover:bg-[#edf2ff]">
      <div className="flex min-w-0 items-center space-x-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            "bg-blue-600 text-white"
          }`}
        >
          {employee.initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="text-[0.6875rem] font-bold text-slate-800">
              {employee.name}
            </span>
            <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[0.5625rem] font-medium text-slate-600">
              {request.type}
            </span>
          </div>
          <p className="mt-0.5 text-[0.5625rem] text-slate-500">{request.date}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center space-x-1">
        <button
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[0.5625rem] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          disabled={busy}
          onClick={() => onResolve(request, false)}
          type="button"
        >
          Rechazar
        </button>
        <button
          className="rounded-md bg-[#0b3882] px-3 py-1 text-[0.5625rem] font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 disabled:opacity-50"
          disabled={busy}
          onClick={() => onResolve(request, true)}
          type="button"
        >
          Aprobar
        </button>
      </div>
    </div>
  );
}

function AbsenceRow({ absence }) {
  const employee = getEmployeeById(absence.employeeId);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-transparent bg-[#f0f4ff] p-2 transition-colors hover:bg-[#eaf0ff]">
      <div className="flex min-w-0 items-center space-x-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
          {employee.initials}
        </div>
        <div className="min-w-0">
          <h3 className="text-[0.625rem] font-bold text-slate-800">
            {employee.name}
          </h3>
          <p className="text-[0.5625rem] text-slate-500">
            {employee.department} • {absence.description}
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-sm bg-blue-100 px-1.5 py-0.5 text-[0.5625rem] font-medium text-blue-700">
        {absence.status}
      </span>
    </div>
  );
}

export default function DashboardEmployer() {
  const [, setVersion] = useState(0);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState(dashboardData.weekDays[0]?.key);
  const { user: dashboardUser, metrics, requests } = dashboardData;
  const user = dashboardUser;
  const weekDays = dashboardData.weekDays.map((day) => ({ ...day, selected: day.key === selectedDayKey }));
  const absences = weekDays.find((day) => day.selected)?.absences ?? [];

  async function resolveRequest(request, approve) {
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
    setBusyKey(`${request.kind}-${request.id}`);
    setError("");
    try {
      if (request.kind === "vacation") await resolveVacation(request.id, approve, note);
      else await resolveDaysOff(request.id, approve, note);
      toast.success(approve ? "Solicitud aprobada." : "Solicitud rechazada.");
      setVersion((value) => value + 1);
    } catch (resolveError) {
      setError(resolveError.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8ff] font-sans text-slate-800 antialiased">
      <main className="flex-1 bg-[#f7f8ff] p-[1.375rem]">
        <div className="mx-auto max-w-[96.875rem] space-y-4">
          <header>
            <span className="block text-[0.5625rem] font-bold uppercase leading-3 tracking-widest text-slate-500">
              Operaciones &amp; RRHH
            </span>
            <h1 className="text-2xl font-extrabold leading-none tracking-tight text-slate-900">
              Hola, {user.name.split(" ")[0]}
            </h1>
            <p className="text-[0.625rem] font-normal text-slate-500">
              Panel de control de Operaciones y Recursos Humanos •{" "}
              <span className="font-medium text-slate-600">{dashboardUser.company}</span>
            </p>
          </header>

          <section
            aria-label="Indicadores principales"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
          >
            {metrics.map((metric) => (
              <DashboardMetricCard
                icon={metricIcons[metric.icon]}
                key={metric.id}
                metric={metric}
              />
            ))}
          </section>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            <section className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-7">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    Solicitudes Recientes
                  </h2>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.5625rem] font-semibold text-blue-700">
                    {dashboardData.pendingRequestCount} pendientes
                  </span>
                </div>
                <p className="mb-3 text-[0.5625rem] text-slate-400">
                  Requieren tu atención para confirmación de cronograma
                </p>
                <div className="space-y-1.5">
                  {requests.slice(0, 5).map((request) => (
                    <RequestRow
                      busy={busyKey === `${request.kind}-${request.id}`}
                      key={`${request.kind}-${request.id}`}
                      onResolve={resolveRequest}
                      request={request}
                    />
                  ))}
                  {requests.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-3 text-center text-[0.625rem] text-slate-500">
                      No hay solicitudes pendientes.
                    </p>
                  )}
                  {error && (
                    <p className="rounded-lg bg-rose-50 p-2 text-[0.625rem] text-rose-700" role="alert">{error}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-[0.5625rem]">
                <span className="text-slate-500">
                  {dashboardData.coverageRule}
                </span>
                <a
                  className="flex items-center font-semibold text-blue-600 transition-colors hover:text-blue-800"
                  href="/employer/francos"
                >
                  Ver todas las solicitudes <span className="ml-1">→</span>
                </a>
              </div>
            </section>

            <section className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-5">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    Próximos Francos
                  </h2>
                  <button
                    aria-label="Filtrar ausencias"
                    className="p-1 text-slate-400 transition-colors hover:text-slate-600"
                    title="Filtrar"
                    type="button"
                  >
                    <Icon>
                      <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </Icon>
                  </button>
                </div>
                <p className="mb-3 text-[0.5625rem] text-slate-400">
                  Ausencias programadas en los próximos días
                </p>
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {weekDays.map((day) => (
                    <button
                      aria-pressed={Boolean(day.selected)}
                      className={`flex flex-col items-center rounded-lg border px-1 py-1.5 transition-colors ${
                        day.selected
                          ? "border-[#0e3b82] bg-[#0e3b82] text-white shadow-sm"
                          : "border-slate-100 bg-slate-50/80 hover:bg-slate-100"
                      }`}
                      key={day.key}
                      onClick={() => setSelectedDayKey(day.key)}
                      type="button"
                    >
                      <span
                        className={`text-[0.5625rem] font-bold uppercase ${
                          day.selected ? "text-blue-200" : "text-slate-400"
                        }`}
                      >
                        {day.label}
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          day.selected ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {day.date}
                      </span>
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${
                          day.hasAbsences
                            ? day.selected
                              ? "bg-white"
                              : "bg-blue-600"
                            : "bg-transparent"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  {absences.map((absence) => (
                    <AbsenceRow key={`${absence.employeeId}-${absence.description}`} absence={absence} />
                  ))}
                  {absences.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-3 text-center text-[0.625rem] text-slate-500">
                      No hay ausencias programadas para este día.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-4">
                <button
                  className="flex w-full items-center justify-center rounded-md bg-blue-100/70 px-4 py-1 text-[0.5625rem] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  onClick={() => navigate("/employer/horarios")}
                  type="button"
                >
                  <Icon className="mr-1 h-3 w-3">
                    {metricIcons.calendar}
                  </Icon>
                  Ver cronograma semanal completo
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
