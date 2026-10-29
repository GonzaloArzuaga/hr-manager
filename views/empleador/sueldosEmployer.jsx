import React, { useMemo, useRef, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import PaginationControls from "../../components/PaginationControls";
import MissingPayrollsCard from "../../components/cards/empleador/MissingPayrollsCard";
import NetPayrollCard from "../../components/cards/empleador/NetPayrollCard";
import SettledPayrollsCard from "../../components/cards/empleador/SettledPayrollsCard";
import SignedReceiptsCard from "../../components/cards/empleador/SignedReceiptsCard";
import {
  getEmployeeById,
  sortByEmployeeDirectory,
} from "../../data/employeeDirectory";
import { sueldosData } from "../../data/sueldosData";
import { usePagination } from "../../hooks/usePagination";
import { openReceipt, registerPayroll } from "../../lib/api";
import { fromPeriodLabel } from "../../lib/format";
import { paymentTypeLabels } from "../../lib/store";
import Select from "../../components/Select";

const tabs = ["Sueldos del Período Seleccionado", "Faltantes / Pendientes", "Historial de Liquidaciones"];

const spanishMonths = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function toMonthInputValue(period) {
  const [monthName, year] = period.toLocaleLowerCase("es").split(" ");
  const monthNumber = spanishMonths.indexOf(monthName) + 1;
  return monthNumber > 0
    ? `${year}-${String(monthNumber).padStart(2, "0")}`
    : "";
}

function toPayrollPeriod(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(year, month - 1, 1),
  );
  return `${monthName.charAt(0).toLocaleUpperCase("es-AR")}${monthName.slice(1)} ${year}`;
}

const emptyForm = { employeeId: "", period: sueldosData.period, amount: "", paymentType: "salary" };

