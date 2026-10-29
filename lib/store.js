// Capa de datos: lee la información del usuario desde Supabase y la deja con
// la misma forma que tenían los datos de ejemplo de la carpeta data/.
// Así las pantallas siguen funcionando igual, pero con datos reales.
//
// Las consultas pasan siempre por las políticas RLS de la base: el empleador
// recibe los datos de toda su empresa y el empleado solo los propios.

import { supabase, unwrap } from "./supabaseClient";
import {
  capitalize,
  formatCuil,
  formatShortWeek,
  formatWeekLabel,
  formatWeekPeriod,
  getInitials,
  getIsoWeekNumber,
  getWeekStart,
  parseDateKey,
  spanishMonths,
  tenureLabel,
  toDateKey,
  toDisplayDate,
  toPeriodLabel,
  toTime,
  todayKey,
  yearsBetween,
} from "./format";
import { employeeDirectory } from "../data/employeeDirectory";
import { empleadosData } from "../data/empleadosData";
import { horariosData } from "../data/horariosData";
import { francosData } from "../data/francosData";
import { employeeFrancoRequests, employeeFrancoTaken } from "../data/francosEmpleadoData";
import { vacacionesData } from "../data/vacacionesData";
import { sueldosData } from "../data/sueldosData";
import { dashboardData } from "../data/dashboardData";

export const store = {
  session: null,
  account: null,
  role: null,
  company: null,
  isEmployer: false,
  currentEmployee: null,
  user: null,
  rules: null,
  shiftTypes: [],
  raw: {},
};

const avatarStyles = ["navy", "blue", "slate", "indigo", "sky", "purple", "teal", "amber"];

const employmentStatusLabels = {
  active: "Activo",
  on_leave: "En Licencia",
  inactive: "Baja",
};

const requestStatusLabels = {
  pending: "Pendiente de revisión",
  approved: "Aceptado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const vacationStatusLabels = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export const paymentTypeLabels = {
  salary: "Sueldo",
  aguinaldo_first_installment: "Aguinaldo 1° cuota",
  aguinaldo_second_installment: "Aguinaldo 2° cuota",
};

// Reemplaza el contenido de un arreglo u objeto exportado sin cambiar su
// identidad, para que las pantallas que ya lo importaron vean los datos nuevos.
function fill(target, values) {
  if (Array.isArray(target)) {
    target.splice(0, target.length, ...values);
    return;
  }
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, values);
}

// URL pública de una foto de perfil guardada en el bucket avatars
export function avatarUrlFor(storageKey) {
  if (!storageKey) return undefined;
  return supabase.storage.from("avatars").getPublicUrl(storageKey).data.publicUrl;
}

async function select(table, columns = "*", configure) {
  let query = supabase.from(table).select(columns);
  if (configure) query = configure(query);
  return unwrap(await query, `No se pudo leer ${table}.`);
}

// --------------------------------------------------------------------------
// Sesión
// --------------------------------------------------------------------------

export async function loadAccount() {
  const { data: sessionData } = await supabase.auth.getSession();
  store.session = sessionData.session;
  store.role = null;
  if (!store.session) {
    store.account = null;
    return null;
  }
  const rows = await select("user_accounts", "*, companies(legal_name, is_active, plan_code, plans(name, max_employees))", (q) =>
    q.eq("auth_user_id", store.session.user.id),
  );
  const account = rows[0] ?? null;

  // Administrador del sistema: no pertenece a ninguna empresa
  if (!account) {
    const admins = await select("system_admins", "display_name", (q) =>
      q.eq("auth_user_id", store.session.user.id),
    );
    if (admins.length) {
      const email = store.session.user.email;
      const name = admins[0].display_name || email;
      store.account = { role: "admin", is_active: true, must_change_password: false, email, display_name: name };
      store.role = "admin";
      store.isEmployer = false;
      store.company = null;
      store.user = { name, role: "Administrador del sistema", initials: getInitials(name), email };
      return store.account;
    }
    store.account = null;
    return null;
  }

  // Si la empresa está suspendida, sus datos no son visibles para la cuenta
  account.company_suspended = !account.companies;
  store.account = account;
  store.role = account.role;
  store.isEmployer = account.role === "employer";
  store.company = {
    id: account.company_id,
    name: account.companies?.legal_name,
    plan: account.companies?.plans ? { code: account.companies.plan_code, ...account.companies.plans } : null,
  };
  return store.account;
}

