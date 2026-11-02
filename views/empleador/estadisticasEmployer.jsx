import React, { useMemo, useState } from "react";
import ChartCanvas from "../../components/ChartCanvas";
import { store } from "../../lib/store";
import { getWeekStart, parseDateKey, toDateKey, todayKey } from "../../lib/format";
import {
  addDays,
  buildWorkforceIndex,
  eachDay,
  monthLong,
  monthShort,
  shiftBand,
  weekdayLong,
  weekdayShort,
} from "../../lib/workforce";
import Select from "../../components/Select";

function Icon({ children, className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const selectClassName =
  "rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-[0.5625rem] font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const bandLabels = {
  morning: "Mañana (06 a 14)",
  afternoon: "Tarde (14 a 22)",
  night: "Noche (22 a 06)",
};

const gridColor = "#eef2f7";
const axisColor = "#cbd5e1";

function periodRange(period, today = todayKey()) {
  const date = parseDateKey(today);
  const year = date.getFullYear();
  const month = date.getMonth();
  if (period === "quarter") {
    return { from: toDateKey(new Date(year, month - 2, 1)), to: toDateKey(new Date(year, month + 1, 0)) };
  }
  if (period === "year") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return { from: toDateKey(new Date(year, month, 1)), to: toDateKey(new Date(year, month + 1, 0)) };
}

function previousRange({ from, to }) {
  const length = eachDay(from, to).length;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

function formatNumber(value, decimals = 0) {
  return value.toLocaleString("es-AR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function KpiCard({ title, value, badge, badgeClass, note, iconClass, icon }) {
  return (
    <article className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{title}</div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold ${badgeClass}`}>{badge}</span>
          )}
        </div>
        <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>{icon}</div>
    </article>
  );
}

function ChartCard({ title, subtitle, tag, children, footer, className = "" }) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[0.625rem] text-slate-500">{subtitle}</p>
        </div>
        {tag}
      </div>
      {children}
      {footer && <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div>}
    </section>
  );
}

function InsightCard({ tone, title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-900",
    blue: "border-blue-200/70 bg-blue-50/60 text-blue-900",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };
  return (
    <div className={`rounded-xl border p-3.5 text-[0.625rem] ${tones[tone]}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 leading-relaxed opacity-90">{children}</p>
    </div>
  );
}

function lineDataset(label, data, color, extra = {}) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: `${color}17`,
    borderWidth: 2.5,
    cubicInterpolationMode: "monotone",
    fill: true,
    pointBackgroundColor: "#ffffff",
    pointBorderColor: color,
    pointBorderWidth: 2,
    pointRadius: 3.5,
    pointHoverRadius: 6,
    ...extra,
  };
}

function baseOptions({ legend = false, yTitle } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: legend, position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
      tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 6 },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: gridColor },
        border: { color: axisColor },
        title: yTitle ? { display: true, text: yTitle } : undefined,
      },
      x: { grid: { display: false }, border: { color: axisColor }, ticks: { color: "#475569" } },
    },
  };
}

