import React, { useMemo, useState } from "react";
import CurrentPayrollSummaryCard from "../../components/cards/empleado/CurrentPayrollSummaryCard";
import PaginationControls from "../../components/PaginationControls";
import { getPayrollStatus, sueldosData } from "../../data/sueldosData";
import { store, paymentTypeLabels } from "../../lib/store";
import { openReceipt } from "../../lib/api";
import { toast } from "../../lib/feedback";
import { usePagination } from "../../hooks/usePagination";
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

function formatReceiptId(employeeId, payrollId) {
  return payrollId ? `#${employeeId}-${payrollId}` : "";
}

function formatLongDate(date) {
  if (!date) return "—";
  const [day, month, year] = date.split("/").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function SueldosEmployee() {
  const currentYear = String(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [receiptError, setReceiptError] = useState("");

  const employee = store.currentEmployee;
  if (!employee) {
    throw new Error("No se encontró el perfil del empleado para consultar sus sueldos.");
  }
  // Pagos propios registrados por el empleador (RF-25): la base solo devuelve los de este empleado
  const employeePayrolls = useMemo(
    () =>
      sueldosData.payrolls
        .filter((payroll) => payroll.employeeId === employee.id)
        .map((payroll) => ({
          ...payroll,
          id: payroll.virtual ? `${payroll.periodStart ?? ""}pendiente` : String(payroll.id),
          yearKey: (payroll.periodStart ?? "").slice(0, 4) || payroll.period.slice(-4),
          net: payroll.amount,
          period: payroll.paymentType && payroll.paymentType !== "salary"
            ? `${payroll.period} · ${paymentTypeLabels[payroll.paymentType]}`
            : payroll.period,
          status: getPayrollStatus(payroll),
        }))
        .sort((a, b) => String(b.periodStart ?? "9999").localeCompare(String(a.periodStart ?? "9999"))),
    [employee.id],
  );
  const years = [...new Set([currentYear, ...employeePayrolls.map((payroll) => payroll.yearKey)])]
    .filter(Boolean)
    .sort()
    .reverse()
    .slice(0, 2);

  async function viewReceipt(payroll) {
    setReceiptError("");
    try {
      await openReceipt(payroll.receiptKey);
    } catch (error) {
      toast.error(error.message);
    }
  }

  const visiblePayrolls = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");

    return employeePayrolls.filter((payroll) => {
      const matchesYear =
        yearFilter === "Todos" || payroll.yearKey === yearFilter;
      const matchesSearch =
        !normalizedSearch ||
        payroll.period.toLocaleLowerCase("es").includes(normalizedSearch);
      return matchesYear && matchesSearch;
    });
  }, [employeePayrolls, search, yearFilter]);

  const {
    currentPage,
    endIndex,
    pageItems,
    setPage,
    startIndex,
    totalPages,
  } = usePagination(visiblePayrolls, pageSize);
  const currentPayroll =
    employeePayrolls.find((payroll) => payroll.period === sueldosData.period) ??
    employeePayrolls.find((payroll) => payroll.status !== "Pendiente") ??
    { id: "", period: sueldosData.period, net: 0, paymentDate: null, status: "Pendiente", receiptName: null };
  const isCurrentPayrollPending = currentPayroll.status === "Pendiente";

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem] space-y-4">
          <header>
            <nav
              aria-label="Ruta de navegación"
              className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
            >
              <span>Portal del empleado</span>
              <span aria-hidden="true">›</span>
              <span className="text-blue-700">Sueldos</span>
            </nav>
            <h1 className="page-title">Mis Sueldos</h1>
          </header>

          <CurrentPayrollSummaryCard
            amount={formatCurrency(currentPayroll.net)}
            onViewReceipt={() => viewReceipt(currentPayroll)}
            paymentDate={
              isCurrentPayrollPending
                ? "Pendiente de acreditación"
                : formatLongDate(currentPayroll.paymentDate)
            }
            pending={isCurrentPayrollPending}
            period={currentPayroll.period}
            receiptId={formatReceiptId(employee.id, currentPayroll.id)}
            receiptName={currentPayroll.receiptName}
            status={isCurrentPayrollPending ? "PENDIENTE" : "REGISTRADO"}
          />
          {receiptError && !selectedPayroll && (
            <p className="rounded-lg bg-rose-50 p-2 text-[0.625rem] text-rose-700" role="alert">
              {receiptError}
            </p>
          )}

          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                  <Icon className="h-4 w-4">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </Icon>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Historial de Recibos y Liquidaciones
                  </h2>
                  <p className="text-[0.5625rem] text-slate-500">
                    Listado cronológico de tus comprobantes digitales
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  aria-label="Filtrar por año"
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[0.5625rem] font-semibold text-slate-600"
                  role="group"
                >
                  {[...years, "Todos"].map((year) => (
                    <button
                      aria-pressed={yearFilter === year}
                      className={`rounded-md px-2.5 py-1.5 transition-colors ${
                        yearFilter === year
                          ? "bg-white text-slate-900 shadow-sm"
                          : "hover:text-slate-900"
                      }`}
                      key={year}
                      onClick={() => setYearFilter(year)}
                      type="button"
                    >
                      {year === "Todos" ? year : `Año ${year}`}
                    </button>
                  ))}
                </div>
                <label className="relative">
                  <span className="sr-only">Buscar período o concepto</span>
                  <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </Icon>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-[0.5625rem] text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar período o concepto..."
                    type="search"
                    value={search}
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="hr-data-table w-full min-w-[57.5rem] table-fixed border-collapse text-[0.5625rem]">
                <colgroup>
                  <col className="w-[12.5rem]" />
                  <col className="w-[12.5rem]" />
                  <col className="w-[11.25rem]" />
                  <col className="w-[12.5rem]" />
                  <col className="w-[8.75rem]" />
                </colgroup>
                <thead>
                  <tr className="h-10 border-b border-slate-200 bg-[#f0f4ff] text-center text-[0.5rem] font-bold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-3 font-semibold" scope="col">Período</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Monto liquidado</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Fecha de pago</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Estado del sueldo</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pageItems.map((payroll) => {
                    const isPending = payroll.status === "Pendiente";
                    return (
                    <tr
                      className={`h-[3.625rem] text-center transition-colors hover:bg-slate-50/80 ${
                        isPending ? "bg-amber-50/30" : ""
                      }`}
                      key={payroll.id}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-center align-middle font-bold text-slate-900">
                        {payroll.period}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-center align-middle font-bold ${
                        isPending ? "text-slate-500" : "text-slate-900"
                      }`}>
                        {isPending ? "$ -" : `$ ${formatCurrency(payroll.net)}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center align-middle text-slate-600">
                        {isPending ? "—" : payroll.paymentDate}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold ${
                          isPending
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          <span className="mr-1.5 h-1 w-1 rounded-full bg-current" />
                          {payroll.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        {isPending ? (
                          <span className="text-slate-400" title="Recibo pendiente de acreditación">
                            —
                          </span>
                        ) : (
                          <button
                            aria-label={`Ver recibo de ${payroll.period}`}
                            className="rounded p-1 text-slate-500 transition-colors hover:text-blue-700"
                            onClick={() => setSelectedPayroll(payroll)}
                            title="Ver detalle del recibo"
                            type="button"
                          >
                            <Icon className="h-4 w-4">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.257-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </Icon>
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {visiblePayrolls.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-[0.625rem] text-slate-500"
                        colSpan="5"
                      >
                        No se encontraron recibos con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="hr-data-table-footer flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-[#f0f4ff] px-3 py-2 text-[0.5rem] text-slate-600 sm:flex-row">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Página <strong className="text-slate-800">{currentPage}</strong> de{" "}
                  <strong className="text-slate-800">{totalPages}</strong> (
                  {visiblePayrolls.length} recibos)
                </span>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <span>
                  Mostrando{" "}
                  <strong className="text-slate-800">
                    {pageItems.length === 0 ? "0" : `${startIndex + 1}-${endIndex}`}
                  </strong>
                </span>
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
          </section>
        </div>
      </main>

      {selectedPayroll && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelectedPayroll(null)}
        >
          <section
            aria-labelledby="employee-payroll-detail-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-sm font-bold text-slate-900"
                  id="employee-payroll-detail-title"
                >
                  Recibo de sueldo
                </h2>
                <p className="mt-1 text-xs text-slate-500">{selectedPayroll.period}</p>
              </div>
              <button
                aria-label="Cerrar detalle"
                className="text-slate-500 hover:text-slate-900"
                onClick={() => setSelectedPayroll(null)}
                type="button"
              >
                ✕
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Monto liquidado</dt>
                <dd className="font-semibold text-blue-700">$ {formatCurrency(selectedPayroll.net)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Fecha de pago</dt>
                <dd>{selectedPayroll.paymentDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Estado del sueldo</dt>
                <dd>{selectedPayroll.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Recibo</dt>
                <dd className="max-w-[65%] truncate">{selectedPayroll.receiptName}</dd>
              </div>
            </dl>
            {selectedPayroll.receiptKey && (
              <button
                className="mt-4 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                onClick={() => viewReceipt(selectedPayroll)}
                type="button"
              >
                Abrir recibo (PDF)
              </button>
            )}
            {receiptError && (
              <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[0.625rem] text-rose-700" role="alert">
                {receiptError}
              </p>
            )}
            <button
              className="mt-4 w-full rounded-md bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
              onClick={() => setSelectedPayroll(null)}
              type="button"
            >
              Cerrar
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
