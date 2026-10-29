import React, { useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import PaginationControls from "../../components/PaginationControls";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import ScheduleSummaryCard from "../../components/cards/empleador/ScheduleSummaryCard";
import {
  getEmployeeById,
  sortByEmployeeDirectory,
} from "../../data/employeeDirectory";
import { horariosData } from "../../data/horariosData";
import { getShiftDuration, getShiftTypes } from "../../data/shiftTypes";
import { usePagination } from "../../hooks/usePagination";
import { assignSchedule, deleteSchedule } from "../../lib/api";
import Select from "../../components/Select";

const initialForm = {
  employeeId: "",
  shiftTypeId: "",
};

function getEmployee(employeeId) {
  return getEmployeeById(employeeId);
}

function getWeekStart(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);
  return weekStart;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getIsoWeekNumber(date) {
  const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
}

function formatWeekDateRange(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const formatDay = (date) =>
    new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(date);
  const formatMonth = (date) =>
    new Intl.DateTimeFormat("es-AR", { month: "long" })
      .format(date)
      .replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();
  if (startYear !== endYear) {
    return `${formatDay(weekStart)} de ${formatMonth(weekStart)} ${startYear} al ${formatDay(weekEnd)} de ${formatMonth(weekEnd)} ${endYear}`;
  }
  return weekStart.getMonth() === weekEnd.getMonth()
    ? `${formatDay(weekStart)} al ${formatDay(weekEnd)} de ${formatMonth(weekEnd)} ${endYear}`
    : `${formatDay(weekStart)} de ${formatMonth(weekStart)} al ${formatDay(weekEnd)} de ${formatMonth(weekEnd)} ${endYear}`;
}

function formatWeekLabel(weekStart) {
  return `Semana ${getIsoWeekNumber(weekStart)} • ${formatWeekDateRange(weekStart)}`;
}

function getAssignableWeeks(today = new Date()) {
  const firstWeek = getWeekStart(today);
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  const twelveWeeksAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 84);
  const lastWeek = getWeekStart(yearEnd > twelveWeeksAhead ? yearEnd : twelveWeeksAhead);
  const weeks = [];

  for (
    let weekStart = firstWeek;
    weekStart <= lastWeek;
    weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  ) {
    weeks.push({
      key: getDateKey(weekStart),
      number: getIsoWeekNumber(weekStart),
      label: formatWeekLabel(weekStart),
      dateRange: formatWeekDateRange(weekStart),
    });
  }

  return weeks;
}

function Icon({ className, name }) {
  return <i aria-hidden="true" className={`fa-${name} ${className}`} />;
}

function Field({ children, className = "", label }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[0.6875rem] font-semibold text-slate-700">
        {label}
      </label>
      {typeof children === "function" ? children() : children}
    </div>
  );
}