export default function EstadisticasEmployer() {
  const [department, setDepartment] = useState("all");
  const [period, setPeriod] = useState("month");

  const today = todayKey();
  const currentDate = parseDateKey(today);
  const currentYear = currentDate.getFullYear();
  const monthName = monthLong[currentDate.getMonth()];

  const index = useMemo(() => buildWorkforceIndex(), []);
  const departments = useMemo(
    () => [...new Set(index.employees.map((employee) => employee.department).filter(Boolean))].sort(),
    [index],
  );

  const stats = useMemo(() => {
    const employees = index.employees.filter(
      (employee) => department === "all" || employee.department === department,
    );
    const employeeIds = new Set(employees.map((employee) => employee.dbId));
    const range = periodRange(period, today);
    const days = eachDay(range.from, range.to);

    // Turnos asignados por día, día de la semana y franja
    const byWeekday = Array(7).fill(0);
    const weekdayOccurrences = Array(7).fill(0);
    const byBand = { morning: 0, afternoon: 0, night: 0 };
    let totalShifts = 0;
    days.forEach((dateKey) => {
      const weekday = parseDateKey(dateKey).getDay();
      weekdayOccurrences[weekday] += 1;
      employees.forEach((employee) => {
        const day = index.dayFor(employee, dateKey);
        if (day.type !== "shift") return;
        totalShifts += 1;
        byWeekday[weekday] += 1;
        const band = shiftBand(day.schedule.starts_at_snapshot);
        if (band) byBand[band] += 1;
      });
    });

    let previousShifts = 0;
    const previous = previousRange(range);
    eachDay(previous.from, previous.to).forEach((dateKey) => {
      employees.forEach((employee) => {
        if (index.dayFor(employee, dateKey).type === "shift") previousShifts += 1;
      });
    });

    const averageByWeekday = byWeekday.map((count, weekday) =>
      weekdayOccurrences[weekday] ? count / weekdayOccurrences[weekday] : 0,
    );
    const peakWeekday = averageByWeekday.indexOf(Math.max(...averageByWeekday));
    const minWeekday = averageByWeekday.indexOf(Math.min(...averageByWeekday));

    // Cobertura de la planificación: quién tiene horario esta semana
    const weekKey = toDateKey(getWeekStart(currentDate));
    const available = employees.filter((employee) => employee.employmentStatus === "active");
    const withSchedule = available.filter((employee) => index.scheduleFor(employee.dbId, weekKey));
    const coverage = available.length ? (withSchedule.length / available.length) * 100 : 0;

    // Solicitudes de vacaciones por mes de inicio, en el año del período
    const year = parseDateKey(range.to).getFullYear();
    const vacationRequests = (store.raw?.vacationRequests ?? []).filter((request) => employeeIds.has(request.employee_id));
    const approvedByMonth = Array(12).fill(0);
    const pendingByMonth = Array(12).fill(0);
    vacationRequests.forEach((request) => {
      const start = parseDateKey(request.start_date);
      if (start.getFullYear() !== year) return;
      if (request.status === "approved") approvedByMonth[start.getMonth()] += 1;
      if (request.status === "pending") pendingByMonth[start.getMonth()] += 1;
    });
    const totalByMonth = approvedByMonth.map((value, monthIndex) => value + pendingByMonth[monthIndex]);
    const yearTotal = totalByMonth.reduce((sum, value) => sum + value, 0);

    const pending = vacationRequests.filter((request) => request.status === "pending");
    const pendingMonths = new Map();
    pending.forEach((request) => {
      const key = request.start_date.slice(0, 7);
      pendingMonths.set(key, (pendingMonths.get(key) ?? 0) + 1);
    });
    const topPendingMonth = [...pendingMonths.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      range,
      year,
      totalShifts,
      previousShifts,
      averageByWeekday,
      peakWeekday,
      minWeekday,
      byWeekday,
      byBand,
      coverage,
      available: available.length,
      withoutSchedule: available.length - withSchedule.length,
      approvedByMonth,
      pendingByMonth,
      totalByMonth,
      yearTotal,
      pendingCount: pending.length,
      topPendingMonth,
    };
  }, [index, department, period, today]);

  const change = stats.previousShifts
    ? ((stats.totalShifts - stats.previousShifts) / stats.previousShifts) * 100
    : null;
  const hasShifts = stats.totalShifts > 0;
  const peakShare = hasShifts ? (stats.byWeekday[stats.peakWeekday] / stats.totalShifts) * 100 : 0;
  const bandTotal = stats.byBand.morning + stats.byBand.afternoon + stats.byBand.night;
  const bandShare = (band) => (bandTotal ? Math.round((stats.byBand[band] / bandTotal) * 100) : 0);
  const coverageBadge =
    stats.coverage >= 95 ? ["Óptima", "bg-emerald-50 text-emerald-700"]
      : stats.coverage >= 80 ? ["Aceptable", "bg-amber-50 text-amber-800"]
        : ["Baja", "bg-red-50 text-red-700"];

  const monthlyAverage = stats.yearTotal / 12;
  const busiestMonth = stats.totalByMonth.indexOf(Math.max(...stats.totalByMonth));
  const quietMonths = stats.totalByMonth
    .map((value, monthIndex) => (value === 0 ? monthLong[monthIndex] : null))
    .filter(Boolean);
  const rules = store.rules ?? {};

  const weekdayConfig = useMemo(
    () => ({
      type: "line",
      data: {
        labels: weekdayShort,
        datasets: [
          lineDataset(
            "Personas por día (promedio)",
            stats.averageByWeekday.map((value) => Math.round(value * 10) / 10),
            "#2563eb",
          ),
        ],
      },
      options: baseOptions({ yTitle: "Personas" }),
    }),
    [stats],
  );

  const bandConfig = useMemo(
    () => ({
      type: "bar",
      data: {
        labels: [bandLabels.morning, bandLabels.afternoon, bandLabels.night],
        datasets: [
          {
            label: "Turnos asignados",
            data: [stats.byBand.morning, stats.byBand.afternoon, stats.byBand.night],
            backgroundColor: ["#2563eb", "#60a5fa", "#93c5fd"],
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      },
      options: { ...baseOptions({ yTitle: "Turnos" }), interaction: { mode: "nearest", intersect: true } },
    }),
    [stats],
  );

  const vacationConfig = useMemo(
    () => ({
      type: "line",
      data: {
        labels: monthShort,
        datasets: [
          lineDataset("Aprobadas", stats.approvedByMonth, "#2563eb"),
          lineDataset("Pendientes", stats.pendingByMonth, "#f59e0b", { fill: false }),
          {
            label: "Promedio mensual",
            data: Array(12).fill(Math.round(monthlyAverage * 10) / 10),
            borderColor: "#94a3b8",
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: baseOptions({ legend: true, yTitle: "Solicitudes" }),
    }),
    [stats, monthlyAverage],
  );

  const periodLabel = {
    month: `${monthName} ${currentYear}`,
    quarter: "los últimos tres meses",
    year: `el año ${currentYear}`,
  }[period];

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <nav
                aria-label="Ruta de navegación"
                className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
              >
                <span>Operaciones &amp; RRHH</span>
                <span aria-hidden="true">›</span>
                <span className="text-blue-700">Estadísticas</span>
              </nav>
              <h1 className="page-title">Estadísticas de demanda de personal</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="stats-department">Departamento</label>
              <Select
                className={selectClassName}
                id="stats-department"
                onChange={(event) => setDepartment(event.target.value)}
                value={department}
              >
                <option value="all">Todos los departamentos</option>
                {departments.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
              <label className="sr-only" htmlFor="stats-period">Período</label>
              <Select
                className={selectClassName}
                id="stats-period"
                onChange={(event) => setPeriod(event.target.value)}
                value={period}
              >
                <option value="month">{monthName} {currentYear} (mes actual)</option>
                <option value="quarter">Últimos tres meses</option>
                <option value="year">Año {currentYear} completo</option>
              </Select>
            </div>
          </header>

          <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              badge={change === null ? null : `${change >= 0 ? "↑" : "↓"} ${formatNumber(Math.abs(change), 1)}%`}
              badgeClass={change !== null && change < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}
              icon={
                <Icon>
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </Icon>
              }
              iconClass="bg-blue-50 text-blue-600"
              note={
                change === null
                  ? "Sin turnos en el período anterior para comparar"
                  : `vs. ${formatNumber(stats.previousShifts)} en el período anterior`
              }
              title="Total turnos asignados"
              value={formatNumber(stats.totalShifts)}
            />
            <KpiCard
              badge={stats.available ? coverageBadge[0] : null}
              badgeClass={coverageBadge[1]}
              icon={
                <Icon>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Icon>
              }
              iconClass="bg-emerald-50 text-emerald-600"
              note={
                stats.withoutSchedule === 0
                  ? "Todo el personal activo tiene horario esta semana"
                  : `${stats.withoutSchedule} ${stats.withoutSchedule === 1 ? "persona" : "personas"} sin horario esta semana`
              }
              title="Cobertura de horarios"
              value={`${formatNumber(stats.coverage, 0)}%`}
            />
            <KpiCard
              badge={hasShifts ? "Mayor demanda" : null}
              badgeClass="bg-amber-50 text-amber-800"
              icon={
                <Icon>
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </Icon>
              }
              iconClass="bg-amber-50 text-amber-600"
              note={hasShifts ? `${formatNumber(peakShare, 0)}% de los turnos del período` : "Todavía no hay turnos en el período"}
              title="Pico semanal"
              value={hasShifts ? weekdayLong[stats.peakWeekday] : "—"}
            />
            <KpiCard
              badge={stats.pendingCount ? "Pendientes" : null}
              badgeClass="bg-indigo-50 text-indigo-700"
              icon={
                <Icon>
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Icon>
              }
              iconClass="bg-indigo-50 text-indigo-600"
              note={
                stats.topPendingMonth
                  ? `La mayoría para ${monthLong[Number(stats.topPendingMonth.slice(5, 7)) - 1]} ${stats.topPendingMonth.slice(0, 4)}`
                  : "No hay solicitudes esperando respuesta"
              }
              title="Solicitudes de vacaciones"
              value={formatNumber(stats.pendingCount)}
            />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              footer={
                hasShifts ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[0.625rem] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
                      Mayor volumen:{" "}
                      <strong className="text-slate-800">
                        {weekdayLong[stats.peakWeekday]} ({formatNumber(stats.averageByWeekday[stats.peakWeekday], 1)} personas)
                      </strong>
                    </span>
                    <span>
                      Mínimo: {weekdayLong[stats.minWeekday]} ({formatNumber(stats.averageByWeekday[stats.minWeekday], 1)})
                    </span>
                  </div>
                ) : null
              }
              subtitle={`Personas trabajando por día, en promedio, durante ${periodLabel}`}
              tag={<span className="rounded bg-blue-50 px-2 py-0.5 text-[0.5625rem] font-semibold text-blue-700">Dom a Sáb</span>}
              title="Turnos asignados por día de la semana"
            >
              <ChartCanvas config={weekdayConfig} label="Gráfico de personas por día de la semana" />
            </ChartCard>

            <ChartCard
              footer={
                <div className="grid grid-cols-3 gap-2 text-center text-[0.625rem]">
                  {["morning", "afternoon", "night"].map((band) => (
                    <div className="rounded-lg bg-slate-50 p-1.5" key={band}>
                      <span className="block text-[0.5625rem] text-slate-500">{bandLabels[band].split(" ")[0]}</span>
                      <strong className="text-slate-800">{bandShare(band)}% de los turnos</strong>
                    </div>
                  ))}
                </div>
              }
              subtitle="Según la hora de inicio de cada turno asignado"
              tag={<span className="rounded bg-slate-100 px-2 py-0.5 text-[0.5625rem] font-semibold text-slate-600">3 franjas</span>}
              title="Turnos asignados por franja horaria"
            >
              <ChartCanvas config={bandConfig} label="Gráfico de turnos por franja horaria" />
            </ChartCard>
          </div>

          <ChartCard
            footer={
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <InsightCard title="Temporada alta" tone="amber">
                  {stats.yearTotal
                    ? `${monthLong[busiestMonth]} concentra ${stats.totalByMonth[busiestMonth]} ${
                        stats.totalByMonth[busiestMonth] === 1 ? "solicitud" : "solicitudes"
                      } en ${stats.year}. Conviene planificar reemplazos con anticipación para ese mes.`
                    : `Todavía no hay solicitudes de vacaciones para ${stats.year}.`}
                </InsightCard>
                <InsightCard title="Meses sin pedidos" tone="blue">
                  {quietMonths.length === 12
                    ? "Ningún mes tiene solicitudes todavía."
                    : quietMonths.length
                      ? `${quietMonths.length} ${quietMonths.length === 1 ? "mes" : "meses"} sin solicitudes: ${quietMonths.slice(0, 4).join(", ")}${quietMonths.length > 4 ? " y otros" : ""}.`
                      : "Todos los meses tienen al menos una solicitud."}
                </InsightCard>
                <InsightCard title="Reglas vigentes" tone="slate">
                  Las vacaciones se piden con {rules.vacationNotice ?? 0} días de aviso y{" "}
                  {rules.requiresVacationApproval ? "requieren tu aprobación" : "se aprueban solas si cumplen las reglas"}.
                  Francos: {rules.weeklyDaysOff ?? 0} por semana, con {rules.daysOffNotice ?? 0} días de aviso.
                </InsightCard>
              </div>
            }
            subtitle={`Solicitudes por mes de inicio, de enero a diciembre de ${stats.year}`}
            title="Meses con más solicitudes de vacaciones"
          >
            <ChartCanvas className="h-72" config={vacationConfig} label="Gráfico de solicitudes de vacaciones por mes" />
          </ChartCard>
        </div>
      </main>
    </div>
  );
}
