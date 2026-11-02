// Cálculos sobre la dotación a partir de los datos ya cargados en el store:
// qué le toca a cada empleado cada día (turno, franco o vacaciones), sus
// fichajes y los indicadores de las pantallas de Fichajes y Estadísticas.

import { employeeDirectory } from "../data/employeeDirectory";
import { store } from "./store";
import { getWeekStart, parseDateKey, toDateKey } from "./format";

export const LATE_TOLERANCE_MINUTES = 10;
export const weekdayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const weekdayLong = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const monthShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const monthLong = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function minutesOf(time) {
  if (!time) return null;
  const [hours, minutes] = String(time).slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

// Hora local HH:MM de una marca guardada con zona horaria
export function localTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function localDateKey(timestamp) {
  return timestamp ? toDateKey(new Date(timestamp)) : "";
}

export function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function eachDay(fromKey, toKey) {
  const days = [];
  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) days.push(key);
  return days;
}

// Franja según la hora de inicio del turno
export function shiftBand(startTime) {
  const minutes = minutesOf(startTime);
  if (minutes === null) return null;
  if (minutes >= 6 * 60 && minutes < 14 * 60) return "morning";
  if (minutes >= 14 * 60 && minutes < 22 * 60) return "afternoon";
  return "night";
}

export function shiftDurationMinutes(start, end) {
  const from = minutesOf(start);
  let to = minutesOf(end);
  if (from === null || to === null) return 0;
  if (to <= from) to += 24 * 60;
  return to - from;
}

export function formatHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")} hs`;
}

// Índice por empleado y día. Se arma una vez por pantalla con los datos crudos.
export function buildWorkforceIndex() {
  const raw = store.raw ?? {};
  const schedules = new Map();
  (raw.schedules ?? []).forEach((schedule) => {
    schedules.set(`${schedule.employee_id}|${schedule.week_start_date}`, schedule);
  });

  const francos = new Set();
  (raw.daysOffRequests ?? [])
    .filter((request) => request.status === "approved")
    .forEach((request) => {
      (request.days_off_request_dates ?? []).forEach((day) => {
        francos.add(`${request.employee_id}|${day.requested_date}`);
      });
    });

  const vacations = new Map();
  (raw.vacationRequests ?? [])
    .filter((request) => request.status === "approved")
    .forEach((request) => {
      const list = vacations.get(request.employee_id) ?? [];
      list.push(request);
      vacations.set(request.employee_id, list);
    });

  const attendance = new Map();
  (raw.attendance ?? []).forEach((record) => {
    attendance.set(`${record.employee_id}|${record.work_date}`, record);
  });

  const employees = employeeDirectory.filter((employee) => employee.employmentStatus !== "inactive");

  function scheduleFor(employeeDbId, dateKey) {
    const week = toDateKey(getWeekStart(parseDateKey(dateKey)));
    return schedules.get(`${employeeDbId}|${week}`) ?? null;
  }

  function onVacation(employeeDbId, dateKey) {
    return (vacations.get(employeeDbId) ?? []).some(
      (request) => request.start_date <= dateKey && request.end_date >= dateKey,
    );
  }

  // Qué le corresponde al empleado ese día
  function dayFor(employee, dateKey) {
    const schedule = scheduleFor(employee.dbId, dateKey);
    let type = "shift";
    if (onVacation(employee.dbId, dateKey)) type = "vacation";
    else if (employee.employmentStatus === "on_leave") type = "leave";
    else if (francos.has(`${employee.dbId}|${dateKey}`)) type = "franco";
    else if (!schedule) type = "unscheduled";
    return {
      type,
      schedule,
      record: attendance.get(`${employee.dbId}|${dateKey}`) ?? null,
    };
  }

  return { employees, scheduleFor, dayFor, attendance };
}