function SelectField({ children, className = "", ...props }) {
  return (
    <Select
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[0.5625rem] font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${className}`}
      {...props}
    >
      {children}
    </Select>
  );
}

function ScheduleTable({ onDelete, schedules }) {
  return (
    <div className="overflow-x-auto">
      <table className="hr-data-table hr-data-table--standard w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3">EMPLEADO</th>
            <th className="px-5 py-3">Semana asignada</th>
            <th className="px-5 py-3">Tipo de turno y horario</th>
            <th className="px-5 py-3">Estado de cobertura</th>
            <th className="px-5 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {schedules.map((schedule) => {
            const employee = getEmployee(schedule.employeeId);
            return (
              <tr
                className="transition-colors hover:bg-slate-50/70"
                key={schedule.id}
              >
                <td className="employee-identity-cell px-5 py-3.5">
                  <EmployeeIdentity
                    avatarStyle={employee.avatarStyle}
                    department={employee.department}
                    name={employee.name}
                    nameClassName="text-[0.625rem] leading-snug"
                    size="lg"
                    metadataClassName="text-[0.5625rem] font-normal"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center space-x-1.5 whitespace-nowrap rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[0.6875rem] font-medium text-blue-700">
                    <Icon className="text-[0.625rem]" name="regular fa-calendar" />
                    <span>{schedule.weekLabel}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="font-semibold text-slate-900">{schedule.shift}</span>
                    <span className="font-medium text-slate-600">
                      {schedule.start}–{schedule.end}
                    </span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">
                      {schedule.hours} h
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[0.6875rem] font-medium text-emerald-700">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {schedule.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    aria-label={`Eliminar horario de ${employee.name}`}
                    className="rounded p-1 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => onDelete(schedule.id)}
                    type="button"
                  >
                    <Icon className="text-sm" name="regular fa-trash-can" />
                  </button>
                </td>
              </tr>
            );
          })}
          {schedules.length === 0 && (
            <tr>
              <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan="5">
                No hay horarios que coincidan con la búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyMatrix({ schedules, weeks, shiftTypes }) {
  return (
    <div className="overflow-x-auto p-4">
      <table className="hr-data-table hr-data-table--standard w-full min-w-[75rem] border-collapse text-center text-xs">
        <thead>
          <tr className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
            <th className="p-3 text-left">TURNO</th>
            {weeks.map((week) => (
              <th className="min-w-[6.875rem] p-3" key={week.key}>
                <span className="block">SEMANA {week.number}</span>
                <span className="mt-0.5 block text-[0.5625rem] font-medium normal-case tracking-normal text-slate-500">
                  {week.dateRange}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shiftTypes.map((shiftType) => (
            <tr key={shiftType.id}>
              <th className="whitespace-nowrap p-3 text-left font-semibold text-slate-800">
                {shiftType.name}
              </th>
              {weeks.map((week) => {
                const employees = [
                  ...new Set(
                    schedules
                      .filter(
                        (schedule) =>
                          schedule.weekStartDate === week.key &&
                          schedule.shiftTypeId === shiftType.id,
                      )
                      .map((schedule) => getEmployee(schedule.employeeId).name),
                  ),
                ];
                return (
                  <td className="p-2" key={week.key}>
                    {employees.length > 0 ? (
                      <div className="flex flex-col gap-1 text-[0.625rem] font-medium text-slate-700">
                        {employees.map((name) => (
                          <span key={name}>{name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HorariosEmployer() {
  const [schedules, setSchedules] = useState(horariosData.schedules);
  const [shiftTypes] = useState(getShiftTypes);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [pageSize, setPageSize] = useState(5);
  const [assignableWeeks] = useState(() => getAssignableWeeks());
  const [selectedWeekKey, setSelectedWeekKey] = useState(
    () => getDateKey(getWeekStart(new Date())),
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedWeekIndex = assignableWeeks.findIndex(
    (week) => week.key === selectedWeekKey,
  );
  const selectedWeek = assignableWeeks[selectedWeekIndex];
  const currentWeekNumber = selectedWeek.number;
  const currentWeekLabel = selectedWeek.label;
  const selectedShift = shiftTypes.find(
    (shift) => shift.id === form.shiftTypeId,
  );
  const formHours = selectedShift
    ? getShiftDuration(selectedShift.start, selectedShift.end)
    : 0;

  const matchingSchedules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return sortByEmployeeDirectory(schedules);

    return sortByEmployeeDirectory(schedules.filter((schedule) => {
      const employee = getEmployee(schedule.employeeId);
      return `${employee.name} ${employee.id} ${employee.department} ${schedule.weekLabel}`
        .toLocaleLowerCase("es")
        .includes(query);
    }));
  }, [schedules, search]);
  const filteredSchedules = useMemo(
    () =>
      matchingSchedules.filter(
        (schedule) => schedule.weekStartDate === selectedWeekKey,
      ),
    [matchingSchedules, selectedWeekKey],
  );
  const {
    currentPage,
    endIndex,
    pageItems: visibleSchedules,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(filteredSchedules, pageSize);

  const assignableEmployees = horariosData.employees.filter(
    (employee) => employee.status !== "Baja",
  );
  const activeEmployees = horariosData.employees.filter(
    (employee) => employee.status === "Activo",
  );
  const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));
  const assignedEmployeeCount = new Set(
    schedules
      .filter(
        (schedule) =>
          schedule.weekStartDate === selectedWeekKey &&
          activeEmployeeIds.has(schedule.employeeId),
      )
      .map((schedule) => schedule.employeeId),
  ).size;
  const pendingEmployeeCount = activeEmployees.length - assignedEmployeeCount;
  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  }

  function clearForm() {
    setForm(initialForm);
    setError("");
  }

  async function addSchedule(event) {
    event.preventDefault();
    if (!form.employeeId) {
      setError("Seleccioná un empleado para asignar el horario.");
      return;
    }
    if (!selectedShift) {
      setError("Seleccioná un tipo de turno para asignar el horario.");
      return;
    }

    const employee = getEmployee(form.employeeId);
    const alreadyAssigned = schedules.some(
      (schedule) => schedule.employeeId === employee.id && schedule.weekStartDate === selectedWeekKey,
    );
    setSaving(true);
    setError("");
    try {
      await assignSchedule({
        employeeDbId: employee.dbId,
        weekStartDate: selectedWeekKey,
        shiftType: selectedShift,
      });
      setSchedules([...horariosData.schedules]);
      toast.success(
        alreadyAssigned
          ? `Se actualizó el turno de ${employee.name} para la semana seleccionada.`
          : `Horario asignado a ${employee.name}.`,
      );
      clearForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSchedule(scheduleId) {
    const schedule = schedules.find((item) => item.id === scheduleId);
    const employee = schedule ? getEmployee(schedule.employeeId) : null;
    const confirmed = await confirmDialog({
      title: "Eliminar horario",
      message: `¿Eliminar el horario${employee ? ` de ${employee.name}` : ""} para esa semana?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!confirmed) return;
    setError("");
    try {
      await deleteSchedule(scheduleId);
      setSchedules([...horariosData.schedules]);
      toast.success("Horario eliminado.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function resetSchedules() {
    setSchedules([...horariosData.schedules]);
    setSearch("");
    setSelectedWeekKey(assignableWeeks[0].key);
    clearForm();
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans antialiased text-slate-800">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500">
                <span>Operaciones &amp; RRHH</span>
                <Icon
                  className="text-[0.5625rem] text-slate-400"
                  name="solid fa-chevron-right"
                />
                <span className="font-semibold text-blue-700">
                  Planificación horaria
                </span>
              </div>
              <h1 className="page-title">
                Gestión de Horarios
              </h1>
            </div>
            <div className="inline-flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.625rem] font-medium text-slate-700 shadow-sm">
              <button
                aria-label="Semana anterior"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={selectedWeekIndex <= 0}
                onClick={() =>
                  setSelectedWeekKey(assignableWeeks[selectedWeekIndex - 1].key)
                }
                type="button"
              >
                <Icon className="text-[0.6875rem]" name="solid fa-chevron-left" />
              </button>
              <div className="flex items-center space-x-2 px-1">
                <Icon
                  className="text-xs text-blue-600"
                  name="regular fa-calendar"
                />
                <span className="whitespace-nowrap font-medium text-slate-800">
                  {currentWeekLabel}
                </span>
              </div>
              <button
                aria-label="Semana siguiente"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={selectedWeekIndex >= assignableWeeks.length - 1}
                onClick={() =>
                  setSelectedWeekKey(assignableWeeks[selectedWeekIndex + 1].key)
                }
                type="button"
              >
                <Icon className="text-[0.6875rem]" name="solid fa-chevron-right" />
              </button>
            </div>
          </header>

          <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-semibold leading-snug text-slate-900">
                Asignación de Horarios
              </h2>
            </div>

            <form onSubmit={addSchedule}>
              <div className="grid grid-cols-1 gap-3.5 pb-4 pt-4 md:grid-cols-12">
                <Field
                  className="md:col-span-3"
                  label={
                    <>
                      Empleado{" "}
                      <span aria-hidden="true" className="text-red-600">*</span>
                    </>
                  }
                >
                  {() => (
                    <SelectField
                      aria-label="Empleado"
                      name="employeeId"
                      onChange={updateForm}
                      required
                      value={form.employeeId}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {assignableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} (Leg. #{employee.id})
                        </option>
                      ))}
                    </SelectField>
                  )}
                </Field>
                <Field
                  className="md:col-span-3"
                  label={<>Semana <span aria-hidden="true" className="text-red-600">*</span></>}
                >
                  {() => (
                    <SelectField
                      aria-label="Semana de asignación"
                      name="weekStartDate"
                      onChange={(event) => setSelectedWeekKey(event.target.value)}
                      required
                      value={selectedWeekKey}
                    >
                      {assignableWeeks.map((week) => (
                        <option key={week.key} value={week.key}>
                          {week.label}
                        </option>
                      ))}
                    </SelectField>
                  )}
                </Field>
                <Field
                  className="md:col-span-6"
                  label={<>Tipo de turno <span aria-hidden="true" className="text-red-600">*</span></>}
                >
                  {() => (
                    <SelectField
                      aria-label="Tipo de turno"
                      name="shiftTypeId"
                      onChange={updateForm}
                      required
                      value={form.shiftTypeId}
                    >
                      <option value="">Seleccionar tipo de turno...</option>
                      {shiftTypes.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({shift.start}–{shift.end})
                        </option>
                      ))}
                    </SelectField>
                  )}
                </Field>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2 text-[0.625rem] text-slate-600">
                  <Icon
                    className="text-sm text-blue-500"
                    name="solid fa-circle-info"
                  />
                  <span>
                    Total semanal a computar:{" "}
                    <strong className="font-semibold text-slate-900">
                      {formHours * horariosData.days.length}{" "}
                      horas operativas
                    </strong>
                  </span>
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800"
                    onClick={clearForm}
                    type="button"
                  >
                    Limpiar
                  </button>
                  <button
                    className="inline-flex items-center space-x-1.5 rounded-lg bg-[#093ba6] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition-colors hover:bg-[#083391] disabled:opacity-60"
                    disabled={saving}
                    type="submit"
                  >
                    <Icon className="text-xs" name="solid fa-circle-plus" />
                    <span>Asignar horario</span>
                  </button>
                </div>
              </div>
              {error && (
                <p className="mt-3 text-xs font-medium text-rose-600" role="alert">
                  {error}
                </p>
              )}
              {notice && !error && (
                <p className="mt-3 text-xs font-medium text-emerald-700" role="status">
                  {notice}
                </p>
              )}
            </form>
          </section>

          <section
            aria-label="Resumen semanal"
            className="grid grid-cols-1 gap-5"
          >
            <ScheduleSummaryCard
              detail={`de ${activeEmployees.length} activos`}
              icon="regular fa-id-badge"
              label="Empleados asignados"
              note={`${pendingEmployeeCount} pendientes para esta semana`}
              noteIcon="solid fa-folder-open"
              noteTone="text-amber-600"
              value={assignedEmployeeCount}
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-3.5 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-[0.5625rem] font-medium text-slate-600">
                <button
                  aria-pressed={view === "list"}
                  className={`inline-flex items-center space-x-1.5 rounded-md px-3 py-1.5 ${
                    view === "list"
                      ? "bg-white font-semibold text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setView("list")}
                  type="button"
                >
                  <Icon
                    className={`text-xs ${view === "list" ? "text-blue-600" : "text-slate-400"}`}
                    name="solid fa-bars-staggered"
                  />
                  <span>Vista de Lista detallada</span>
                </button>
                <button
                  aria-pressed={view === "matrix"}
                  className={`inline-flex items-center space-x-1.5 rounded-md px-3 py-1.5 ${
                    view === "matrix"
                      ? "bg-white font-semibold text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setView("matrix")}
                  type="button"
                >
                  <Icon
                    className={`text-xs ${view === "matrix" ? "text-blue-600" : "text-slate-400"}`}
                    name="solid fa-table-cells"
                  />
                  <span>Matriz Semanal</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Icon className="text-xs" name="solid fa-filter" />
                  </span>
                  <input
                    aria-label="Filtrar horarios"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-[0.5625rem] placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 sm:w-64"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filtrar por nombre o área..."
                    type="search"
                    value={search}
                  />
                </div>
                <button
                  aria-label="Restablecer horarios"
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  onClick={resetSchedules}
                  title="Restablecer horarios"
                  type="button"
                >
                  <Icon className="text-xs" name="solid fa-rotate-right" />
                </button>
                <button
                  aria-label="Limpiar filtro"
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  onClick={() => setSearch("")}
                  title="Limpiar filtro"
                  type="button"
                >
                  <Icon className="text-xs" name="solid fa-sliders" />
                </button>
              </div>
            </div>
            {view === "list" ? (
              <ScheduleTable
                onDelete={removeSchedule}
                schedules={visibleSchedules}
              />
            ) : (
              <WeeklyMatrix
                schedules={matchingSchedules}
                shiftTypes={shiftTypes}
                weeks={assignableWeeks}
              />
            )}
            <div className="hr-data-table-footer flex flex-col justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2.5">
                <span>
                  Mostrando{" "}
                  <span className="font-semibold text-slate-800">
                    {(view === "list"
                      ? filteredSchedules.length
                      : matchingSchedules.length) === 0
                      ? 0
                      : view === "list"
                        ? `${startIndex + 1}-${endIndex}`
                        : `1-${matchingSchedules.length}`}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-800">
                    {view === "list"
                      ? filteredSchedules.length
                      : matchingSchedules.length}
                  </span>{" "}
                  {view === "list"
                    ? "asignaciones semanales"
                    : "asignaciones en la matriz"}
                </span>
                {view === "list" && (
                  <label className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-50 px-2 py-1 text-[0.625rem] font-medium text-slate-600">
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
                )}
              </div>
              {view === "list" && (
                <PaginationControls
                  currentPage={currentPage}
                  onPageChange={setPage}
                  totalPages={totalPages}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
