import React, { useEffect, useMemo, useState } from "react";
import PaginationControls from "../../components/PaginationControls";
import { usePagination } from "../../hooks/usePagination";
import { adminUpdateDemoRequest, demoStatusLabels, listDemoRequests } from "../../lib/api";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import { navigate } from "../../lib/router";

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

function MetricCard({ title, value, note, tone = "text-slate-900" }) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className={`text-3xl font-extrabold tracking-tight ${tone}`}>{value}</div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
    </article>
  );
}

function ActionButton({ children, onClick, tone = "default", disabled }) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    primary: "border-[#1e40af] bg-[#1e40af] text-white hover:bg-blue-800",
    danger: "border-red-100 bg-white text-red-600 hover:bg-red-50",
  };
  return (
    <button
      className={`whitespace-nowrap rounded-md border px-2 py-1 text-[0.5625rem] font-semibold transition-colors disabled:opacity-50 ${tones[tone]}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

// Solicitudes de demostración que llegan desde la página de Precios
export default function AdminSolicitudes() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

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

  async function markContacted(request) {
    const note = await promptDialog({
      title: "Marcar como contactada",
      message: `Podés anotar cómo quedó la conversación con ${request.email}.`,
      label: "Nota (opcional)",
      placeholder: "Ej. Demo agendada para el martes 10 h",
      confirmLabel: "Guardar",
      required: false,
    });
    if (note === null) return;
    update(request, { status: "contacted", notes: note || null }, "La solicitud quedó como contactada.");
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

  async function editNote(request) {
    const note = await promptDialog({
      title: "Nota interna",
      message: "Solo la ve el administrador del sistema.",
      label: "Nota",
      placeholder: request.admin_notes || "Escribí una nota",
      confirmLabel: "Guardar",
      required: true,
    });
    if (note) update(request, { status: request.status, notes: note }, "Se guardó la nota.");
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
                              <ActionButton
                                disabled={busy}
                                onClick={() => navigate(`/admin/empresas?solicitud=${request.id}`)}
                                tone="primary"
                              >
                                Crear empresa
                              </ActionButton>
                            )}
                            {request.status === "pending" && (
                              <ActionButton disabled={busy} onClick={() => markContacted(request)}>
                                Contactada
                              </ActionButton>
                            )}
                            <ActionButton disabled={busy} onClick={() => editNote(request)}>
                              Nota
                            </ActionButton>
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
    </div>
  );
}
