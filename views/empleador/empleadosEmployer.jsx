import React, { useEffect, useMemo, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import EmployeeIdentity from "../../components/EmployeeIdentity";
import PaginationControls from "../../components/PaginationControls";
import ActiveStaffingCard from "../../components/cards/empleador/ActiveStaffingCard";
import AverageTenureCard from "../../components/cards/empleador/AverageTenureCard";
import DepartmentDistributionCard from "../../components/cards/empleador/DepartmentDistributionCard";
import { empleadosData } from "../../data/empleadosData";
import { usePagination } from "../../hooks/usePagination";
import { createEmployee, setEmployeeStatus, updateEmployee } from "../../lib/api";
import { store } from "../../lib/store";
import Select from "../../components/Select";
import SuggestInput from "../../components/SuggestInput";

const statusTabs = ["Todos", "Activos", "En Licencia", "Bajas"];
const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "on_leave", label: "En Licencia" },
  { value: "inactive", label: "Baja" },
];
const initialForm = {
  name: "",
  cuil: "",
  email: "",
  password: "",
  role: "",
  department: "",
  branch: "",
  birthDate: "",
  hireDate: "",
};
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

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function EditEmployeeDialog({ employee, roleOptions, departmentOptions, branchOptions, onClose, onSaved }) {
  const hasAccount = (store.raw?.accounts ?? []).some((account) => account.employee_id === employee.dbId);
  const [form, setForm] = useState({
    name: employee.name,
    cuil: employee.cuil,
    email: employee.email ?? "",
    role: employee.role,
    department: employee.department,
    branch: employee.branch,
    birthDate: employee.birthDate ?? "",
    hireDate: employee.hireDate ?? "",
    collectiveAgreement: employee.collectiveAgreement ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (form.cuil.replace(/\D/g, "").length !== 11) {
      setError("El CUIL debe tener 11 dígitos.");
      return;
    }
    if (form.hireDate < form.birthDate) {
      setError("La fecha de ingreso no puede ser anterior a la fecha de nacimiento.");
      return;
    }
    setSaving(true);
    try {
      const emailChanged = form.email.trim().toLowerCase() !== (employee.email ?? "").toLowerCase();
      await updateEmployee(employee.dbId, form, { emailChanged });
      onSaved(`Se guardaron los cambios de ${form.name.trim()}.`);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  const field = "mt-1 block w-full rounded-md border-slate-200 bg-[#f0f4ff] px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500";
  const label = "block text-[0.6875rem] font-semibold text-slate-700";

  return (
    <div
      aria-labelledby="edit-employee-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
    >
      <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:p-5" onSubmit={submit}>
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900" id="edit-employee-title">Editar empleado</h2>
            <p className="text-[0.625rem] text-slate-500">Legajo #{employee.id}</p>
          </div>
          <button aria-label="Cerrar" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            <Icon className="h-4 w-4"><path d="M6 18L18 6M6 6l12 12" /></Icon>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}>Nombre y apellido *
            <input className={field} name="name" onChange={update} required value={form.name} />
          </label>
          <label className={label}>CUIL *
            <input className={field} name="cuil" onChange={update} placeholder="XX-XXXXXXXX-X" required value={form.cuil} />
          </label>
          <label className={`${label} sm:col-span-2`}>Email *
            <input className={field} name="email" onChange={update} required type="email" value={form.email} />
            {hasAccount && (
              <span className="mt-1 block text-[0.5625rem] font-normal text-slate-500">
                Es también su usuario para ingresar. Si lo cambiás, va a tener que usar el nuevo.
              </span>
            )}
          </label>
          <label className={label}>Puesto *
            <SuggestInput className={field} options={roleOptions} name="role" onChange={update} required value={form.role} />
          </label>
          <label className={label}>Área *
            <SuggestInput className={field} options={departmentOptions} name="department" onChange={update} required value={form.department} />
          </label>
          <label className={label}>Sucursal *
            <SuggestInput className={field} options={branchOptions} name="branch" onChange={update} required value={form.branch} />
          </label>
          <label className={label}>Convenio colectivo
            <input className={field} name="collectiveAgreement" onChange={update} placeholder="Opcional" value={form.collectiveAgreement} />
          </label>
          <label className={label}>Fecha de nacimiento *
            <input className={field} name="birthDate" onChange={update} required type="date" value={form.birthDate} />
          </label>
          <label className={label}>Fecha de ingreso *
            <input className={field} name="hireDate" onChange={update} required type="date" value={form.hireDate} />
          </label>
        </div>
        {error && <p className="mt-3 text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EmpleadosEmployer() {
  const [employees, setEmployees] = useState(empleadosData.employees);
  const [form, setForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState("Todos");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [showPassword, setShowPassword] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [editing, setEditing] = useState(null);

  const currentEmployees = useMemo(
    () => employees.filter((employee) => employee.status !== "Baja"),
    [employees],
  );
  const statusCounts = {
    Todos: employees.length,
    Activos: employees.filter((employee) => employee.status === "Activo").length,
    "En Licencia": employees.filter((employee) => employee.status === "En Licencia").length,
    Bajas: employees.filter((employee) => employee.status === "Baja").length,
  };
  const areaCounts = useMemo(
    () => currentEmployees.reduce((counts, employee) => {
      counts[employee.department] = (counts[employee.department] ?? 0) + 1;
      return counts;
    }, {}),
    [currentEmployees],
  );
  const departmentOptions = [
    ...new Set([
      ...empleadosData.summary.areaDistribution.map(({ name }) => name),
      ...employees.map((employee) => employee.department),
    ]),
  ].filter(Boolean).sort();
  const roleOptions = [...new Set([...empleadosData.roles, ...employees.map((e) => e.role)])].filter(Boolean).sort();
  const branchOptions = [...new Set([...empleadosData.branches, ...employees.map((e) => e.branch)])].filter(Boolean).sort();

  const visibleEmployees = useMemo(() => {
    const normalizedSearch = normalize(search.trim());
    const normalizedCuilSearch = normalizedSearch.replace(/\D/g, "");
    return employees.filter((employee) => {
      const matchesTab =
        activeTab === "Todos" ||
        (activeTab === "Activos" && employee.status === "Activo") ||
        (activeTab === "En Licencia" && employee.status === "En Licencia") ||
        (activeTab === "Bajas" && employee.status === "Baja");
      const matchesDepartment = !department || employee.department === department;
      const matchesSearch =
        !normalizedSearch ||
        normalize(employee.name).includes(normalizedSearch) ||
        (normalizedCuilSearch.length > 0 &&
          employee.cuil.replace(/\D/g, "").includes(normalizedCuilSearch));
      return matchesTab && matchesDepartment && matchesSearch;
    });
  }, [activeTab, department, employees, search]);
  const {
    currentPage,
    endIndex,
    pageItems: paginatedEmployees,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(visibleEmployees, pageSize);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  function clearForm() {
    setForm(initialForm);
    setShowPassword(true);
    setMessage("");
  }

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    const randomValues = new Uint32Array(12);
    window.crypto.getRandomValues(randomValues);
    const password = Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join("");
    setForm((current) => ({ ...current, password }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!/^\d{2}-\d{8}-\d$/.test(form.cuil)) {
      setMessage("Ingresá un CUIL con el formato XX-XXXXXXXX-X.");
      return;
    }
    if (form.hireDate < form.birthDate) {
      setMessage("La fecha de ingreso no puede ser anterior a la fecha de nacimiento.");
      return;
    }
    const password = form.password;
    if (password.length < 8 || !/[^A-Za-z0-9]/.test(password)) {
      setMessage("La contraseña provisoria debe tener al menos 8 caracteres y un carácter especial.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await createEmployee(form);
      setEmployees([...empleadosData.employees]);
      setActiveTab("Todos");
      setDepartment("");
      setSearch("");
      const name = form.name.trim();
      setForm(initialForm);
      setMessage(
        `${name} fue dado de alta. Entregale su contraseña provisoria (${password}); deberá cambiarla en su primer ingreso.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(employee, status) {
    if (
      status === "inactive" &&
      !(await confirmDialog({
        title: "Dar de baja",
        message: `¿Dar de baja a ${employee.name}? No va a poder ingresar al sistema, pero se conserva todo su historial.`,
        confirmLabel: "Dar de baja",
        tone: "danger",
      }))
    ) {
      return;
    }
    setStatusUpdating(employee.id);
    setMessage("");
    try {
      await setEmployeeStatus(employee.dbId, status);
      setEmployees([...empleadosData.employees]);
      toast.success(`${employee.name}: ${statusOptions.find((option) => option.value === status)?.label}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setStatusUpdating(null);
    }
  }

  function inputClasses() {
    return "mt-1 block w-full rounded-md border-slate-200 bg-[#f0f4ff] px-2.5 py-1.5 text-[0.5625rem] text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500";
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header>
            <nav
              aria-label="Ruta de navegación"
              className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
            >
              <span>Operaciones &amp; RRHH</span>
              <span aria-hidden="true">›</span>
              <span className="font-semibold text-blue-700">Nómina y Empleados</span>
            </nav>
            <h1 className="page-title">
              Gestión de Empleados
            </h1>
          </header>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold tracking-tight text-slate-900">
              Dar de alta un Nuevo Empleado
            </h2>
            <form className="space-y-2" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Nombre y Apellido <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    autoComplete="name"
                    className={inputClasses()}
                    maxLength="100"
                    name="name"
                    onChange={handleChange}
                    placeholder="Ej. Ignacio Gabriel Rossi"
                    required
                    value={form.name}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Código Único de Identificación Laboral (CUIL) <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    autoComplete="off"
                    className={inputClasses()}
                    inputMode="numeric"
                    maxLength="13"
                    name="cuil"
                    onChange={handleChange}
                    pattern="[0-9]{2}-[0-9]{8}-[0-9]"
                    placeholder="Ej. 20-38491024-7"
                    required
                    title="Ingresá el CUIL con el formato XX-XXXXXXXX-X."
                    value={form.cuil}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Email <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    autoComplete="email"
                    className={inputClasses()}
                    maxLength="120"
                    name="email"
                    onChange={handleChange}
                    placeholder="i.rossi@acmecorp.com"
                    required
                    type="email"
                    value={form.email}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  <span className="flex items-center justify-between">
                    <span>Contraseña Provisoria <span aria-hidden="true" className="text-red-600">*</span></span>
                    <button
                      className="mr-2 font-semibold text-blue-700 hover:text-blue-900"
                      onClick={generatePassword}
                      type="button"
                    >
                      Generar
                    </button>
                  </span>
                  <span className="relative mt-1 block">
                    <input
                      autoComplete="new-password"
                      className={`${inputClasses()} pr-16`}
                      minLength="8"
                      name="password"
                      onChange={handleChange}
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                    />
                    <button
                      aria-label={showPassword ? "Ocultar contraseña provisoria" : "Mostrar contraseña provisoria"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-2 flex items-center text-[0.5625rem] font-semibold text-blue-700 hover:text-blue-900"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </span>
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Puesto <span aria-hidden="true" className="text-red-600">*</span>
                  <SuggestInput
                    className={inputClasses()}
                    options={roleOptions}
                    maxLength="120"
                    name="role"
                    onChange={handleChange}
                    placeholder="Elegí o escribí un puesto..."
                    required
                    value={form.role}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Área <span aria-hidden="true" className="text-red-600">*</span>
                  <SuggestInput
                    className={inputClasses()}
                    options={departmentOptions}
                    maxLength="120"
                    name="department"
                    onChange={handleChange}
                    placeholder="Elegí o escribí un área..."
                    required
                    value={form.department}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Sucursal <span aria-hidden="true" className="text-red-600">*</span>
                  <SuggestInput
                    className={inputClasses()}
                    options={branchOptions}
                    maxLength="120"
                    name="branch"
                    onChange={handleChange}
                    placeholder="Elegí o escribí una sucursal..."
                    required
                    value={form.branch}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Fecha de Nacimiento <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    className={inputClasses()}
                    max={new Date().toISOString().slice(0, 10)}
                    name="birthDate"
                    onChange={handleChange}
                    required
                    type="date"
                    value={form.birthDate}
                  />
                </label>
                <label className="block text-[0.6875rem] font-semibold text-slate-700">
                  Fecha de Ingreso <span aria-hidden="true" className="text-red-600">*</span>
                  <input
                    className={inputClasses()}
                    max={new Date().toISOString().slice(0, 10)}
                    name="hireDate"
                    onChange={handleChange}
                    required
                    type="date"
                    value={form.hireDate}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <p aria-live="polite" className="mr-auto text-[0.5625rem] text-blue-800">{message}</p>
                <button
                  className="rounded-md bg-blue-50 px-4 py-1.5 text-[0.5625rem] font-semibold text-slate-700 hover:bg-blue-100"
                  onClick={clearForm}
                  type="button"
                >
                  Limpiar Formulario
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-900 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  <Icon className="h-3 w-3"><path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M14 7a4 4 0 11-8 0 4 4 0 018 0z" /></Icon>
                  {submitting ? "Dando de alta…" : "Dar de Alta"}
                </button>
              </div>
            </form>
          </section>

          <section
            aria-label="Resumen de empleados"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            <ActiveStaffingCard
              employees={currentEmployees}
            />
            <DepartmentDistributionCard
              areaCounts={areaCounts}
              totalEmployees={currentEmployees.length}
            />
            <AverageTenureCard employees={currentEmployees} />
          </section>

          <section aria-label="Directorio de empleados" className="space-y-1.5">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
              <div aria-label="Filtrar empleados por estado" className="flex flex-wrap gap-1 rounded-md bg-[#edf1fc] p-1">
                {statusTabs.map((tab) => {
                  const count = statusCounts[tab];
                  return (
                    <button
                      aria-pressed={activeTab === tab}
                      className={`rounded px-2.5 py-1.5 text-[0.5625rem] transition-colors ${
                        activeTab === tab
                          ? "bg-white font-semibold text-blue-800 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      type="button"
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="relative min-w-[10.625rem] flex-1 sm:w-48">
                  <span className="sr-only">Buscar por nombre, apellido o CUIL</span>
                  <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400">
                    <circle cx="10.8" cy="10.8" r="6.8" /><path d="M16 16l4 4" />
                  </Icon>
                  <input
                    className="w-full rounded-md border-slate-100 bg-white py-1.5 pl-7 pr-2 text-[0.5625rem] placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, apellido o CUIL..."
                    value={search}
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrar por área</span>
                  <Select
                    className="w-36 rounded-md border-slate-100 bg-white px-2.5 py-1.5 text-[0.5625rem] text-slate-700 focus:border-blue-500 focus:ring-blue-500"
                    onChange={(event) => setDepartment(event.target.value)}
                    value={department}
                  >
                    <option value="">Todas las Áreas</option>
                    {departmentOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </Select>
                </label>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="hr-data-table hr-data-table--standard w-full min-w-[62.5rem] border-collapse text-left text-[0.5625rem]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#f0f4ff] text-[0.5rem] font-bold tracking-wide text-slate-600">
                      <th className="px-3 py-2.5" scope="col">EMPLEADO</th>
                      <th className="px-3 py-2.5" scope="col">CUIL</th>
                      <th className="px-3 py-2.5" scope="col">PUESTO</th>
                      <th className="px-3 py-2.5" scope="col">ÁREA</th>
                      <th className="px-3 py-2.5" scope="col">SUCURSAL</th>
                      <th className="px-3 py-2.5" scope="col">ANTIGÜEDAD</th>
                      <th className="px-3 py-2.5" scope="col">NACIMIENTO / EDAD</th>
                      <th className="px-3 py-2.5 text-right" scope="col">ESTADO</th>
                      <th className="px-3 py-2.5 text-right" scope="col">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEmployees.map((employee) => (
                      <tr className="transition-colors hover:bg-slate-50/70" key={employee.id}>
                        <td className="employee-identity-cell px-[0.3125rem] py-2.5">
                          <EmployeeIdentity
                            avatarStyle={employee.avatarStyle}
                            employeeId={employee.id}
                            initials={employee.initials}
                            name={employee.name}
                            nameClassName="text-[0.625rem]"
                            size="lg"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{employee.cuil}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-700">{employee.role}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{employee.department}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{employee.branch}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="block font-semibold text-slate-800">{employee.tenureLabel}</span>
                          <span className="text-[0.5rem] text-slate-500">Ingreso: {formatDate(employee.hireDate)}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-center">
                          <span className="block font-medium text-slate-800">{formatDate(employee.birthDate)}</span>
                          <span className="text-[0.5rem] text-slate-500">{employee.age} años</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <label className="sr-only" htmlFor={`status-${employee.id}`}>
                            Estado de {employee.name}
                          </label>
                          <Select
                            className={`rounded-full border-0 py-0.5 pl-2 pr-6 text-[0.5rem] font-semibold focus:ring-1 focus:ring-blue-500 disabled:opacity-60 ${
                              employee.status === "Activo"
                                ? "bg-emerald-50 text-emerald-700"
                                : employee.status === "Baja"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                            disabled={statusUpdating === employee.id}
                            id={`status-${employee.id}`}
                            onChange={(event) => changeStatus(employee, event.target.value)}
                            value={employee.employmentStatus}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            aria-label={`Editar a ${employee.name}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                            onClick={() => setEditing(employee)}
                            type="button"
                          >
                            <Icon className="h-3 w-3">
                              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </Icon>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedEmployees.length === 0 && (
                      <tr>
                        <td className="px-3 py-8 text-center text-[0.625rem] text-slate-500" colSpan="9">
                          No se encontraron empleados con esos filtros.
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
                      {paginatedEmployees.length === 0
                        ? "0"
                        : `${startIndex + 1}-${endIndex}`}
                    </strong>{" "}
                    de{" "}
                    <strong className="text-slate-800">
                      {visibleEmployees.length}
                    </strong>{" "}
                    empleados
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
      {editing && (
        <EditEmployeeDialog
          branchOptions={branchOptions}
          departmentOptions={departmentOptions}
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setEmployees([...empleadosData.employees]);
            toast.success(text);
          }}
          roleOptions={roleOptions}
        />
      )}
    </div>
  );
}