// --------------------------------------------------------------------------
// Carga completa de los datos que ve el usuario
// --------------------------------------------------------------------------

export async function hydrate() {
  if (!store.account || store.role === "admin") return;

  const [
    employees,
    accounts,
    departments,
    branches,
    jobPositions,
    shiftTypes,
    rules,
    ranges,
    schedules,
    attendance,
    daysOffRequests,
    vacationPeriods,
    vacationRequests,
    payrolls,
  ] = await Promise.all([
    select("employees", "*, departments(name), branches(name), job_positions(name)", (q) => q.order("employee_number")),
    select("user_accounts", "id, employee_id, email, display_name, role, is_active, profile_photo_storage_key"),
    select("departments", "id, name, is_active", (q) => q.order("name")),
    select("branches", "id, name, is_active", (q) => q.order("name")),
    select("job_positions", "id, name, is_active", (q) => q.order("name")),
    select("shift_types", "*", (q) => q.eq("is_active", true).order("starts_at")),
    select("business_rules", "*"),
    select("vacation_entitlement_ranges", "*", (q) => q.order("seniority_years_from")),
    select("work_schedules", "*", (q) => q.eq("status", "confirmed").order("week_start_date")),
    select("attendance_records", "*", (q) => q.order("work_date", { ascending: false })),
    select("days_off_requests", "*, days_off_request_dates(requested_date, notice_days, is_taken)", (q) =>
      q.order("submitted_at", { ascending: false }),
    ),
    select("vacation_periods", "*"),
    select("vacation_requests", "*", (q) => q.order("submitted_at", { ascending: false })),
    select("payroll_records", "*, payroll_periods(starts_on)", (q) => q.order("created_at", { ascending: false })),
  ]);

  store.raw = {
    employees, accounts, departments, branches, jobPositions, shiftTypes, rules, ranges,
    schedules, attendance, daysOffRequests, vacationPeriods, vacationRequests, payrolls,
  };

  // Reglas de negocio y tipos de turno
  const ruleRow = rules[0] ?? {};
  store.rules = {
    weeklyDaysOff: ruleRow.weekly_days_off ?? 2,
    daysOffNotice: ruleRow.days_off_notice ?? 2,
    vacationNotice: ruleRow.vacation_notice ?? 15,
    requiresDaysOffApproval: ruleRow.requires_days_off_approval ?? true,
    requiresVacationApproval: ruleRow.requires_vacation_approval ?? true,
    vacationRanges: ranges.map((range) => ({
      id: range.id,
      from: range.seniority_years_from,
      to: range.seniority_years_to,
      days: range.entitlement_days,
    })),
  };
  store.shiftTypes = shiftTypes.map((shift) => ({
    id: String(shift.id),
    dbId: shift.id,
    code: shift.code,
    name: shift.name,
    start: toTime(shift.starts_at),
    end: toTime(shift.ends_at),
  }));

  // Empleados
  const photoByEmployee = new Map(
    accounts
      .filter((account) => account.employee_id && account.profile_photo_storage_key)
      .map((account) => [account.employee_id, avatarUrlFor(account.profile_photo_storage_key)]),
  );
  const directory = employees.map((employee, index) => ({
    ...mapEmployee(employee, index),
    avatarUrl: photoByEmployee.get(employee.id),
  }));
  fill(employeeDirectory, directory);
  const byDbId = new Map(directory.map((employee) => [employee.dbId, employee]));
  const numberOf = (employeeDbId) => byDbId.get(employeeDbId)?.id ?? String(employeeDbId);

  store.currentEmployee = store.account.employee_id ? byDbId.get(store.account.employee_id) ?? null : null;
  const employerName = store.account.display_name || store.account.email;
  store.user = store.currentEmployee
    ? {
        employeeId: store.currentEmployee.id,
        name: store.currentEmployee.name,
        role: store.currentEmployee.role || "Empleado",
        initials: store.currentEmployee.initials,
      }
    : {
        employeeId: null,
        name: employerName,
        role: "Empleador",
        initials: getInitials(employerName),
      };
  store.user.company = store.company?.name ?? "";
  store.user.avatarUrl = avatarUrlFor(store.account.profile_photo_storage_key);

  const accountNames = new Map(
    accounts.map((account) => [account.id, account.display_name || byDbId.get(account.employee_id)?.name || account.email]),
  );

  buildEmpleadosData(directory, departments, branches, jobPositions);
  buildHorariosData(directory, schedules, attendance, numberOf);
  buildFrancosData(directory, daysOffRequests, accountNames, numberOf);
  buildVacacionesData(directory, vacationPeriods, vacationRequests, numberOf);
  buildSueldosData(directory, payrolls, numberOf);
  buildDashboardData(directory, schedules, attendance, numberOf);
}

