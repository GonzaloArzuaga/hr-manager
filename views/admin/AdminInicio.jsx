import React, { useEffect, useMemo, useState } from "react";
import ChartCanvas from "../../components/ChartCanvas";
import { adminDashboard } from "../../lib/api";
import { store } from "../../lib/store";
import { monthShort } from "../../lib/workforce";

function MetricCard({ title, value, note }) {
  return (
    <article className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
      <p className="mt-2 text-[0.5625rem] text-slate-500">{note}</p>
    </article>
  );
}

function Card({ title, subtitle, children, action }) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.625rem] text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const money = (value) =>
  Number(value ?? 0).toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function AdminInicio() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminDashboard().then(setData).catch((loadError) => setError(loadError.message));
  }, []);

  const monthConfig = useMemo(() => {
    if (!data) return null;
    return {
      type: "bar",
      data: {
        labels: data.by_month.map((row) => `${monthShort[Number(row.month.slice(5, 7)) - 1]} ${row.month.slice(2, 4)}`),
        datasets: [
          {
            label: "Empresas nuevas",
            data: data.by_month.map((row) => row.companies),
            backgroundColor: "#2563eb",
            borderRadius: 5,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } },
          x: { grid: { display: false } },
        },
      },
    };
  }, [data]);

  const planConfig = useMemo(() => {
    if (!data) return null;
    return {
      type: "doughnut",
      data: {
        labels: data.by_plan.map((row) => row.name),
        datasets: [
          {
            data: data.by_plan.map((row) => row.companies),
            backgroundColor: ["#93c5fd", "#2563eb", "#1e3a8a"],
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
      },
    };
  }, [data]);

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
              <span className="text-blue-700">Inicio</span>
            </nav>
            <h1 className="page-title">Hola, {store.user?.name?.split(" ")[0]}</h1>
          </header>

          {error && <p className="text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}
          {!data && !error && <p className="text-[0.625rem] text-slate-500">Cargando el panel…</p>}

          {data && (
            <>
              <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  note={`${data.companies - data.active_companies} suspendidas`}
                  title="Empresas activas"
                  value={data.active_companies}
                />
                <MetricCard
                  note={`${data.accounts} cuentas con acceso habilitado`}
                  title="Empleados activos"
                  value={data.employees}
                />
                <MetricCard
                  note={
                    data.custom_plans
                      ? `Más ${data.custom_plans} ${data.custom_plans === 1 ? "empresa" : "empresas"} con plan a medida`
                      : "Según el precio de lista de cada plan"
                  }
                  title="Facturación mensual"
                  value={money(data.monthly_revenue)}
                />
                <MetricCard
                  note={`${data.logins_30d} usuarios ingresaron en los últimos 30 días`}
                  title="Pendientes de primer ingreso"
                  value={data.pending_first_login}
                />
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card subtitle="Altas de los últimos 12 meses" title="Empresas nuevas por mes">
                    <ChartCanvas config={monthConfig} label="Gráfico de empresas nuevas por mes" />
                  </Card>
                </div>
                <Card subtitle="Empresas activas en cada plan" title="Planes contratados">
                  <ChartCanvas config={planConfig} label="Gráfico de empresas por plan" />
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card
                  action={<a className="text-[0.5625rem] font-semibold text-blue-700 hover:underline" href="/admin/empresas">Ver todas</a>}
                  subtitle="Las últimas cinco empresas dadas de alta"
                  title="Altas recientes"
                >
                  <ul className="divide-y divide-slate-100">
                    {data.recent.map((company) => (
                      <li className="flex items-center justify-between gap-3 py-2 text-[0.625rem]" key={company.id}>
                        <div>
                          <p className="font-bold text-slate-900">{company.legal_name}</p>
                          <p className="text-slate-500">
                            {company.plan_name} · {new Date(company.created_at).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold ${
                            company.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {company.is_active ? "Activa" : "Suspendida"}
                        </span>
                      </li>
                    ))}
                    {data.recent.length === 0 && (
                      <li className="py-6 text-center text-[0.625rem] text-slate-500">Todavía no hay empresas.</li>
                    )}
                  </ul>
                </Card>
                <Card subtitle="Empresas que usan el 80 % o más de los empleados de su plan" title="Cerca del límite del plan">
                  <ul className="divide-y divide-slate-100">
                    {data.near_limit.map((company) => (
                      <li className="py-2 text-[0.625rem]" key={company.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-slate-900">{company.legal_name}</p>
                          <span className="font-semibold text-slate-700">
                            {company.employees} de {company.max_employees}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${company.usage >= 100 ? "bg-red-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, company.usage)}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[0.5625rem] text-slate-500">Plan {company.plan_name}</p>
                      </li>
                    ))}
                    {data.near_limit.length === 0 && (
                      <li className="py-6 text-center text-[0.625rem] text-slate-500">Ninguna empresa está cerca de su límite.</li>
                    )}
                  </ul>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
