import React, { useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import LatestPayrollDashboardCard from "../../components/cards/empleado/LatestPayrollDashboardCard";
import NextDayOffCard from "../../components/cards/empleado/NextDayOffCard";
import RequestedVacationDashboardCard from "../../components/cards/empleado/RequestedVacationDashboardCard";
import {
  getBusinessRules,
  getMonthlyFrancoAllowance,
  getVacationEntitlement,
} from "../../data/businessRules";
import { getPayrollStatus, sueldosData } from "../../data/sueldosData";
import { employeeFrancoRequests } from "../../data/francosEmpleadoData";
import { horariosData } from "../../data/horariosData";
import { vacacionesData } from "../../data/vacacionesData";
import { entitlementFor, store } from "../../lib/store";
import { clockIn, clockOut } from "../../lib/api";
import { getWeekStart, parseDateKey, toDateKey } from "../../lib/format";

function Icon({ path, className = "h-4 w-4" }) {
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
      <path d={path} />
    </svg>
  );
}

function formatDayOff(dateKey) {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "short" })
    .format(date)
    .replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
}

function daysUntil(dateKey) {
  const today = parseDateKey(toDateKey(new Date()));
  return Math.round((parseDateKey(dateKey) - today) / 86400000);
}

function formatTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;
}

export default function DashboardEmployee() {
  const [notice, setNotice] = useState("");
  const businessRules = getBusinessRules();
  const monthlyFrancoAllowance = getMonthlyFrancoAllowance(
    businessRules.weeklyDaysOff,
  );
  const [, setVersion] = useState(0);
  const [clocking, setClocking] = useState(false);
  const personalEmployee = store.currentEmployee;
  if (!personalEmployee) {
    throw new Error("No se encontró el perfil del empleado para cargar el panel personal.");
  }
  const today = toDateKey(new Date());
  const currentMonth = today.slice(0, 7);

  // Sueldo: el último pago registrado del empleado
  const ownPayrolls = sueldosData.payrolls.filter(
    (payroll) => payroll.employeeId === personalEmployee.id && !payroll.virtual,
  );
  const currentPayroll =
    ownPayrolls.find((payroll) => payroll.period === sueldosData.period && payroll.paymentType === "salary") ??
    ownPayrolls[0] ?? { period: sueldosData.period, status: "Pendiente", paymentDate: null };
  const isCurrentPayrollPending = getPayrollStatus(currentPayroll) === "Pendiente";

  // Francos: próximos días aprobados o en revisión
  const upcomingDaysOff = employeeFrancoRequests
    .filter((request) => request.status === "Aceptado" || request.status === "Pendiente de revisión")
    .flatMap((request) => request.dates.map((date) => ({ date, status: request.status })))
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const usedThisMonth = employeeFrancoRequests
    .filter((request) => request.status === "Aceptado")
    .flatMap((request) => request.dates)
    .filter((date) => date.startsWith(currentMonth) && date < today).length;
  const nextApproved = upcomingDaysOff.find((item) => item.status === "Aceptado");
  const daysOff = upcomingDaysOff.slice(0, 3).map((item, index) => {
    const date = parseDateKey(item.date);
    const remaining = daysUntil(item.date);
    return {
      key: item.date,
      day: new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date).replace(".", "").toLocaleUpperCase("es-AR"),
      date: String(date.getDate()),
      title: "Franco",
      badge: item.status === "Aceptado" ? (index === 0 ? "Próximo Asignado" : "Confirmado") : "En Espera",
      status: remaining === 0 ? "Hoy" : remaining === 1 ? "Mañana" : `En ${remaining} días`,
      featured: index === 0,
    };
  });

  // Vacaciones: la próxima solicitud vigente
  const ownVacations = vacacionesData.requests.filter((request) => request.employeeId === personalEmployee.id);
  const nextVacation = ownVacations
    .filter((request) => (request.status === "Pendiente" || request.status === "Aprobada") && request.endKey >= today)
    .sort((a, b) => a.startKey.localeCompare(b.startKey))[0];
  const year = new Date().getFullYear();
  const vacationEntitlement = entitlementFor(personalEmployee, year);
  const requestedThisYear = ownVacations
    .filter((request) => request.periodYear === year && (request.status === "Pendiente" || request.status === "Aprobada"))
    .reduce((sum, request) => sum + request.days, 0);
  const formatShort = (key) =>
    new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(parseDateKey(key)).replace(".", "");

  // Horario y fichaje de hoy
  const weekKey = toDateKey(getWeekStart(new Date()));
  const todaySchedule = horariosData.schedules.find(
    (schedule) => schedule.employeeId === personalEmployee.id && schedule.weekStartDate === weekKey,
  );
  const todayRecord = horariosData.attendance.find(
    (record) => record.employeeId === personalEmployee.id && record.workDate === today,
  );
  const clockInTime = formatTime(todayRecord?.clockInAt);
  const clockOutTime = formatTime(todayRecord?.clockOutAt);
  const isOnDuty = Boolean(clockInTime && !clockOutTime);
  const isDayOff = upcomingDaysOff.some((item) => item.date === today && item.status === "Aceptado");
  const statusTitle = isDayOff
    ? "Hoy tenés franco"
    : isOnDuty
      ? "En Servicio Activo"
      : clockOutTime
        ? "Jornada finalizada"
        : "Sin fichaje de entrada";

  async function handleClock() {
    setClocking(true);
    setNotice("");
    try {
      if (isOnDuty) {
        await clockOut();
        toast.success("Salida registrada.");
      } else {
        await clockIn();
        toast.success("Entrada registrada.");
      }
      setVersion((value) => value + 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setClocking(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8ff] font-sans text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[96.875rem]">
          <header className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Hola, {personalEmployee.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Panel personal de {personalEmployee.role} - {personalEmployee.department}
            </p>
          </header>

          <section
            aria-label="Resumen personal"
            className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:[&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1"
          >
            <NextDayOffCard
              allowance={monthlyFrancoAllowance}
              badge={nextApproved ? "Confirmado" : "Sin asignar"}
              detail={nextApproved ? (daysUntil(nextApproved.date) === 0 ? "Hoy" : `En ${daysUntil(nextApproved.date)} días`) : "Podés pedirlo en Francos"}
              nextLabel={nextApproved ? formatDayOff(nextApproved.date) : "Sin francos próximos"}
              used={usedThisMonth}
            />
            <RequestedVacationDashboardCard
              entitlement={vacationEntitlement}
              rangeLabel={nextVacation ? `${formatShort(nextVacation.startKey)} — ${formatShort(nextVacation.endKey)}` : "Sin solicitudes"}
              remainingDays={Math.max(0, vacationEntitlement - requestedThisYear)}
              requestedDays={nextVacation?.days ?? 0}
              statusLabel={nextVacation ? (nextVacation.status === "Aprobada" ? "Aprobada" : "En Revisión") : "Sin pedidos"}
            />
            <LatestPayrollDashboardCard
              amount={
                isCurrentPayrollPending
                  ? "$ -"
                  : `$ ${new Intl.NumberFormat("es-AR", {
                      maximumFractionDigits: 0,
                    }).format(currentPayroll.amount)}`
              }
              detail={
                isCurrentPayrollPending
                  ? "Pendiente de acreditación"
                  : `Depositado el ${currentPayroll.paymentDate}`
              }
              pending={isCurrentPayrollPending}
              period={currentPayroll.period}
              status={isCurrentPayrollPending ? "Pendiente" : "Registrado"}
            />
          </section>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <section
              aria-labelledby="days-off-title"
              className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm xl:col-span-2"
              id="francos"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg bg-blue-100 p-2 text-blue-800">
                      <Icon
                        className="h-4 w-4"
                        path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </span>
                    <div>
                      <h2
                        className="text-xs font-bold text-slate-900 sm:text-sm"
                        id="days-off-title"
                      >
                        Mis Francos
                      </h2>
                      <p className="text-[0.5625rem] text-slate-500">
                        Ciclo mensual en curso: {sueldosData.period}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[0.5625rem] font-medium text-slate-600">
                    {monthlyFrancoAllowance} Francos Mensuales
                  </span>
                </div>
              </div>
              <div className="space-y-2.5 p-4 sm:p-5">
                {daysOff.map((day) => (
                  <article
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      day.featured
                        ? "border-blue-100 bg-blue-50/60"
                        : "border-slate-100 bg-white"
                    }`}
                    key={day.key}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${
                          day.featured
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="text-[0.5rem] font-bold">{day.day}</span>
                        <span className="text-sm font-extrabold leading-none">
                          {day.date}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[0.625rem] font-bold text-slate-900 sm:text-xs">
                            {day.title}
                          </h3>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[0.4375rem] font-semibold ${
                              day.featured
                                ? "bg-blue-700 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {day.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                    {day.status && (
                      <span className="shrink-0 text-[0.5rem] font-semibold text-blue-700">
                        {day.status}
                      </span>
                    )}
                  </article>
                ))}
                {daysOff.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-3 text-center text-[0.625rem] text-slate-500">
                    No tenés francos próximos. <a className="font-semibold text-blue-700" href="/employee/francos">Pedí uno</a>.
                  </p>
                )}
              </div>
            </section>

            <section
              aria-labelledby="shift-title"
              className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
              id="horarios"
            >
              <div className="flex items-center justify-between bg-[#0f3e83] p-4 text-white">
                <div>
                  <p className="text-[0.5rem] font-bold uppercase tracking-wider text-blue-200">
                    Estado actual
                  </p>
                  <h2 className="text-sm font-bold" id="shift-title">
                    {statusTitle}
                  </h2>
                </div>
                <span className="rounded-full bg-white/10 p-2">
                  <Icon
                    className="h-4 w-4"
                    path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </span>
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[#f0f4ff] p-3">
                  <div>
                    <p className="text-[0.5rem] font-bold uppercase text-slate-500">
                      Horario de hoy
                    </p>
                    <p className="whitespace-nowrap text-base font-extrabold text-slate-900 sm:text-lg">
                      {todaySchedule ? `${todaySchedule.start} — ${todaySchedule.end} hs` : "Sin turno asignado"}
                    </p>
                    <p className="text-[0.5rem] font-medium text-blue-700">
                      {todaySchedule ? `${todaySchedule.shift} (${todaySchedule.hours} horas)` : "Consultá con tu empleador"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.5rem] text-slate-500">
                      Fichada de Entrada
                    </p>
                    <p className="text-[0.625rem] font-bold">{clockInTime ? `${clockInTime} hs` : "—"}</p>
                    <p className="text-[0.5rem] font-medium text-blue-700">
                      {todayRecord ? (todayRecord.status === "late" ? "Con demora" : "Puntual") : ""}
                      {clockOutTime ? ` · Salida ${clockOutTime} hs` : ""}
                    </p>
                  </div>
                </div>
                <dl className="space-y-3 text-[0.5625rem]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Sector Asignado:</dt>
                    <dd className="text-right font-semibold">
                      {[personalEmployee.department, personalEmployee.branch].filter(Boolean).join(" - ")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Turno de la semana:</dt>
                    <dd className="text-right font-semibold text-blue-800">
                      {todaySchedule ? `${todaySchedule.shift} · ${todaySchedule.start} hs` : "Sin asignar"}
                    </dd>
                  </div>
                </dl>
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[0.5rem] font-bold uppercase tracking-wide text-slate-400">
                    Gestión de novedades
                  </p>
                  <button
                    className="mb-2 w-full rounded-lg bg-[#0f3e83] px-2 py-2 text-[0.625rem] font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50"
                    disabled={clocking || Boolean(clockOutTime)}
                    onClick={handleClock}
                    type="button"
                  >
                    {clockOutTime ? "Jornada registrada" : isOnDuty ? "Registrar salida" : "Registrar entrada"}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      className="rounded-lg bg-blue-50 px-2 py-2 text-center text-[0.5625rem] font-semibold text-blue-800 transition hover:bg-blue-100"
                      href="/employee/francos"
                    >
                      Pedir Franco
                    </a>
                    <a
                      className="rounded-lg bg-blue-50 px-2 py-2 text-center text-[0.5625rem] font-semibold text-blue-800 transition hover:bg-blue-100"
                      href="/employee/vacaciones"
                    >
                      Vacaciones
                    </a>
                  </div>
                  {notice && (
                    <p
                      aria-live="polite"
                      className="mt-2 text-[0.5625rem] text-slate-600"
                      role="status"
                    >
                      {notice}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