function Icon({ children, className = "h-4 w-4" }) {
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
      {children}
    </svg>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function getEmployee(employeeId) {
  return getEmployeeById(employeeId);
}

export default function SueldosEmployer() {
  const [payrolls, setPayrolls] = useState(sueldosData.payrolls);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const receiptInput = useRef(null);
  const [saving, setSaving] = useState(false);

  const newlySettled = payrolls.filter(
    (payroll) =>
      payroll.status === "Realizado" &&
      !sueldosData.payrolls.some(
        (seed) =>
          seed.employeeId === payroll.employeeId &&
          seed.period === payroll.period &&
          seed.status === "Realizado",
      ),
  );
  const settledCount = sueldosData.totals.settled + newlySettled.length;
  const pendingCount = Math.max(0, sueldosData.totals.employees - settledCount);
  const receiptCount = sueldosData.totals.receipts + newlySettled.length;
  const netPayroll =
    sueldosData.totals.netPayroll +
    newlySettled.reduce((total, payroll) => total + payroll.amount, 0);
  const progress = sueldosData.totals.employees
    ? Math.round((settledCount / sueldosData.totals.employees) * 1000) / 10
    : 0;

  const visiblePayrolls = useMemo(() => {
    const source =
      activeTab === "Historial de Liquidaciones"
        ? sueldosData.historicalPayrolls
        : payrolls.filter((payroll) => payroll.period === form.period);
    // Al cambiar de período, los empleados sin sueldo cargado figuran como pendientes
    if (activeTab !== "Historial de Liquidaciones" && form.period !== sueldosData.period) {
      const withSalary = new Set(source.filter((p) => p.paymentType === "salary").map((p) => p.employeeId));
      sueldosData.employees
        .filter((employee) => !withSalary.has(employee.id))
        .forEach((employee) => source.push({
          id: `pendiente-${employee.id}-${form.period}`,
          employeeId: employee.id,
          period: form.period,
          amount: null,
          paymentDate: null,
          status: "Pendiente",
          paymentType: "salary",
          receiptName: null,
          virtual: true,
        }));
    }
    const normalizedSearch = search.trim().toLocaleLowerCase("es");

    return sortByEmployeeDirectory(source.filter((payroll) => {
      const employee = getEmployee(payroll.employeeId);
      if (!employee) return false;
      const matchesTab =
        activeTab !== "Faltantes / Pendientes" || payroll.status === "Pendiente";
      const matchesDepartment = !department || employee.department === department;
      const matchesStatus = !statusFilter || payroll.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${employee.name} ${employee.id} ${employee.department} ${employee.cuil} ${employee.cuil.replace(/\D/g, "")}`
          .toLocaleLowerCase("es")
          .includes(normalizedSearch);
      return matchesTab && matchesDepartment && matchesStatus && matchesSearch;
    }));
  }, [activeTab, department, form.period, payrolls, search, statusFilter]);
  const {
    currentPage,
    endIndex,
    pageItems: paginatedPayrolls,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(visiblePayrolls, pageSize);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    if (name === "employeeId" && value) announceEmployee(value);
  }

  function announceEmployee(employeeId) {
    const employee = sueldosData.employees.find((item) => String(item.id) === String(employeeId));
    if (employee) toast.info(`Empleado seleccionado: ${employee.name} (CUIL ${employee.cuil}).`);
  }

  function clearForm() {
    setForm(emptyForm);
    setReceipt(null);
    setMessage("");
    if (receiptInput.current) receiptInput.current.value = "";
  }

  function startPayroll(employeeId) {
    setForm((current) => ({ ...current, employeeId }));
    announceEmployee(employeeId);
    setActiveTab(tabs[0]);
    setMessage("");
    document.getElementById("payroll-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submitPayroll(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    const employee = sueldosData.employees.find((item) => item.id === form.employeeId);

    if (!employee) {
      setMessage("Seleccioná un empleado para registrar el sueldo.");
      return;
    }
    if (payrolls.some((payroll) => payroll.employeeId === employee.id && payroll.period === form.period && payroll.paymentType === form.paymentType && payroll.status === "Realizado")) {
      setMessage("Ese empleado ya tiene un pago de ese tipo registrado para este período.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Ingresá un monto neto mayor a cero.");
      return;
    }
    if (!receipt || receipt.type !== "application/pdf") {
      setMessage("Adjuntá el recibo en formato PDF para continuar.");
      return;
    }
    if (receipt.size > 5 * 1024 * 1024) {
      setMessage("El recibo no puede pesar más de 5 MB.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await registerPayroll({
        employeeDbId: employee.dbId,
        periodStart: fromPeriodLabel(form.period),
        amount,
        paymentType: form.paymentType,
        file: receipt,
      });
      setPayrolls([...sueldosData.payrolls]);
      const period = form.period;
      clearForm();
      setForm((current) => ({ ...current, period }));
      setActiveTab(tabs[0]);
      toast.success(`${paymentTypeLabels[form.paymentType]} de ${employee.name} registrado correctamente.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function showReceipt(payroll) {
    try {
      await openReceipt(payroll.receiptKey);
    } catch (error) {
      toast.error(error.message);
    }
  }

  const departmentsPending = sueldosData.totals.pendingByDepartment
    .map(({ department: name, count }) => `${name} (${count})`)
    .join(", ");

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <nav className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500" aria-label="Ruta de navegación">
                <span>Operaciones &amp; RRHH</span>
                <span aria-hidden="true">›</span>
                <span className="text-blue-700">Sueldos y Recibos</span>
              </nav>
              <h1 className="page-title">
                Gestión de Sueldos
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-[0.625rem] font-semibold text-slate-700 shadow-sm">
              <Icon className="h-3 w-3 text-blue-700">
                <path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z" />
              </Icon>
              {form.period}
            </div>
          </header>

          <section
            className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm"
            id="payroll-form"
          >
            <div className="mb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Carga de Recibo de Sueldo
              </h2>
            </div>
            <form onSubmit={submitPayroll}>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-5">
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Empleado <span aria-hidden="true" className="text-red-600">*</span>
                  <Select
                    className="mt-1 block w-full rounded-md border-slate-200 bg-[#f0f4ff] px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    name="employeeId"
                    onChange={handleFormChange}
                    required
                    value={form.employeeId}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {sueldosData.employees.map((employee) => (
                      <option
                        disabled={payrolls.some(
                          (payroll) =>
                            payroll.employeeId === employee.id &&
                            payroll.period === form.period &&
                            payroll.paymentType === form.paymentType &&
                            payroll.status === "Realizado",
                        )}
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.name} — CUIL {employee.cuil}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Período (mes) <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Período (mes)"
                    name="periodMonth"
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        period: toPayrollPeriod(event.target.value),
                      }));
                      setMessage("");
                    }}
                    required
                    type="month"
                    value={toMonthInputValue(form.period)}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Tipo de pago <span aria-hidden="true" className="text-red-600">*</span>
                  <Select
                    className="mt-1 block w-full rounded-md border-slate-200 bg-[#f0f4ff] px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    name="paymentType"
                    onChange={handleFormChange}
                    required
                    value={form.paymentType}
                  >
                    {Object.entries(paymentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Monto Neto a Liquidar <span aria-hidden="true" className="text-red-600">*</span>
                  <span className="mt-1 flex items-center rounded-md border border-slate-200 bg-[#f0f4ff] px-2.5 text-[0.5625rem] text-slate-500 focus-within:border-blue-500">
                    $
                    <input
                      className="w-full border-0 bg-transparent px-2 py-1.5 text-[0.5625rem] text-slate-700 focus:ring-0"
                      inputMode="numeric"
                      min="1"
                      name="amount"
                      onChange={handleFormChange}
                      placeholder="980.000"
                      required
                      type="number"
                      value={form.amount}
                    />
                  </span>
                </label>
                <div>
                  <span className="block text-[0.6875rem] font-semibold text-slate-700">
                    Recibo (PDF) <span aria-hidden="true" className="text-red-600">*</span>
                  </span>
                  <div className="mt-1 flex h-[1.9375rem] items-center justify-between gap-2 rounded-md border border-slate-200 bg-[#f0f4ff] px-2.5 text-[0.5625rem]">
                    <span className="min-w-0 truncate text-slate-600">
                      <span className="mr-1 text-red-600">▧</span>
                      {receipt?.name ?? "Seleccionar archivo PDF"}
                    </span>
                    <button
                      className="shrink-0 font-semibold text-blue-700 hover:text-blue-900"
                      onClick={() => receiptInput.current?.click()}
                      type="button"
                    >
                      Examinar
                    </button>
                    <input
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(event) => {
                        setReceipt(event.target.files?.[0] ?? null);
                        setMessage("");
                      }}
                      ref={receiptInput}
                      type="file"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex min-h-8 flex-wrap items-center justify-end gap-2 rounded-lg bg-[#f0f4ff] px-2 py-1.5">
                <div aria-live="polite" className="mr-auto text-[0.5625rem] text-blue-800">
                  {message}
                </div>
                <button
                  className="rounded-md bg-white px-4 py-1.5 text-[0.5625rem] font-medium text-slate-600 hover:bg-slate-50"
                  onClick={clearForm}
                  type="button"
                >
                  Limpiar formulario
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-900 disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Icon className="h-3 w-3"><path d="M9 12l2 2 4-4m5 0a8 8 0 11-16 0 8 8 0 0116 0z" /></Icon>
                  Registrar pago y emitir recibo
                </button>
              </div>
            </form>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de sueldos">
            <SettledPayrollsCard
              employeeCount={sueldosData.totals.employees}
              pendingCount={pendingCount}
              progress={progress}
              settledCount={settledCount}
            />
            <MissingPayrollsCard
              departmentsPending={departmentsPending}
              legalDueDate={sueldosData.totals.legalDueDate}
              pendingCount={pendingCount}
            />
            <NetPayrollCard
              amount={formatCurrency(netPayroll)}
              previousMonthChange={sueldosData.totals.previousMonthChange}
            />
            <SignedReceiptsCard
              receiptCount={receiptCount}
              settledCount={settledCount}
            />
          </section>

          <section aria-label="Liquidaciones de sueldo" className="space-y-2">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
              <div aria-label="Vistas de sueldos" className="flex flex-wrap gap-1 rounded-lg bg-[#edf1fc] p-1">
                {tabs.map((tab) => (
                  <button
                    aria-pressed={activeTab === tab}
                    className={`rounded-md px-2.5 py-1.5 text-[0.5625rem] font-medium transition-colors ${
                      activeTab === tab ? "bg-white font-semibold text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                    {tab === tabs[0] && (
                      <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[0.5rem] text-blue-800">
                        {sueldosData.totals.employees}
                      </span>
                    )}
                    {tab === tabs[1] && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.5rem] text-amber-800">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="sr-only" htmlFor="department-filter">Filtrar por departamento</label>
                <Select
                  className="min-w-[8.125rem] rounded-md border-slate-100 bg-white px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500"
                  id="department-filter"
                  onChange={(event) => setDepartment(event.target.value)}
                  value={department}
                >
                  <option value="">Todos los departamentos</option>
                  {sueldosData.departments.map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
                <label className="relative min-w-[9.0625rem] flex-1 sm:w-48">
                  <span className="sr-only">Filtrar por legajo, DNI o nombre</span>
                  <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400">
                    <circle cx="10.8" cy="10.8" r="6.8" /><path d="M16 16l4 4" />
                  </Icon>
                  <input
                    className="w-full rounded-md border-slate-100 bg-white py-1.5 pl-7 pr-2 text-[0.5625rem] placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filtrar por nombre, legajo o CUIL..."
                    value={search}
                  />
                </label>
                <button
                  aria-expanded={showMoreFilters}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-white px-2.5 py-1.5 text-[0.5625rem] font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMoreFilters((visible) => !visible)}
                  type="button"
                >
                  <Icon className="h-3 w-3"><path d="M4 6h16M7 12h10m-7 6h4" /></Icon>
                  Más Filtros
                </button>
                {showMoreFilters && (
                  <label className="sr-only" htmlFor="status-filter">Filtrar por estado</label>
                )}
                {showMoreFilters && (
                  <Select
                    className="rounded-md border-slate-100 bg-white px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    id="status-filter"
                    onChange={(event) => setStatusFilter(event.target.value)}
                    value={statusFilter}
                  >
                    <option value="">Todos los estados</option>
                    <option value="Realizado">Realizado</option>
                    <option value="Pendiente">Pendiente</option>
                  </Select>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="hr-data-table hr-data-table--standard w-full min-w-[45rem] border-collapse text-left text-[0.5625rem]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#f8faff] text-[0.5rem] font-bold tracking-wide text-slate-500">
                      <th className="px-4 py-2.5" scope="col">EMPLEADO</th>
                      <th className="px-4 py-2.5" scope="col">PERÍODO</th>
                      <th className="px-4 py-2.5" scope="col">MONTO LIQUIDADO</th>
                      <th className="px-4 py-2.5" scope="col">FECHA DE PAGO</th>
                      <th className="px-4 py-2.5" scope="col">ESTADO DEL SUELDO</th>
                      <th className="px-4 py-2.5 text-center" scope="col">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPayrolls.map((payroll) => {
                      const employee = getEmployee(payroll.employeeId);
                      const isPending = payroll.status === "Pendiente";
                      return (
                        <tr className={`transition-colors hover:bg-slate-50/70 ${isPending ? "bg-amber-50/30" : ""}`} key={payroll.id}>
                          <td className="px-4 py-2.5">
                            <EmployeeIdentity
                              avatarStyle={employee.avatarStyle}
                              department={employee.department}
                              detail={`CUIL ${employee.cuil}`}
                              initials={employee.initials}
                              name={employee.name}
                              nameClassName="text-[0.625rem]"
                              metadataClassName="text-[0.5625rem]"
                              size="lg"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                            {payroll.period}
                            {payroll.paymentType && payroll.paymentType !== "salary" && (
                              <span className="block text-[0.5rem] font-semibold text-blue-700">{paymentTypeLabels[payroll.paymentType]}</span>
                            )}
                          </td>
                          <td className={`whitespace-nowrap px-4 py-2.5 font-bold ${isPending ? "text-slate-500" : "text-slate-900"}`}>
                            {isPending ? "$ -" : `$ ${formatCurrency(payroll.amount)}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{payroll.paymentDate ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.5rem] font-semibold ${isPending ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                              <span className="h-1 w-1 rounded-full bg-current" />
                              {payroll.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isPending ? (
                              <button
                                className="inline-flex items-center gap-1 rounded-md bg-blue-800 px-2 py-1 text-[0.5rem] font-semibold text-white hover:bg-blue-900"
                                onClick={() => {
                                  startPayroll(employee.id);
                                  setForm((current) => ({ ...current, period: payroll.period }));
                                }}
                                type="button"
                              >
                                <Icon className="h-3 w-3"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v4h16v-4" /></Icon>
                                Cargar sueldo
                              </button>
                            ) : (
                              <button
                                aria-label={`Ver recibo de ${employee.name}`}
                                className="rounded p-1 text-slate-500 hover:text-blue-700"
                                onClick={() => setSelectedPayroll(payroll)}
                                title="Ver detalles del sueldo"
                                type="button"
                              >
                                <Icon className="h-3.5 w-3.5"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></Icon>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {visiblePayrolls.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-center text-[0.625rem] text-slate-500" colSpan="6">
                          {activeTab === "Historial de Liquidaciones"
                            ? "No hay liquidaciones de períodos anteriores disponibles."
                            : "No se encontraron sueldos con esos filtros."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="hr-data-table-footer flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-[#f0f4ff] px-3 py-2 text-[0.5rem] text-slate-600 sm:flex-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Mostrando{" "}
                    <strong className="text-slate-800">
                      {paginatedPayrolls.length === 0
                        ? "0"
                        : `${startIndex + 1}-${endIndex}`}
                    </strong>{" "}
                    de{" "}
                    <strong className="text-slate-800">
                      {visiblePayrolls.length}
                    </strong>{" "}
                    {activeTab === "Historial de Liquidaciones"
                      ? "liquidaciones históricas"
                      : "sueldos"}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">|</span>
                  <label className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-medium text-slate-600">
                    <span>Filas por página:</span>
                    <Select
                      aria-label="Filas por página"
                      className="min-w-[3.25rem] rounded border border-slate-200 bg-white px-2 py-1 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            </div>
          </section>
        </div>
      </main>

      {selectedPayroll && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelectedPayroll(null)}
        >
          <section
            aria-labelledby="payroll-detail-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900" id="payroll-detail-title">Detalle del sueldo</h2>
                <p className="mt-1 text-xs text-slate-500">{getEmployee(selectedPayroll.employeeId)?.name}</p>
              </div>
              <button aria-label="Cerrar" className="text-slate-500 hover:text-slate-900" onClick={() => setSelectedPayroll(null)} type="button">✕</button>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Período</dt><dd>{selectedPayroll.period}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Monto neto</dt><dd className="font-semibold">$ {formatCurrency(selectedPayroll.amount)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Fecha de pago</dt><dd>{selectedPayroll.paymentDate}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Tipo de pago</dt><dd>{paymentTypeLabels[selectedPayroll.paymentType] ?? "Sueldo"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Recibo</dt><dd className="max-w-[65%] truncate">{selectedPayroll.receiptName ?? "Sin archivo"}</dd></div>
            </dl>
            {selectedPayroll.receiptKey && (
              <button
                className="mt-4 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                onClick={() => showReceipt(selectedPayroll)}
                type="button"
              >
                Ver recibo (PDF)
              </button>
            )}
            <button className="mt-5 w-full rounded-md bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900" onClick={() => setSelectedPayroll(null)} type="button">Cerrar</button>
          </section>
        </div>
      )}
    </div>
  );
}
