import React, { useEffect, useMemo, useState } from "react";
import {
  adminCreateCompany,
  adminListCompanies,
  adminResetEmployerPassword,
  adminSetCompanyPlan,
  adminSetCompanyStatus,
  listPlans,
} from "../../lib/api";
import { confirmDialog, toast } from "../../lib/feedback";
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

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClassName = "mb-1 block text-[0.6875rem] font-semibold text-slate-700";
const emptyForm = { legalName: "", employerName: "", employerEmail: "", password: "", planCode: "operativo" };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "—";
}

function MetricCard({ title, value, note }) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
    </article>
  );
}

// Credenciales que hay que entregarle al empleador
function CredentialsNotice({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Ingreso a HR Manager\nUsuario: ${credentials.email}\nContraseña provisoria: ${credentials.password}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-[0.625rem] text-emerald-900" role="status">
      <p className="font-bold">{credentials.title}</p>
      <p className="mt-1">
        Usuario: <strong>{credentials.email}</strong> · Contraseña provisoria:{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">{credentials.password}</code>
      </p>
      <p className="mt-1 text-emerald-800">
        Entregásela al empleador por un medio seguro. En su primer ingreso el sistema le va a pedir que la cambie.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          className="rounded-md bg-white px-2.5 py-1 font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100"
          onClick={copy}
          type="button"
        >
          {copied ? "Copiado" : "Copiar datos"}
        </button>
        <button className="rounded-md px-2.5 py-1 font-semibold text-emerald-800 hover:bg-emerald-100" onClick={onClose} type="button">
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function AdminEmpresas() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState([]);

  async function reload() {
    setLoading(true);
    try {
      setCompanies(await adminListCompanies());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    listPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return companies;
    return companies.filter((company) =>
      [company.legal_name, company.employer_name, company.employer_email]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(term),
    );
  }, [companies, search]);

  const activeCount = companies.filter((company) => company.is_active).length;
  const employeesTotal = companies.reduce((sum, company) => sum + Number(company.active_employees ?? 0), 0);
  const planLabel = (plan) =>
    `${plan.name} · ${plan.max_employees ? `hasta ${plan.max_employees} empleados` : "sin límite de empleados"}`;
  const pendingFirstLogin = companies.filter((company) => company.employer_must_change_password).length;

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await adminCreateCompany(form);
      setCredentials({
        title: `Se creó ${form.legalName.trim()}.`,
        email: form.employerEmail.trim().toLowerCase(),
        password: result.temporaryPassword,
      });
      toast.success(`Se creó ${form.legalName.trim()}.`);
      setForm(emptyForm);
      await reload();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(company) {
    const confirmed = await confirmDialog({
      title: "Nueva contraseña provisoria",
      message: `¿Generar una contraseña provisoria nueva para el empleador de ${company.legal_name}? La actual deja de funcionar.`,
      confirmLabel: "Generar",
    });
    if (!confirmed) return;
    setError("");
    try {
      const result = await adminResetEmployerPassword(company.id);
      setCredentials({ title: `Nueva contraseña para ${company.legal_name}.`, email: result.email, password: result.temporaryPassword });
      await reload();
    } catch (resetError) {
      toast.error(resetError.message);
    }
  }

  async function toggleStatus(company) {
    const action = company.is_active ? "suspender" : "reactivar";
    const detail = company.is_active ? " Nadie de la empresa va a poder ingresar hasta que la reactives." : "";
    const confirmed = await confirmDialog({
      title: company.is_active ? "Suspender empresa" : "Reactivar empresa",
      message: `¿Querés ${action} ${company.legal_name}?${detail}`,
      confirmLabel: company.is_active ? "Suspender" : "Reactivar",
      tone: company.is_active ? "danger" : "primary",
    });
    if (!confirmed) return;
    setError("");
    try {
      await adminSetCompanyStatus(company.id, !company.is_active);
      toast.success(`${company.legal_name} quedó ${company.is_active ? "suspendida" : "activa"}.`);
      await reload();
    } catch (statusError) {
      toast.error(statusError.message);
    }
  }

  async function changePlan(company, planCode) {
    const plan = plans.find((item) => item.code === planCode);
    const confirmed = await confirmDialog({
      title: "Cambiar plan",
      message: `¿Pasar a ${company.legal_name} al plan ${plan?.name}? ${plan?.max_employees ? `Va a poder tener hasta ${plan.max_employees} empleados activos.` : "No tiene límite de empleados."}`,
      confirmLabel: "Cambiar plan",
    });
    if (!confirmed) return;
    try {
      await adminSetCompanyPlan(company.id, planCode);
      toast.success(`${company.legal_name} pasó al plan ${plan?.name}.`);
      await reload();
    } catch (planError) {
      toast.error(planError.message);
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
              <span>Administración del sistema</span>
              <span aria-hidden="true">›</span>
              <span className="text-blue-700">Empresas</span>
            </nav>
            <h1 className="page-title">Empresas</h1>
          </header>

          <section aria-label="Resumen" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricCard
              note={`${companies.length - activeCount} suspendidas`}
              title="Empresas activas"
              value={activeCount}
            />
            <MetricCard note="En todas las empresas activas" title="Empleados activos" value={employeesTotal} />
            <MetricCard
              note="Empleadores que todavía no cambiaron la contraseña provisoria"
              title="Pendientes de primer ingreso"
              value={pendingFirstLogin}
            />
          </section>

          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="mb-3 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Dar de alta una empresa</h2>
              <p className="mt-0.5 text-[0.625rem] text-slate-500">
                Se crea con las reglas por defecto y el régimen de vacaciones de la Ley de Contrato de Trabajo. El empleador
                las puede ajustar desde Configuración.
              </p>
            </div>
            <form className="space-y-3" onSubmit={submit}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className={labelClassName} htmlFor="company-name">
                    Razón social <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <input className={inputClassName} id="company-name" name="legalName" onChange={updateForm} placeholder="Ej. Logística del Sur SRL" required value={form.legalName} />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="employer-name">
                    Nombre del empleador <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <input className={inputClassName} id="employer-name" name="employerName" onChange={updateForm} placeholder="Ej. Valeria Rossi" required value={form.employerName} />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="employer-email">
                    Email del empleador <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <input className={inputClassName} id="employer-email" name="employerEmail" onChange={updateForm} placeholder="nombre@empresa.com" required type="email" value={form.employerEmail} />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="company-plan">
                    Plan <span aria-hidden="true" className="text-red-600">*</span>
                  </label>
                  <Select className={inputClassName} id="company-plan" name="planCode" onChange={updateForm} required value={form.planCode}>
                    {plans.map((plan) => (
                      <option key={plan.code} value={plan.code}>{planLabel(plan)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="employer-password">Contraseña provisoria</label>
                  <input className={inputClassName} id="employer-password" name="password" onChange={updateForm} placeholder="Vacío: se genera sola" type="text" value={form.password} />
                </div>
              </div>
              {error && <p className="text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}
              {credentials && <CredentialsNotice credentials={credentials} onClose={() => setCredentials(null)} />}
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                  onClick={() => setForm(emptyForm)}
                  type="button"
                >
                  Limpiar formulario
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Icon className="h-3 w-3">
                    <path d="M12 4v16m8-8H4" />
                  </Icon>
                  {saving ? "Creando..." : "Crear empresa"}
                </button>
              </div>
            </form>
          </section>

          <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Empresas registradas</h2>
              <label className="relative w-full md:w-80">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Icon className="h-3.5 w-3.5">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </Icon>
                </span>
                <input
                  aria-label="Buscar empresa o empleador"
                  className="w-full rounded-lg border border-slate-200/80 bg-slate-50/70 py-2 pl-9 pr-3 text-[0.5625rem] placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar empresa o empleador..."
                  type="search"
                  value={search}
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="hr-data-table hr-data-table--standard w-full min-w-[50rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="pl-4">Empresa</th>
                    <th>Empleador</th>
                    <th>Plan</th>
                    <th>Estado</th>
                    <th>Empleados activos</th>
                    <th>Alta</th>
                    <th>Último ingreso</th>
                    <th className="pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((company) => (
                    <tr key={company.id}>
                      <td className="pl-4 font-bold text-slate-900">{company.legal_name}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{company.employer_name || "—"}</div>
                        <div className="text-slate-500">{company.employer_email || "Sin empleador"}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <label className="sr-only" htmlFor={`plan-${company.id}`}>Plan de {company.legal_name}</label>
                        <Select
                          className="rounded-md border border-slate-200 bg-white py-1 pl-2 pr-7 text-[0.5625rem] font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          id={`plan-${company.id}`}
                          onChange={(event) => changePlan(company, event.target.value)}
                          value={company.plan_code}
                        >
                          {plans.map((plan) => (
                            <option key={plan.code} value={plan.code}>{plan.name}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            company.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {company.is_active ? "Activa" : "Suspendida"}
                        </span>
                        {company.employer_must_change_password && (
                          <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            Sin primer ingreso
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {company.active_employees}
                        <span className="text-slate-400">
                          {company.plan_max_employees ? ` / ${company.plan_max_employees}` : " / sin límite"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(company.created_at)}</td>
                      <td className="whitespace-nowrap">{formatDate(company.employer_last_login)}</td>
                      <td className="whitespace-nowrap pr-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            disabled={!company.employer_email}
                            onClick={() => resetPassword(company)}
                            type="button"
                          >
                            Nueva contraseña
                          </button>
                          <button
                            className={`rounded-md px-2 py-1 font-semibold ${
                              company.is_active
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            onClick={() => toggleStatus(company)}
                            type="button"
                          >
                            {company.is_active ? "Suspender" : "Reactivar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan="8">
                        {companies.length ? "Ninguna empresa coincide con la búsqueda." : "Todavía no hay empresas registradas."}
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan="8">Cargando empresas…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
