import { generatePassword } from "../../lib/passwords";
import React, { useEffect, useMemo, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
import { usePagination } from "../../hooks/usePagination";
import {
  adminCreateCompany,
  adminUpdateDemoRequest,
  demoStatusLabels,
  listDemoRequests,
  listPlans,
} from "../../lib/api";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  contacted: "bg-blue-50 text-blue-800 ring-blue-200",
  converted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  discarded: "bg-slate-100 text-slate-600 ring-slate-200",
};

const filters = [
  { key: "open", label: "Abiertas" },
  { key: "pending", label: "Nuevas" },
  { key: "contacted", label: "Contactadas" },
  { key: "converted", label: "Empresa creada" },
  { key: "discarded", label: "Descartadas" },
  { key: "all", label: "Todas" },
];

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function generateProvisionalPassword() {
  return generatePassword();
}

function MetricCard({ title, value, note, tone = "text-slate-900" }) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className={`text-3xl font-extrabold tracking-tight ${tone}`}>{value}</div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
    </article>
  );
}

function ActionButton({ children, href, onClick, tone = "default", disabled }) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    primary: "border-[#1e40af] bg-[#1e40af] text-white hover:bg-blue-800",
    danger: "border-red-100 bg-white text-red-600 hover:bg-red-50",
  };
  const className = `whitespace-nowrap rounded-md border px-2 py-1 text-[0.5625rem] font-semibold transition-colors ${tones[tone]}${disabled ? " opacity-50" : ""}`;
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button
      className={`${className} disabled:opacity-50`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

// Solicitudes de demostración que llegan desde la página de Precios
export default function SolicitudesAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [contactRequest, setContactRequest] = useState(null);
  const [contactForm, setContactForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    planCode: "",
    notes: "",
  });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactPassword, setContactPassword] = useState("");
  const [showContactPassword, setShowContactPassword] = useState(true);
  const [createdCompany, setCreatedCompany] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [credentialsCopyError, setCredentialsCopyError] = useState("");

  async function reload() {
    try {
      setRequests(await listDemoRequests());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    listPlans()
      .then(setPlans)
      .catch((loadError) => setPlansError(loadError.message))
      .finally(() => setPlansLoading(false));
  }, []);

  const counts = useMemo(() => {
    const result = { pending: 0, contacted: 0, converted: 0, discarded: 0 };
    requests.forEach((request) => {
      result[request.status] += 1;
    });
    return result;
  }, [requests]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return requests.filter((request) => {
      if (filter === "open" && !["pending", "contacted"].includes(request.status)) return false;
      if (!["open", "all"].includes(filter) && request.status !== filter) return false;
      if (!term) return true;
      return [request.email, request.contact_name, request.company_name, request.message, request.admin_notes]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(term);
    });
  }, [requests, filter, search]);

  const { currentPage, endIndex, pageItems, setPage, startIndex, totalPages } = usePagination(visible, 10);

  async function update(request, changes, success) {
    setBusyId(request.id);
    try {
      await adminUpdateDemoRequest(request.id, changes);
      toast.success(success);
      await reload();
    } catch (updateError) {
      toast.error(updateError.message);
    } finally {
      setBusyId(null);
    }
  }

  function markContacted(request) {
    setContactRequest(request);
    setCreatedCompany(null);
    setContactForm({
      companyName: request.company_name ?? "",
      contactName: request.contact_name ?? "",
      email: request.email ?? "",
      planCode: request.plan_code ?? "",
      notes: request.admin_notes ?? "",
    });
    setContactPassword(generateProvisionalPassword());
    setShowContactPassword(true);
    setContactError("");
  }

  function closeContactModal() {
    if (contactSaving || createdCompany) return;
    setContactRequest(null);
    setContactError("");
  }

  function updateContactForm(event) {
    const { name, value } = event.target;
    setContactForm((current) => ({ ...current, [name]: value }));
    setContactError("");
  }

  async function saveContactResult(event) {
    event.preventDefault();
    if (!contactRequest) return;
    const shouldCreateCompany = Boolean(contactForm.planCode);
    if (shouldCreateCompany && (!contactPassword || contactPassword.length < 8 || !/[^A-Za-z0-9]/.test(contactPassword))) {
      setContactError("La contraseña provisoria debe tener al menos 8 caracteres y un carácter especial.");
      return;
    }

    setContactSaving(true);
    setContactError("");
    let company = createdCompany;
    try {
      if (shouldCreateCompany && !company) {
        const result = await adminCreateCompany({
          legalName: contactForm.companyName.trim(),
          employerName: contactForm.contactName.trim(),
          employerEmail: contactForm.email.trim(),
          password: contactPassword,
          planCode: contactForm.planCode,
        });
        company = {
          companyId: result.companyId,
          legalName: contactForm.companyName.trim(),
          email: contactForm.email.trim().toLowerCase(),
          password: result.temporaryPassword,
        };
        setCreatedCompany(company);
      }

      await adminUpdateDemoRequest(contactRequest.id, {
        status: shouldCreateCompany ? "converted" : "contacted",
        notes: contactForm.notes,
        email: contactForm.email.trim(),
        contactName: contactForm.contactName.trim(),
        companyName: contactForm.companyName.trim(),
        planCode: contactForm.planCode,
        companyId: company?.companyId,
      });
      setContactRequest(null);
      setCreatedCompany(null);
      if (company) {
        setCreatedCredentials({
          legalName: company.legalName,
          email: company.email,
          password: company.password,
        });
        toast.success(`Se creó ${company.legalName} y se actualizó la solicitud.`);
      } else {
        toast.success("Se guardó el resultado y la solicitud quedó como contactada.");
      }
      await reload();
    } catch (saveError) {
      setContactError(
        company
          ? `La empresa ya se creó, pero no se pudo actualizar la solicitud. Guardá nuevamente para reintentar sin crear otra empresa. ${saveError.message}`
          : saveError.message,
      );
    } finally {
      setContactSaving(false);
    }
  }

  function updatePlan(event) {
    const { value } = event.target;
    setContactForm((current) => ({ ...current, planCode: value }));
    setContactError("");
  }

  async function copyCreatedCredentials() {
    const text = `Ingreso a HR Manager\nUsuario: ${createdCredentials.email}\nContraseña provisoria: ${createdCredentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCredentialsCopied(true);
      setCredentialsCopyError("");
    } catch (error) {
      setCredentialsCopied(false);
      setCredentialsCopyError(`No se pudieron copiar las credenciales: ${error.message}`);
    }
  }

  async function discard(request) {
    const note = await promptDialog({
      title: "Descartar solicitud",
      message: `La solicitud de ${request.email} pasa a Descartadas. Se puede reabrir después.`,
      label: "Motivo (opcional)",
      placeholder: "Ej. No respondió / buscaba otro producto",
      confirmLabel: "Descartar",
      required: false,
      tone: "danger",
    });
    if (note === null) return;
    update(request, { status: "discarded", notes: note || null }, "Se descartó la solicitud.");
  }

  async function reopen(request) {
    const confirmed = await confirmDialog({
      title: "Reabrir solicitud",
      message: `La solicitud de ${request.email} vuelve a quedar como nueva.`,
      confirmLabel: "Reabrir",
    });
    if (confirmed) update(request, { status: "pending" }, "La solicitud se reabrió.");
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
              <span className="text-blue-700">Solicitudes</span>
            </nav>
            <h1 className="page-title">Solicitudes de demostración</h1>
          </header>

          <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard note="Todavía sin respuesta" title="Nuevas" tone="text-amber-700" value={counts.pending} />
            <MetricCard note="En conversación" title="Contactadas" tone="text-blue-800" value={counts.contacted} />
            <MetricCard note="Se convirtieron en clientes" title="Empresa creada" tone="text-emerald-700" value={counts.converted} />
            <MetricCard note="Sin seguimiento" title="Descartadas" value={counts.discarded} />
          </section>

          <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Estado">
                {filters.map((item) => {
                  const active = filter === item.key;
                  const amount =
                    item.key === "all"
                      ? requests.length
                      : item.key === "open"
                        ? counts.pending + counts.contacted
                        : counts[item.key];
                  return (
                    <button
                      aria-selected={active}
                      className={`rounded-full px-2.5 py-1 text-[0.5625rem] font-semibold transition-colors ${
                        active ? "bg-[#1e40af] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      role="tab"
                      type="button"
                    >
                      {item.label} ({amount})
                    </button>
                  );
                })}
              </div>
              <label className="relative block w-full lg:w-72">
                <span className="sr-only">Buscar solicitud</span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por email, nombre o empresa..."
                  type="search"
                  value={search}
                />
              </label>
            </div>

            {error && <p className="p-4 text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}

            <div className="overflow-x-auto">
              <table className="hr-data-table hr-data-table--standard w-full min-w-[56rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="pl-4">Recibida</th>
                    <th>Contacto</th>
                    <th>Empresa</th>
                    <th>Plan de interés</th>
                    <th>Estado</th>
                    <th>Notas</th>
                    <th className="pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((request) => {
                    const busy = busyId === request.id;
                    const open = ["pending", "contacted"].includes(request.status);
                    return (
                      <tr key={request.id}>
                        <td className="whitespace-nowrap pl-4 text-slate-500">{dateFormat.format(new Date(request.created_at))}</td>
                        <td>
                          <a className="font-semibold text-blue-800 hover:underline" href={`mailto:${request.email}`}>
                            {request.email}
                          </a>
                          {request.contact_name && <span className="block text-slate-500">{request.contact_name}</span>}
                        </td>
                        <td>
                          {request.company_name || <span className="text-slate-400">—</span>}
                          {request.company_name_created && (
                            <span className="block text-emerald-700">Alta: {request.company_name_created}</span>
                          )}
                        </td>
                        <td>{request.plans?.name ?? <span className="text-slate-400">Sin elegir</span>}</td>
                        <td>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold ring-1 ring-inset ${statusStyles[request.status]}`}
                          >
                            {demoStatusLabels[request.status]}
                          </span>
                        </td>
                        <td className="max-w-[16rem]">
                          {request.message && <span className="block text-slate-700">“{request.message}”</span>}
                          {request.admin_notes && <span className="block text-slate-500">Nota: {request.admin_notes}</span>}
                          {!request.message && !request.admin_notes && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="pr-4">
                          <div className="flex flex-wrap justify-end gap-1">
                            {open && (
                              <ActionButton href={`mailto:${request.email}`} tone="primary">
                                Contactar
                              </ActionButton>
                            )}
                            {request.status === "pending" && (
                              <ActionButton disabled={busy} onClick={() => markContacted(request)}>
                                Contactada
                              </ActionButton>
                            )}
                            {open ? (
                              <ActionButton disabled={busy} onClick={() => discard(request)} tone="danger">
                                Descartar
                              </ActionButton>
                            ) : (
                              request.status === "discarded" && (
                                <ActionButton disabled={busy} onClick={() => reopen(request)}>
                                  Reabrir
                                </ActionButton>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && visible.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-slate-500" colSpan={7}>
                        {requests.length === 0
                          ? "Todavía no llegaron solicitudes. Aparecen acá cuando alguien completa el formulario de la página de Precios."
                          : "No hay solicitudes con este filtro."}
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td className="py-8 text-center text-slate-500" colSpan={7}>
                        Cargando solicitudes...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {visible.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.5625rem] text-slate-500">
                <span>
                  Mostrando {startIndex + 1}-{endIndex} de {visible.length} solicitudes
                </span>
                <PaginationControls currentPage={currentPage} onPageChange={setPage} totalPages={totalPages} />
              </div>
            )}
          </section>
        </div>
      </main>
      {contactRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-5">
          <section
            aria-labelledby="contact-modal-title"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
          >
            <header className="relative border-b border-slate-100 px-5 py-4 sm:px-7">
              <button
                aria-label="Cerrar modal"
                className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                disabled={contactSaving || Boolean(createdCompany)}
                onClick={closeContactModal}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base" id="contact-modal-title">
                Marcar como contactada
              </h2>
            </header>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveContactResult}>
              <div className="space-y-5 overflow-y-auto px-5 py-4 sm:px-7">
                <fieldset className="space-y-2.5">
                  <legend className="flex w-full items-center justify-between text-[0.625rem] font-bold uppercase tracking-wide text-slate-700">
                    <span>Plan seleccionado</span>
                  </legend>
                  {plansLoading ? (
                    <p className="text-[0.625rem] text-slate-500">Cargando planes...</p>
                  ) : plansError ? (
                    <p className="text-[0.625rem] text-red-600" role="alert">{plansError}</p>
                  ) : (
                    <div aria-label="Planes disponibles" className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                      {[{ code: "", name: "Ninguno" }, ...plans].map((plan) => {
                        const selected = contactForm.planCode === plan.code;
                        return (
                          <label className="relative cursor-pointer" key={plan.code || "none"}>
                            <input
                              checked={selected}
                              className="peer sr-only"
                              disabled={Boolean(createdCompany)}
                              name="planCode"
                              onChange={updatePlan}
                              type="radio"
                              value={plan.code}
                            />
                            <span
                              className={`flex min-h-10 items-center justify-between rounded-lg border px-3 py-2 text-[0.625rem] font-semibold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 ${
                                selected
                                  ? "border-blue-700 bg-blue-50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                              }`}
                            >
                              {plan.name}
                              <span
                                aria-hidden="true"
                                className={`ml-2 h-3.5 w-3.5 rounded-full border ${
                                  selected ? "border-blue-700 bg-blue-700 shadow-[inset_0_0_0_3px_white]" : "border-slate-300"
                                }`}
                              />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                {contactForm.planCode && (
                  <fieldset className="space-y-3">
                  <legend className="flex w-full items-center justify-between border-b border-slate-100 pb-1.5 text-[0.625rem] font-bold uppercase tracking-wide text-slate-500">
                    <span>Datos del empleador</span>
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[0.625rem] font-semibold text-slate-700">
                      Razón social <span aria-hidden="true" className="text-red-600">*</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[0.625rem] font-normal text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength="160"
                        name="companyName"
                        onChange={updateContactForm}
                        disabled={Boolean(createdCompany)}
                        required
                        value={contactForm.companyName}
                      />
                    </label>
                    <label className="block text-[0.625rem] font-semibold text-slate-700">
                      Email del empleador <span aria-hidden="true" className="text-red-600">*</span>
                      <input
                        autoComplete="email"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[0.625rem] font-normal text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength="254"
                        name="email"
                        onChange={updateContactForm}
                        disabled={Boolean(createdCompany)}
                        required
                        type="email"
                        value={contactForm.email}
                      />
                    </label>
                    <label className="block text-[0.625rem] font-semibold text-slate-700">
                      Nombre del empleador <span aria-hidden="true" className="text-red-600">*</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[0.625rem] font-normal text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength="120"
                        name="contactName"
                        onChange={updateContactForm}
                        disabled={Boolean(createdCompany)}
                        required
                        value={contactForm.contactName}
                      />
                    </label>
                    <label className="block text-[0.625rem] font-semibold text-slate-700">
                      <span className="flex items-center justify-between">
                        <span>
                          Contraseña provisoria <span aria-hidden="true" className="text-red-600">*</span>
                        </span>
                        {!createdCompany && (
                          <button
                            className="mr-1 font-semibold text-blue-700 hover:text-blue-900"
                            onClick={() => {
                              setContactPassword(generateProvisionalPassword());
                              setContactError("");
                            }}
                            type="button"
                          >
                            Generar
                          </button>
                        )}
                      </span>
                      <span className="relative mt-1 block">
                        <input
                          autoComplete="new-password"
                          className="w-full rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-2 pr-16 font-mono text-[0.625rem] text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70"
                          disabled={Boolean(createdCompany)}
                          minLength="8"
                          onChange={(event) => {
                            setContactPassword(event.target.value);
                            setContactError("");
                          }}
                          required
                          type={showContactPassword ? "text" : "password"}
                          value={contactPassword}
                        />
                        <button
                          aria-label={showContactPassword ? "Ocultar contraseña provisoria" : "Mostrar contraseña provisoria"}
                          aria-pressed={showContactPassword}
                          className="absolute inset-y-0 right-2 flex items-center text-[0.5625rem] font-semibold text-blue-700 hover:text-blue-900"
                          onClick={() => setShowContactPassword((visible) => !visible)}
                          type="button"
                        >
                          {showContactPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </span>
                    </label>
                  </div>
                </fieldset>
                )}

                {createdCompany && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[0.625rem] text-amber-900" role="status">
                    La empresa ya fue creada. Al guardar nuevamente solo se reintentará actualizar esta solicitud.
                  </p>
                )}

                <label className="block text-[0.625rem] font-bold uppercase tracking-wide text-slate-500">
                  Nota de la reunión <span className="font-normal normal-case text-slate-400">(opcional)</span>
                  <textarea
                    className="mt-1.5 block w-full resize-y rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[0.625rem] font-normal text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={Boolean(createdCompany)}
                    maxLength="500"
                    name="notes"
                    onChange={updateContactForm}
                    placeholder="Ej. Demo agendada para el martes 10 h / Requiere validación con el área legal..."
                    rows="3"
                    value={contactForm.notes}
                  />
                  <span className="mt-1 block text-right text-[0.5625rem] font-normal text-slate-400">
                    {contactForm.notes.length}/500 caracteres
                  </span>
                </label>
                {contactError && <p className="text-[0.625rem] font-medium text-red-600" role="alert">{contactError}</p>}
              </div>
              <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end sm:px-7">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[0.625rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={contactSaving || Boolean(createdCompany)}
                  onClick={closeContactModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="rounded-lg bg-[#1e40af] px-4 py-2 text-[0.625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                  disabled={contactSaving || plansLoading || Boolean(plansError) || (Boolean(contactForm.planCode) && plans.length === 0)}
                  type="submit"
                >
                  {contactSaving
                    ? createdCompany
                      ? "Actualizando solicitud..."
                      : contactForm.planCode
                        ? "Creando empresa..."
                        : "Guardando..."
                    : contactForm.planCode
                      ? "Crear empresa y guardar resultado"
                      : "Guardar resultado"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="created-credentials-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-emerald-200 bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <h2 className="text-sm font-bold text-slate-900" id="created-credentials-title">
              Se creó {createdCredentials.legalName}
            </h2>
            <p className="mt-1 text-[0.625rem] text-slate-600">
              Entregá estas credenciales al empleador por un medio seguro. Deberá cambiar la contraseña en su primer ingreso.
            </p>
            <dl className="mt-4 space-y-2 rounded-lg bg-emerald-50 p-3 text-[0.625rem] text-emerald-950">
              <div>
                <dt className="font-semibold">Email</dt>
                <dd>{createdCredentials.email}</dd>
              </div>
              <div>
                <dt className="font-semibold">Contraseña provisoria</dt>
                <dd className="break-all font-mono">{createdCredentials.password}</dd>
              </div>
            </dl>
            {credentialsCopyError && (
              <p className="mt-2 text-[0.625rem] text-red-600" role="alert">{credentialsCopyError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[0.625rem] font-semibold text-slate-700 hover:bg-slate-50"
                onClick={copyCreatedCredentials}
                type="button"
              >
                {credentialsCopied ? "Copiado" : "Copiar credenciales"}
              </button>
              <button
                className="rounded-lg bg-[#1e40af] px-3.5 py-2 text-[0.625rem] font-semibold text-white hover:bg-blue-800"
                onClick={() => {
                  setCreatedCredentials(null);
                  setCredentialsCopied(false);
                  setCredentialsCopyError("");
                }}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