function mapEmployee(employee, index) {
  const seniorityYears = yearsBetween(employee.hire_date);
  return {
    id: String(employee.employee_number),
    dbId: employee.id,
    name: employee.full_name,
    initials: getInitials(employee.full_name),
    email: employee.email,
    cuil: formatCuil(employee.cuil),
    role: employee.job_positions?.name ?? "",
    department: employee.departments?.name ?? "",
    branch: employee.branches?.name ?? "",
    collectiveAgreement: employee.collective_agreement,
    hireDate: employee.hire_date,
    tenureLabel: tenureLabel(employee.hire_date),
    seniorityYears,
    birthDate: employee.birth_date,
    age: yearsBetween(employee.birth_date),
    status: employmentStatusLabels[employee.employment_status] ?? "Activo",
    employmentStatus: employee.employment_status,
    avatarStyle: avatarStyles[index % avatarStyles.length],
  };
}

export function getEmployeeDbId(employeeNumber) {
  const employee = employeeDirectory.find((entry) => entry.id === String(employeeNumber));
  if (!employee) throw new Error(`No se encontró el empleado con legajo ${employeeNumber}.`);
  return employee.dbId;
}

// Días de vacaciones que corresponden según antigüedad al 31/12 del año
// (misma regla que aplica la base de datos).
export function entitlementFor(employee, year = new Date().getFullYear()) {
  if (!employee?.hireDate) return 0;
  const years = yearsBetween(employee.hireDate, new Date(year, 11, 31));
  const range = store.rules.vacationRanges.find(
    ({ from, to }) => years >= from && (to === null || years <= to),
  );
  return range?.days ?? 0;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    if (value) counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildEmpleadosData(directory, departments, branches, jobPositions) {
  const active = directory.filter((employee) => employee.employmentStatus === "active");
  const onLeave = directory.filter((employee) => employee.employmentStatus === "on_leave");
  const current = directory.filter((employee) => employee.employmentStatus !== "inactive");
  const month = todayKey().slice(0, 7);
  const areaCounts = countBy(current, "department");
  const averageTenure = current.length
    ? Math.round((current.reduce((sum, employee) => sum + employee.seniorityYears, 0) / current.length) * 10) / 10
    : 0;

  fill(empleadosData, {
    summary: {
      total: directory.length,
      active: active.length,
      onLeave: onLeave.length,
      inactive: directory.length - current.length,
      hiredThisMonth: directory.filter((employee) => employee.hireDate?.startsWith(month)).length,
      averageTenure,
      registeredPayroll: 100,
      areaDistribution: departments
        .filter((department) => department.is_active)
        .map((department) => ({ name: department.name, count: areaCounts[department.name] ?? 0 })),
    },
    roles: jobPositions.filter((position) => position.is_active).map((position) => position.name),
    branches: branches.filter((branch) => branch.is_active).map((branch) => branch.name),
    agreements: [...new Set(directory.map((employee) => employee.collectiveAgreement).filter(Boolean))],
    employees: employeeDirectory,
  });
}

function mapSchedule(schedule, numberOf) {
  const start = toTime(schedule.starts_at_snapshot);
  const end = toTime(schedule.ends_at_snapshot);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let hours = (eh * 60 + em - sh * 60 - sm) / 60;
  if (hours <= 0) hours += 24;
  return {
    id: schedule.id,
    employeeId: numberOf(schedule.employee_id),
    employeeDbId: schedule.employee_id,
    weekStartDate: schedule.week_start_date,
    weekNumber: getIsoWeekNumber(parseDateKey(schedule.week_start_date)),
    weekLabel: formatWeekLabel(schedule.week_start_date),
    shiftTypeId: String(schedule.shift_type_id),
    shift: schedule.shift_name_snapshot,
    start,
    end,
    hours,
    status: schedule.status === "confirmed" ? "Confirmado" : "Cancelado",
  };
}

function buildHorariosData(directory, schedules, attendance, numberOf) {
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekKey = toDateKey(weekStart);
  const mapped = schedules.map((schedule) => mapSchedule(schedule, numberOf));
  const thisWeek = mapped.filter((schedule) => schedule.weekStartDate === weekKey);
  const active = directory.filter((employee) => employee.employmentStatus === "active");

  // Primera entrada fichada de cada semana, por empleado
  const firstClockIn = new Map();
  [...attendance]
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .forEach((record) => {
      if (!record.clock_in_at) return;
      const key = `${record.employee_id}|${toDateKey(getWeekStart(parseDateKey(record.work_date)))}`;
      if (!firstClockIn.has(key)) {
        const time = new Date(record.clock_in_at).toLocaleTimeString("es-AR", {
          hour: "2-digit", minute: "2-digit", hour12: false,
        });
        firstClockIn.set(key, time);
      }
    });

  // Último fichaje de cada empleado por fecha (para el día actual)
  const attendanceByDay = new Map(
    attendance.map((record) => [`${numberOf(record.employee_id)}|${record.work_date}`, record]),
  );
  mapped.forEach((schedule) => {
    const todayRecord = attendanceByDay.get(`${schedule.employeeId}|${todayKey()}`);
    if (schedule.weekStartDate === weekKey && todayRecord?.clock_in_at) {
      schedule.clockIn = new Date(todayRecord.clock_in_at).toLocaleTimeString("es-AR", {
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
    }
  });

  fill(horariosData, {
    week: {
      number: getIsoWeekNumber(weekStart),
      start: weekStart.getDate(),
      end: weekEnd.getDate(),
      month: capitalize(spanishMonths[weekEnd.getMonth()]),
      year: weekEnd.getFullYear(),
    },
    summary: {
      scheduledHours: thisWeek.reduce((sum, schedule) => sum + schedule.hours * 7, 0),
      requiredHours: 0,
      assignedEmployees: new Set(thisWeek.map((schedule) => schedule.employeeId)).size,
      activeEmployees: active.length,
    },
    employees: employeeDirectory,
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    schedules: mapped,
    weeklyHistory: mapped
      .filter((schedule) => schedule.weekStartDate <= weekKey)
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
      .map((schedule) => ({
        id: schedule.id,
        employeeId: schedule.employeeId,
        weekStartDate: schedule.weekStartDate,
        week: formatShortWeek(schedule.weekStartDate),
        period: formatWeekPeriod(schedule.weekStartDate),
        clockIn: firstClockIn.get(`${schedule.employeeDbId}|${schedule.weekStartDate}`) ?? null,
      })),
    attendance: attendance.map((record) => ({
      id: record.id,
      employeeId: numberOf(record.employee_id),
      workDate: record.work_date,
      clockInAt: record.clock_in_at,
      clockOutAt: record.clock_out_at,
      status: record.status,
    })),
  });
}

function buildFrancosData(directory, requests, accountNames, numberOf) {
  const mapped = requests.map((request) => {
    const dates = (request.days_off_request_dates ?? []).map((item) => item.requested_date).sort();
    const notice = (request.days_off_request_dates ?? [])
      .map((item) => item.notice_days)
      .filter((value) => value !== null && value !== undefined);
    const resolver = request.resolved_by_user_id ? accountNames.get(request.resolved_by_user_id) : null;
    const status = requestStatusLabels[request.status] ?? request.status;
    let resolution = "";
    if (request.status === "approved") {
      resolution = request.request_type === "employer_assignment"
        ? `Asignado por ${resolver ?? "el empleador"}`
        : resolver ? `Por ${resolver}` : request.resolution_note || "Aprobación automática";
    } else if (request.status === "rejected") {
      resolution = request.resolution_note || "Rechazado";
    }
    return {
      id: request.id,
      employeeId: numberOf(request.employee_id),
      requestedDates: dates,
      requestedDate: dates[0],
      noticeDays: notice.length ? Math.min(...notice) : 0,
      status,
      resolution,
      reason: request.reason,
      category: request.category,
      requestType: request.request_type,
      submittedAt: request.submitted_at,
    };
  });

  const month = todayKey().slice(0, 7);
  const inMonth = (request) => request.requestedDates.some((date) => date.startsWith(month));
  fill(francosData, {
    month: toPeriodLabel(`${month}-01`),
    summary: {
      total: mapped.length,
      pending: mapped.filter((request) => request.status === "Pendiente de revisión").length,
      approved: mapped.filter((request) => request.status === "Aceptado" && inMonth(request)).length,
      rejected: mapped.filter((request) => request.status === "Rechazado").length,
    },
    requests: mapped.filter((request) => request.status !== "Cancelado"),
  });

  // Vista del empleado: sus propias solicitudes
  const own = store.currentEmployee
    ? mapped.filter((request) => request.employeeId === store.currentEmployee.id)
    : [];
  fill(
    employeeFrancoRequests,
    own.map((request) => ({
      id: request.id,
      employeeId: request.employeeId,
      dates: request.requestedDates,
      type:
        request.requestType === "employer_assignment"
          ? "Asignado"
          : request.requestedDates.length > 1
            ? "Agrupados"
            : "Individual",
      sentAt: request.submittedAt?.slice(0, 10),
      status: request.status,
      opinion: request.status === "Rechazado" ? request.resolution : "—",
      reason: request.reason ?? "",
    })),
  );
  const today = todayKey();
  fill(
    employeeFrancoTaken,
    own
      .filter((request) => request.status === "Aceptado")
      .map((request) => ({
        id: request.id,
        requestId: request.id,
        dates: request.requestedDates.filter((date) => date < today),
      }))
      .filter((item) => item.dates.length > 0),
  );
}

function dayCount(start, end) {
  return Math.round((parseDateKey(end) - parseDateKey(start)) / 86400000) + 1;
}

function overlapDays(start, end, rangeStart, rangeEnd) {
  const from = start > rangeStart ? start : rangeStart;
  const to = end < rangeEnd ? end : rangeEnd;
  return from > to ? 0 : dayCount(from, to);
}

function buildVacacionesData(directory, periods, requests, numberOf) {
  const year = new Date().getFullYear();
  const periodById = new Map(periods.map((period) => [period.id, period]));
  const usedByPeriod = new Map();
  requests
    .filter((request) => request.status === "pending" || request.status === "approved")
    .forEach((request) => {
      usedByPeriod.set(request.vacation_period_id, (usedByPeriod.get(request.vacation_period_id) ?? 0) + request.requested_days);
    });

  const balanceOf = (employee, periodYear = year) => {
    const period = periods.find(
      (item) => item.employee_id === employee.dbId && item.period_code === String(periodYear),
    );
    const entitled = period ? period.entitled_days : entitlementFor(employee, periodYear);
    const used = period ? usedByPeriod.get(period.id) ?? 0 : 0;
    return Math.max(0, entitled - used);
  };

  const mapped = requests.map((request) => {
    const period = periodById.get(request.vacation_period_id);
    const periodYear = Number(period?.period_code ?? request.start_date.slice(0, 4));
    const employee = directory.find((item) => item.dbId === request.employee_id);
    return {
      id: request.id,
      employeeId: numberOf(request.employee_id),
      period: `${periodYear} / ${periodYear + 1}`,
      periodYear,
      requestDate: toDisplayDate(request.submitted_at),
      startDate: toDisplayDate(request.start_date),
      endDate: toDisplayDate(request.end_date),
      startKey: request.start_date,
      endKey: request.end_date,
      days: request.requested_days,
      remainingBalance: employee ? balanceOf(employee, periodYear) : 0,
      status: vacationStatusLabels[request.status] ?? request.status,
      resolution: request.resolution_note,
    };
  });

  const today = todayKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEndDate = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0);
  const monthEnd = toDateKey(monthEndDate);
  const approved = mapped.filter((request) => request.status === "Aprobada");
  const current = directory.filter((employee) => employee.employmentStatus !== "inactive");
  const onVacationToday = new Set(
    approved.filter((request) => request.startKey <= today && request.endKey >= today).map((request) => request.employeeId),
  );
  const in15Days = toDateKey(new Date(Date.now() + 15 * 86400000));
  const balances = current.map((employee) => balanceOf(employee));
  const activeStaffing = current.length
    ? Math.round(((current.length - onVacationToday.size) / current.length) * 100)
    : 100;

  fill(vacacionesData, {
    summary: {
      total: mapped.filter((request) => request.status !== "Cancelada").length,
      pending: mapped.filter((request) => request.status === "Pendiente").length,
      approved: approved.length,
      rejected: mapped.filter((request) => request.status === "Rechazada").length,
      onLeave: onVacationToday.size,
      daysAssignedThisMonth: approved.reduce(
        (sum, request) => sum + overlapDays(request.startKey, request.endKey, monthStart, monthEnd), 0),
      averageBalance: balances.length ? Math.round(balances.reduce((a, b) => a + b, 0) / balances.length) : 0,
      upcomingDeadlines: mapped.filter(
        (request) => request.status === "Pendiente" && request.startKey <= in15Days,
      ).length,
      activeStaffing,
      staffingStatus: activeStaffing >= 85 ? "Sin conflicto de dotación mínima" : "Dotación por debajo del 85%",
      legalExpiry: `Período ${year}: hasta el 31/05/${year + 1}`,
    },
    employees: directory.map((employee) => ({ ...employee, balance: balanceOf(employee) })),
    requests: mapped.filter((request) => request.status !== "Cancelada"),
  });
}

function buildSueldosData(directory, payrolls, numberOf) {
  const period = toPeriodLabel(`${todayKey().slice(0, 7)}-01`);
  const mapped = payrolls.map((payroll) => ({
    id: payroll.id,
    employeeId: numberOf(payroll.employee_id),
    employeeDbId: payroll.employee_id,
    period: toPeriodLabel(payroll.payroll_periods?.starts_on ?? payroll.created_at),
    periodStart: payroll.payroll_periods?.starts_on,
    amount: payroll.net_amount === null ? null : Number(payroll.net_amount),
    paymentDate: toDisplayDate(payroll.payment_date),
    status: payroll.status === "paid" ? "Realizado" : payroll.status === "cancelled" ? "Anulado" : "Pendiente",
    paymentType: payroll.payment_type,
    paymentTypeLabel: paymentTypeLabels[payroll.payment_type] ?? payroll.payment_type,
    receiptName: payroll.receipt_original_file_name,
    receiptKey: payroll.receipt_storage_key,
  }));

  // Los empleados activos sin sueldo registrado en el período actual aparecen como pendientes
  const current = directory.filter((employee) => employee.employmentStatus !== "inactive");
  const withSalary = new Set(
    mapped
      .filter((payroll) => payroll.period === period && payroll.paymentType === "salary" && payroll.status === "Realizado")
      .map((payroll) => payroll.employeeId),
  );
  const pendingRows = current
    .filter((employee) => !withSalary.has(employee.id))
    .filter((employee) => !mapped.some((payroll) => payroll.employeeId === employee.id && payroll.period === period && payroll.paymentType === "salary"))
    .map((employee) => ({
      id: `pendiente-${employee.id}`,
      employeeId: employee.id,
      employeeDbId: employee.dbId,
      period,
      amount: null,
      paymentDate: null,
      status: "Pendiente",
      paymentType: "salary",
      paymentTypeLabel: paymentTypeLabels.salary,
      receiptName: null,
      receiptKey: null,
      virtual: true,
    }));

  const currentPeriodPaid = mapped.filter((payroll) => payroll.period === period && payroll.status === "Realizado");
  const previousDate = new Date();
  previousDate.setDate(1);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousPeriod = toPeriodLabel(toDateKey(previousDate));
  const previousNet = mapped
    .filter((payroll) => payroll.period === previousPeriod && payroll.status === "Realizado")
    .reduce((sum, payroll) => sum + (payroll.amount ?? 0), 0);
  const currentNet = currentPeriodPaid.reduce((sum, payroll) => sum + (payroll.amount ?? 0), 0);
  const pendingByDepartment = countBy(
    pendingRows.map((row) => directory.find((employee) => employee.id === row.employeeId)).filter(Boolean),
    "department",
  );

  fill(sueldosData, {
    period,
    totals: {
      employees: current.length,
      settled: new Set(currentPeriodPaid.filter((p) => p.paymentType === "salary").map((p) => p.employeeId)).size,
      receipts: currentPeriodPaid.filter((payroll) => payroll.receiptKey).length,
      netPayroll: currentNet,
      previousMonthChange: previousNet ? Math.round(((currentNet - previousNet) / previousNet) * 1000) / 10 : 0,
      legalDueDate: "4to día hábil del mes siguiente",
      pendingByDepartment: Object.entries(pendingByDepartment).map(([department, count]) => ({ department, count })),
    },
    employees: directory.filter((employee) => employee.employmentStatus !== "inactive"),
    payrolls: [...mapped, ...pendingRows],
    departments: [...new Set(directory.map((employee) => employee.department).filter(Boolean))],
    historicalPayrolls: mapped.filter((payroll) => payroll.period !== period),
  });
}

function buildDashboardData(directory, schedules, attendance, numberOf) {
  const today = todayKey();
  const active = directory.filter((employee) => employee.employmentStatus === "active");
  const presentToday = attendance.filter((record) => record.work_date === today && record.clock_in_at).length;
  const pendingFrancos = francosData.requests.filter((request) => request.status === "Pendiente de revisión");
  const pendingVacations = vacacionesData.requests.filter((request) => request.status === "Pendiente");
  const month = today.slice(0, 7);
  const hiredThisMonth = directory.filter((employee) => employee.hireDate?.startsWith(month)).length;
  const averageNotice = pendingVacations.length
    ? Math.round(
        pendingVacations.reduce(
          (sum, request) => sum + Math.max(0, dayCount(today, request.startKey) - 1), 0,
        ) / pendingVacations.length,
      )
    : 0;
  const attendancePct = active.length ? Math.round((presentToday / active.length) * 1000) / 10 : 0;

  const formatDay = (dateKey) => {
    const date = parseDateKey(dateKey);
    return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" })
      .format(date)
      .replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
  };

  const requests = [
    ...pendingFrancos.map((request) => ({
      kind: "days_off",
      id: request.id,
      employeeId: request.employeeId,
      type: request.requestedDates.length > 1 ? "Francos agrupados" : "Franco",
      date: request.requestedDates.map(formatDay).join(" • "),
      icon: "calendar",
    })),
    ...pendingVacations.map((request) => ({
      kind: "vacation",
      id: request.id,
      employeeId: request.employeeId,
      type: "Vacaciones",
      date: `${request.startDate} - ${request.endDate} (${request.days} días corridos)`,
      icon: "vacation",
    })),
  ];

  // Próximos 5 días con ausencias programadas (francos o vacaciones aprobadas)
  const absencesFor = (dateKey) => [
    ...francosData.requests
      .filter((request) => request.status === "Aceptado" && request.requestedDates.includes(dateKey))
      .map((request) => ({ employeeId: request.employeeId, description: "Franco", status: "Confirmado" })),
    ...vacacionesData.requests
      .filter((request) => request.status === "Aprobada" && request.startKey <= dateKey && request.endKey >= dateKey)
      .map((request) => ({
        employeeId: request.employeeId,
        description: `Vacaciones (día ${dayCount(request.startKey, dateKey)}/${request.days})`,
        status: "Licencia",
      })),
  ];
  const weekDays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const key = toDateKey(date);
    return {
      key,
      label: capitalize(new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date).replace(".", "")),
      date: date.getDate(),
      hasAbsences: absencesFor(key).length > 0,
      selected: index === 0,
      absences: absencesFor(key),
    };
  });

  const todayShift = schedules.find(
    (schedule) => schedule.week_start_date === toDateKey(getWeekStart(new Date())),
  );

  fill(dashboardData, {
    user: store.user,
    metrics: [
      {
        id: "activeEmployees",
        label: "Empleados Activos",
        value: active.length,
        trend: hiredThisMonth ? `+${hiredThisMonth} este mes` : "Sin altas este mes",
        detail: `${directory.length} legajos registrados`,
        action: "Ver directorio",
        href: "/employer/empleados",
        icon: "employees",
      },
      {
        id: "pendingDaysOff",
        label: "Francos Pendientes",
        value: pendingFrancos.length,
        status: pendingFrancos.length ? "Requiere acción" : "Al día",
        detail: `${pendingFrancos.reduce((sum, request) => sum + request.requestedDates.length, 0)} días solicitados`,
        action: "Revisar",
        href: "/employer/francos",
        icon: "calendar",
      },
      {
        id: "vacationsToApprove",
        label: "Vacaciones a Autorizar",
        value: pendingVacations.length,
        status: pendingVacations.length ? "Nuevas solicitudes" : "Al día",
        detail: `Anticipación media: ${averageNotice} días`,
        action: "Revisar",
        href: "/employer/vacaciones",
        icon: "vacation",
      },
      {
        id: "todayAttendance",
        label: "Asistencia de Hoy",
        value: attendancePct,
        present: presentToday,
        total: active.length,
        detail: `${weekDays[0].absences.length} ausencias programadas`,
        shift: todayShift?.shift_name_snapshot ?? "Sin turnos",
        icon: "clock",
      },
    ],
    requests,
    pendingRequestCount: requests.length,
    coverageRule: `Regla activa: ${store.rules.weeklyDaysOff} francos por semana • aviso de ${store.rules.daysOffNotice} días`,
    weekDays,
    absences: weekDays[0].absences,
  });
}

// Recarga todos los datos después de una operación
export async function refreshData() {
  await hydrate();
}
