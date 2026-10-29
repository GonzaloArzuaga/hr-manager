import React, { useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import AttendanceImport from "../../components/AttendanceImport";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import PaginationControls from "../../components/PaginationControls";
import { usePagination } from "../../hooks/usePagination";
import { deleteAttendance, registerAttendance } from "../../lib/api";
import { parseDateKey, toDisplayDate, todayKey } from "../../lib/format";
import {
  LATE_TOLERANCE_MINUTES,
  addDays,
  buildWorkforceIndex,
  formatHours,
  localDateKey,
  localTime,
  minutesOf,
  shiftDurationMinutes,
  weekdayLong,
} from "../../lib/workforce";
import Select from "../../components/Select";

function Icon({ children, className = "h-4 w-4" }) {
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

const filterOptions = [
  { id: "all", label: "Todos" },
  { id: "present", label: "Presentes" },
  { id: "active", label: "En turno activo" },
  { id: "onTime", label: "A tiempo" },
  { id: "late", label: "Con tardanza" },
  { id: "absent", label: "Ausentes / Justificados" },
];

const justifiedLabels = {
  franco: "Franco",
  vacation: "Vacaciones",
  leave: "Licencia",
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClassName = "mb-1 block text-[0.6875rem] font-semibold text-slate-700";

const emptyForm = { employeeDbId: "", inDate: "", inTime: "", outDate: "", outTime: "", recordId: null };

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatDelay(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

function workedMinutes(record) {
  if (!record?.clock_in_at || !record?.clock_out_at) return null;
  return Math.round((new Date(record.clock_out_at) - new Date(record.clock_in_at)) / 60000);
}

// Arma la fila de un empleado para el día elegido
function buildRow(employee, day, dateKey) {
  const { type, schedule, record } = day;
  const today = todayKey();
  const start = schedule?.starts_at_snapshot?.slice(0, 5) ?? "";
  const end = schedule?.ends_at_snapshot?.slice(0, 5) ?? "";
  const inTime = localTime(record?.clock_in_at);
  const outTime = localTime(record?.clock_out_at);
  const lateMinutes = record && start ? minutesOf(inTime) - minutesOf(start) : 0;

  let state;
  if (record) {
    state = record.status === "late" ? "late" : "present";
  } else if (justifiedLabels[type]) {
    state = type;
  } else if (type === "unscheduled") {
    state = "unscheduled";
  } else if (dateKey < today) {
    state = "absent";
  } else if (dateKey === today) {
    const now = minutesOf(nowTime());
    state = now > minutesOf(start) + LATE_TOLERANCE_MINUTES ? "missing" : "pending";
  } else {
    state = "pending";
  }

  const worked = workedMinutes(record);
  const expected = schedule ? shiftDurationMinutes(start, end) : 0;

  return {
    employee,
    type,
    schedule,
    record,
    state,
    start,
    end,
    inTime,
    outTime,
    lateMinutes,
    worked,
    expected,
    isActive: Boolean(record && !record.clock_out_at),
  };
}

function matchesFilter(row, filter) {
  switch (filter) {
    case "present":
      return Boolean(row.record);
    case "active":
      return row.isActive;
    case "onTime":
      return row.state === "present";
    case "late":
      return row.state === "late";
    case "absent":
      return ["absent", "missing", "franco", "vacation", "leave"].includes(row.state);
    default:
      return true;
  }
}

function EntryCell({ row }) {
  if (row.record) {
    const late = row.state === "late";
    return (
      <div className="flex items-center gap-2">
        <span className={`font-bold ${late ? "text-red-600" : "text-slate-900"}`}>{row.inTime} hs</span>
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            late ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
          }`}
        >
          {late ? `+${formatDelay(row.lateMinutes)} de demora` : "Puntual"}
        </span>
      </div>
    );
  }
  const labels = {
    franco: ["Franco", "bg-violet-50 text-violet-700"],
    vacation: ["Vacaciones", "bg-amber-50 text-amber-800"],
    leave: ["Licencia", "bg-amber-50 text-amber-800"],
    absent: ["Ausente", "bg-red-50 text-red-700"],
    missing: ["Sin fichar", "bg-red-50 text-red-700"],
    pending: ["Aún no ingresa", "bg-slate-100 text-slate-600"],
  };
  if (row.state === "unscheduled") return <span className="text-slate-400">—</span>;
  const [label, style] = labels[row.state] ?? ["—", "bg-slate-100 text-slate-600"];
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${style}`}>{label}</span>;
}

function HoursCell({ row }) {
  if (row.worked !== null) {
    const short = row.expected - row.worked;
    const fulfilled = !row.expected || short <= LATE_TOLERANCE_MINUTES;
    return (
      <div>
        <div className={`font-bold ${fulfilled ? "text-blue-700" : "text-slate-900"}`}>{formatHours(row.worked)}</div>
        <div className={`font-semibold ${fulfilled ? "text-blue-700" : "text-red-600"}`}>
          {fulfilled ? "Cumplido" : `Faltan ${formatHours(short)}`}
        </div>
      </div>
    );
  }
  if (row.isActive) return <span className="font-semibold text-emerald-700">En curso</span>;
  return <span className="text-slate-400">—</span>;
}

function HistoryDialog({ employee, index, onClose }) {
  const records = (index.attendanceList ?? [])
    .filter((record) => record.employee_id === employee.dbId)
    .slice(0, 30);

  return (
    <div
      aria-labelledby="history-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900" id="history-title">
              Historial de fichajes
            </h2>
            <p className="text-[0.625rem] text-slate-500">
              {employee.name} · Leg. #{employee.id} · últimos {records.length} registros
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <Icon className="h-4 w-4">
              <path d="M6 18L18 6M6 6l12 12" />
            </Icon>
          </button>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          <table className="hr-data-table hr-data-table--standard w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4">Fecha</th>
                <th>Turno</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th className="pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const schedule = index.scheduleFor(employee.dbId, record.work_date);
                const worked = workedMinutes(record);
                return (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-4 font-semibold text-slate-800">
                      {toDisplayDate(record.work_date)}
                    </td>
                    <td className="whitespace-nowrap">
                      {schedule
                        ? `${schedule.starts_at_snapshot.slice(0, 5)} - ${schedule.ends_at_snapshot.slice(0, 5)}`
                        : "Sin horario"}
                    </td>
                    <td className="whitespace-nowrap">{localTime(record.clock_in_at) || "—"}</td>
                    <td className="whitespace-nowrap">
                      {localTime(record.clock_out_at) || "—"}
                      {record.clock_out_at && localDateKey(record.clock_out_at) !== record.work_date ? " (+1)" : ""}
                    </td>
                    <td className="whitespace-nowrap">{worked !== null ? formatHours(worked) : "—"}</td>
                    <td className="whitespace-nowrap pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          record.status === "late" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {record.status === "late" ? "Con demora" : "Puntual"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan="6">
                    Este empleado todavía no tiene fichajes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function FichajeEmployer() {
  const [version, setVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState({ ...emptyForm, inDate: todayKey(), outDate: todayKey() });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const index = useMemo(() => {
    const workforce = buildWorkforceIndex();
    workforce.attendanceList = [...workforce.attendance.values()].sort((a, b) =>
      b.work_date.localeCompare(a.work_date),
    );
    return workforce;
    // version fuerza el recálculo después de guardar o eliminar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const rows = useMemo(
    () => index.employees.map((employee) => buildRow(employee, index.dayFor(employee, selectedDate), selectedDate)),
    [index, selectedDate],
  );

  const counts = useMemo(
    () => Object.fromEntries(filterOptions.map((option) => [option.id, rows.filter((row) => matchesFilter(row, option.id)).length])),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!term) return true;
      return [row.employee.name, row.employee.id, row.employee.role, row.employee.department]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(term);
    });
  }, [rows, filter, search]);

  const { currentPage, endIndex, pageItems, setPage, startIndex, totalPages } = usePagination(filteredRows, pageSize);

  // Indicadores del día
  const expectedRows = rows.filter((row) => row.type === "shift");
  const plannedRows = rows.filter((row) => row.type !== "unscheduled");
  const presentRows = rows.filter((row) => row.record);
  const onTimeCount = rows.filter((row) => row.state === "present").length;
  const lateCount = rows.filter((row) => row.state === "late").length;
  const francoCount = rows.filter((row) => row.state === "franco").length;
  const leaveCount = rows.filter((row) => row.state === "vacation" || row.state === "leave").length;
  const absentCount = rows.filter((row) => row.state === "absent" || row.state === "missing").length;
  const shiftNames = new Set(expectedRows.map((row) => row.schedule?.shift_name_snapshot));
  const plannedPercent = rows.length ? Math.round((plannedRows.length / rows.length) * 100) : 0;
  const percent = (value, total) => (total ? Math.round((value / total) * 1000) / 10 : 0);

  const formEmployee = index.employees.find((employee) => String(employee.dbId) === String(form.employeeDbId));
  const formSchedule = formEmployee && form.inDate ? index.scheduleFor(formEmployee.dbId, form.inDate) : null;
  const isToday = selectedDate === todayKey();
  const dateLabel = `${weekdayLong[parseDateKey(selectedDate).getDay()]} ${toDisplayDate(selectedDate)}`;

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // Si la salida queda antes que la entrada el mismo día, es del día siguiente (turno noche)
      if (
        (field === "outTime" || field === "inTime" || field === "inDate") &&
        next.outTime &&
        next.inTime &&
        next.inDate
      ) {
        next.outDate = next.outTime <= next.inTime ? addDays(next.inDate, 1) : next.inDate;
      }
      if (field === "inDate" && !next.outTime) next.outDate = value;
      return next;
    });
    setError("");
    setNotice("");
  }

  function resetForm(dateKey = selectedDate) {
    setForm({ ...emptyForm, inDate: dateKey, outDate: dateKey });
  }

  function loadRow(row) {
    const record = row.record;
    setForm({
      employeeDbId: String(row.employee.dbId),
      inDate: record ? localDateKey(record.clock_in_at) : selectedDate,
      inTime: record ? row.inTime : row.start,
      outDate: record?.clock_out_at ? localDateKey(record.clock_out_at) : selectedDate,
      outTime: record?.clock_out_at ? row.outTime : "",
      recordId: record?.id ?? null,
    });
    toast.info(
      record
        ? `Editando el fichaje de ${row.employee.name} (Leg. #${row.employee.id}).`
        : `Empleado seleccionado: ${row.employee.name} (Leg. #${row.employee.id}). Completá la entrada y la salida.`,
    );
    setError("");
    setNotice("");
    document.getElementById("fichaje-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.employeeDbId || !form.inDate || !form.inTime) {
      setError("Elegí un empleado y completá la fecha y la hora de entrada.");
      return;
    }
    if (form.outTime && !form.outDate) {
      setError("Completá la fecha de salida.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await registerAttendance({
        employeeDbId: Number(form.employeeDbId),
        clockIn: `${form.inDate}T${form.inTime}`,
        clockOut: form.outTime ? `${form.outDate}T${form.outTime}` : null,
      });
      toast.success(
        form.recordId
          ? `Se corrigió el fichaje de ${formEmployee?.name ?? "el empleado"}.`
          : `Fichaje de ${formEmployee?.name ?? "el empleado"} guardado.`,
      );
      setSelectedDate(form.inDate);
      resetForm(form.inDate);
      setVersion((value) => value + 1);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(row) {
    const confirmed = await confirmDialog({
      title: "Eliminar fichaje",
      message: `¿Eliminar el fichaje de ${row.employee.name} del ${toDisplayDate(row.record.work_date)}? No se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!confirmed) return;
    setError("");
    try {
      await deleteAttendance(row.record.id);
      toast.success(`Se eliminó el fichaje de ${row.employee.name}.`);
      if (form.recordId === row.record.id) resetForm();
      setVersion((value) => value + 1);
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header>
            <nav
              aria-label="Ruta de navegación"
              className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
            >
              <span>Operaciones &amp; RRHH</span>
              <span aria-hidden="true">›</span>
              <span className="text-blue-700">Asistencia y fichajes</span>
            </nav>
            <h1 className="page-title">Registro de Asistencia y Fichajes</h1>
          </header>

          <section aria-label="Resumen del día" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Dotación esperada</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{expectedRows.length}</span>
                <span className="text-[0.625rem] font-medium text-slate-500">
                  {expectedRows.length === 1 ? "colaborador" : "colaboradores"}
                </span>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[0.5625rem] font-semibold">
                  <span className="text-slate-700">
                    Distribuidos en {shiftNames.size} {shiftNames.size === 1 ? "turno" : "turnos"}
                  </span>
                  <span className="text-blue-700">{plannedPercent}% planificado</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-700" style={{ width: `${plannedPercent}%` }} />
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Fichados</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{presentRows.length}</span>
                <span className="text-[0.625rem] font-medium text-slate-500">de {expectedRows.length} esperados</span>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 grid grid-cols-2 gap-2 text-[0.5625rem] font-semibold">
                  <span className="flex justify-between rounded-md bg-blue-50 px-2 py-1 text-slate-700">
                    A tiempo ({onTimeCount}) <span className="text-blue-700">{percent(onTimeCount, presentRows.length)}%</span>
                  </span>
                  <span className="flex justify-between rounded-md bg-red-50 px-2 py-1 text-red-700">
                    Tarde ({lateCount}) <span>{percent(lateCount, presentRows.length)}%</span>
                  </span>
                </div>
                <div className="flex h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-blue-700" style={{ width: `${percent(onTimeCount, presentRows.length)}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${percent(lateCount, presentRows.length)}%` }} />
                </div>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">Ausencias / Francos</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{francoCount + leaveCount}</span>
                <span className="text-[0.625rem] font-medium text-slate-500">justificadas</span>
                {absentCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.5625rem] font-semibold text-red-700">
                    {absentCount} sin fichar
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[0.5625rem] font-semibold text-slate-700">
                  <span>{francoCount} {francoCount === 1 ? "franco" : "francos"}</span>
                  <span>{leaveCount} vacaciones / licencias</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: `${percent(francoCount + leaveCount, rows.length)}%` }}
                  />
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm" id="fichaje-form">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                {form.recordId ? "Corregir fichaje" : "Registrar entrada y salida"}
              </h2>
              <div className="flex items-center gap-3">
                <span className="hidden text-[0.5625rem] text-slate-500 xl:inline">
                  Llegada tarde: más de {LATE_TOLERANCE_MINUTES} minutos después del inicio del turno
                </span>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.5625rem] font-semibold text-emerald-800 hover:bg-emerald-100"
                  onClick={() => setShowImport(true)}
                  type="button"
                >
                  <Icon className="h-3 w-3">
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                  </Icon>
                  Importar desde Excel
                </button>
              </div>
            </div>
            <form className="space-y-3" onSubmit={submit}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200/80 p-3">
                  <label className={labelClassName} htmlFor="fichaje-employee">
                    Empleado <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <Select
                    className={inputClassName}
                    disabled={Boolean(form.recordId)}
                    id="fichaje-employee"
                    onChange={(event) => {
                      updateForm("employeeDbId", event.target.value);
                      const chosen = index.employees.find((employee) => String(employee.dbId) === event.target.value);
                      if (chosen) toast.info(`Empleado seleccionado: ${chosen.name} (Leg. #${chosen.id}).`);
                    }}
                    required
                    value={form.employeeDbId}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {index.employees.map((employee) => (
                      <option key={employee.dbId} value={employee.dbId}>
                        {employee.name} (Leg. #{employee.id})
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-[0.5625rem] text-slate-500">
                    {formEmployee
                      ? formSchedule
                        ? `Turno de esa semana: ${formSchedule.shift_name_snapshot}, ${formSchedule.starts_at_snapshot.slice(0, 5)} a ${formSchedule.ends_at_snapshot.slice(0, 5)}`
                        : "No tiene horario asignado esa semana."
                      : "Elegí a quién le cargás el fichaje."}
                  </p>
                </div>

                <fieldset className="rounded-lg border border-slate-200/80 p-3">
                  <legend className="sr-only">Entrada</legend>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.6875rem] font-semibold text-blue-800">Entrada</span>
                    <button
                      className="text-[0.5625rem] font-semibold text-blue-700 hover:underline"
                      onClick={() => {
                        updateForm("inDate", todayKey());
                        updateForm("inTime", nowTime());
                      }}
                      type="button"
                    >
                      Ahora
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[0.5625rem] font-medium text-slate-600">
                      Fecha
                      <input
                        className={`${inputClassName} mt-1`}
                        max={todayKey()}
                        onChange={(event) => updateForm("inDate", event.target.value)}
                        required
                        type="date"
                        value={form.inDate}
                      />
                    </label>
                    <label className="text-[0.5625rem] font-medium text-slate-600">
                      Hora
                      <input
                        className={`${inputClassName} mt-1`}
                        onChange={(event) => updateForm("inTime", event.target.value)}
                        required
                        type="time"
                        value={form.inTime}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="rounded-lg border border-slate-200/80 p-3">
                  <legend className="sr-only">Salida</legend>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.6875rem] font-semibold text-blue-800">Salida</span>
                    <span className="text-[0.5625rem] text-slate-500">Opcional si todavía está trabajando</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[0.5625rem] font-medium text-slate-600">
                      Fecha
                      <input
                        className={`${inputClassName} mt-1`}
                        onChange={(event) => updateForm("outDate", event.target.value)}
                        type="date"
                        value={form.outDate}
                      />
                    </label>
                    <label className="text-[0.5625rem] font-medium text-slate-600">
                      Hora
                      <input
                        className={`${inputClassName} mt-1`}
                        onChange={(event) => updateForm("outTime", event.target.value)}
                        type="time"
                        value={form.outTime}
                      />
                    </label>
                  </div>
                </fieldset>
              </div>

              {error && (
                <p className="text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>
              )}
              {notice && !error && (
                <p className="text-[0.625rem] font-medium text-emerald-700" role="status">{notice}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  onClick={() => {
                    resetForm();
                    setError("");
                    setNotice("");
                  }}
                  type="button"
                >
                  {form.recordId ? "Cancelar corrección" : "Limpiar formulario"}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Icon className="h-3 w-3">
                    <path d="M5 13l4 4L19 7" />
                  </Icon>
                  {saving ? "Guardando..." : "Guardar fichaje"}
                </button>
              </div>
            </form>
          </section>

          <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Asistencia del día</h2>
                <p className="text-[0.625rem] text-slate-500">
                  {dateLabel}
                  {isToday ? " · hoy" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  aria-label="Día anterior"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                  onClick={() => setSelectedDate((value) => addDays(value, -1))}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5">
                    <path d="M15 19l-7-7 7-7" />
                  </Icon>
                </button>
                <label className="sr-only" htmlFor="fichajes-date">Fecha</label>
                <input
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  id="fichajes-date"
                  onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
                  type="date"
                  value={selectedDate}
                />
                <button
                  aria-label="Día siguiente"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                  onClick={() => setSelectedDate((value) => addDays(value, 1))}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5">
                    <path d="M9 5l7 7-7 7" />
                  </Icon>
                </button>
                {!isToday && (
                  <button
                    className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[0.5625rem] font-semibold text-blue-700 hover:bg-blue-100"
                    onClick={() => setSelectedDate(todayKey())}
                    type="button"
                  >
                    Hoy
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative w-full lg:w-80">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Icon className="h-3.5 w-3.5">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </Icon>
                </span>
                <input
                  aria-label="Buscar por nombre, puesto o legajo"
                  className="w-full rounded-lg border border-slate-200/80 bg-slate-50/70 py-2 pl-9 pr-3 text-[0.5625rem] placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, puesto o legajo..."
                  type="search"
                  value={search}
                />
              </label>
              <div
                aria-label="Filtrar por estado"
                className="flex max-w-full flex-wrap gap-1.5 text-[0.5625rem] font-semibold"
              >
                {filterOptions.map((option) => (
                  <button
                    aria-pressed={filter === option.id}
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 transition-colors ${
                      filter === option.id
                        ? "bg-[#1e40af] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    key={option.id}
                    onClick={() => setFilter(option.id)}
                    type="button"
                  >
                    {option.label} ({counts[option.id]})
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="hr-data-table hr-data-table--standard w-full min-w-[50rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="pl-4">Colaborador / Legajo</th>
                    <th>Turno asignado</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas efectivas</th>
                    <th className="pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((row) => (
                    <tr className="hover:bg-slate-50/60" key={row.employee.dbId}>
                      <td className="employee-identity-cell pl-4">
                        <EmployeeIdentity
                          avatarStyle={row.employee.avatarStyle}
                          department={row.employee.role}
                          employeeId={row.employee.id}
                          initials={row.employee.initials}
                          name={row.employee.name}
                        />
                      </td>
                      <td className="whitespace-nowrap">
                        {row.schedule ? (
                          <div>
                            <div className="font-bold text-slate-900">{row.start} - {row.end}</div>
                            <div className="text-slate-500">{row.schedule.shift_name_snapshot}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin horario</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <EntryCell row={row} />
                      </td>
                      <td className="whitespace-nowrap font-medium text-slate-900">
                        {row.outTime ? `${row.outTime} hs` : <span className="text-slate-400">—</span>}
                        {row.record?.clock_out_at && localDateKey(row.record.clock_out_at) !== row.record.work_date ? (
                          <span className="ml-1 text-slate-500">(+1)</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap">
                        <HoursCell row={row} />
                      </td>
                      <td className="whitespace-nowrap pr-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-500">
                          <button
                            aria-label={row.record ? `Corregir fichaje de ${row.employee.name}` : `Cargar fichaje de ${row.employee.name}`}
                            className="rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            onClick={() => loadRow(row)}
                            title={row.record ? "Corregir" : "Cargar fichaje"}
                            type="button"
                          >
                            <Icon className="h-3.5 w-3.5">
                              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </Icon>
                          </button>
                          <button
                            aria-label={`Historial de ${row.employee.name}`}
                            className="rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            onClick={() => setHistoryEmployee(row.employee)}
                            title="Historial"
                            type="button"
                          >
                            <Icon className="h-3.5 w-3.5">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 3" />
                            </Icon>
                          </button>
                          <button
                            aria-label={`Eliminar fichaje de ${row.employee.name}`}
                            className="rounded-md p-1.5 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            disabled={!row.record}
                            onClick={() => removeRecord(row)}
                            title="Eliminar"
                            type="button"
                          >
                            <Icon className="h-3.5 w-3.5">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </Icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan="6">
                        No hay colaboradores que coincidan con estos filtros.
                        <button
                          className="ml-1 font-semibold text-blue-700 hover:underline"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                          }}
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
                    {pageItems.length === 0 ? "0" : `${startIndex + 1}-${endIndex}`}
                  </span>{" "}
                  de <span className="font-medium text-slate-700">{filteredRows.length}</span> colaboradores
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
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </Select>
                </label>
              </div>
              <PaginationControls currentPage={currentPage} onPageChange={setPage} totalPages={totalPages} />
            </footer>
          </section>
        </div>
      </main>

      {showImport && (
        <AttendanceImport onClose={() => setShowImport(false)} onImported={() => setVersion((value) => value + 1)} />
      )}
      {historyEmployee && (
        <HistoryDialog employee={historyEmployee} index={index} onClose={() => setHistoryEmployee(null)} />
      )}
    </div>
  );
}
