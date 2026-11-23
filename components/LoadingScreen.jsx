import React from "react";
import DashboardAdminSkeleton from "./skeleton/admin/DashboardAdminSkeleton";
import {
  DashboardEmployeeSkeleton,
  FrancosEmployeeSkeleton,
  HorariosEmployeeSkeleton,
  SueldosEmployeeSkeleton,
  VacacionesEmployeeSkeleton,
} from "./skeleton/empleado";
import { ConfigurationParticipantSkeleton } from "./skeleton/participante";
import { store } from "../lib/store";

// Pantallas de carga. En lugar de un texto "Cargando…" se muestra la forma de la
// pantalla que viene (menú, encabezado, tarjetas y tabla) mientras llegan los datos.

function Block({ className }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// Forma de cada pantalla, en el mismo orden en que aparece: formulario de carga,
// tarjetas de indicadores, paneles y tabla. Así la carga ya muestra dónde va cada cosa.
const pageLayouts = {
  "/employer": ["cards:4", "panels:2"],
  "/employer/horarios": ["form:3", "cards:1", "table:5"],
  "/employer/fichajes": ["form:3", "cards:3", "table:6"],
  "/employer/francos": ["form:3", "wide", "cards:3", "table:5"],
  "/employer/vacaciones": ["form:4", "cards:4", "table:6"],
  "/employer/empleados": ["form:4:2", "cards:3", "table:8"],
  "/employer/sueldos": ["form:4", "cards:4", "table:6"],
  "/employer/estadisticas": ["cards:4", "panels:2", "wide"],
  "/employee": ["cards:3", "panels:2"],
  "/employee/horarios": ["week", "cards:1", "table:3"],
  "/employee/francos": ["form:3", "cards:2", "table:5"],
  "/employee/vacaciones": ["form:3", "cards:3", "table:4"],
  "/employee/sueldos": ["wide", "table:5"],
  "/admin": ["cards:5", "panels:2"],
  "/admin/empresas": ["form:4", "cards:3", "table:8"],
  "/admin/solicitudes": ["cards:4", "table:7"],
};
const configurationLayout = ["form:3:2", "panels:2"];
const defaultLayout = ["form:4", "cards:4", "table:6"];

export function layoutFor(path = "") {
  if (pageLayouts[path]) return pageLayouts[path];
  if (path.endsWith("/configuration")) return configurationLayout;
  return defaultLayout;
}

const columnClasses = { 1: "", 2: "sm:grid-cols-2", 3: "md:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" };

function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function SkeletonPart({ kind, count, rows }) {
  switch (kind) {
    case "form":
      return (
        <Card>
          <Block className="h-3.5 w-48" />
          {Array.from({ length: rows || 1 }, (_, row) => (
            <div className={`mt-4 grid grid-cols-1 gap-2.5 ${columnClasses[count] ?? columnClasses[4]}`} key={row}>
              {Array.from({ length: count }, (_, item) => (
                <div key={item}>
                  <Block className="h-2.5 w-20" />
                  <Block className="mt-1.5 h-[var(--field-height)] w-full" />
                </div>
              ))}
            </div>
          ))}
          <div className="mt-4 flex justify-end gap-2">
            <Block className="h-7 w-24" />
            <Block className="h-7 w-28" />
          </div>
        </Card>
      );
    case "cards":
      return (
        <div className={`grid grid-cols-1 gap-3 ${columnClasses[count] ?? columnClasses[4]}`}>
          {Array.from({ length: count }, (_, item) => (
            <Card key={item}>
              <Block className="h-2.5 w-24" />
              <Block className="mt-3 h-7 w-16" />
              <Block className="mt-3 h-2 w-32" />
            </Card>
          ))}
        </div>
      );
    case "panels":
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: count }, (_, item) => (
            <Card key={item}>
              <Block className="h-3.5 w-40" />
              <Block className="mt-4 h-40 w-full" />
            </Card>
          ))}
        </div>
      );
    case "wide":
      return (
        <Card>
          <Block className="h-3.5 w-56" />
          <Block className="mt-4 h-24 w-full" />
        </Card>
      );
    case "week":
      return (
        <Card>
          <Block className="h-3.5 w-40" />
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, item) => <Block className="h-24 w-full" key={item} />)}
          </div>
        </Card>
      );
    case "table":
    default:
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4">
            <Block className="h-3.5 w-40" />
            <Block className="h-[var(--field-height)] w-56" />
          </div>
          <div className="grid gap-3 bg-[#edf4ff] px-4 py-3" style={{ gridTemplateColumns: `repeat(${count || 5}, minmax(0, 1fr))` }}>
            {Array.from({ length: count || 5 }, (_, item) => <Block className="h-2.5 w-16" key={item} />)}
          </div>
          {Array.from({ length: 5 }, (_, row) => (
            <div className="grid items-center gap-3 border-t border-slate-100 px-4 py-3" key={row} style={{ gridTemplateColumns: `repeat(${count || 5}, minmax(0, 1fr))` }}>
              {Array.from({ length: count || 5 }, (_, item) =>
                item === 0 ? (
                  <div className="flex items-center gap-2" key={item}>
                    <Block className="h-7 w-7 shrink-0 rounded-full" />
                    <div className="w-full space-y-1.5">
                      <Block className="h-2.5 w-3/4" />
                      <Block className="h-2 w-1/2" />
                    </div>
                  </div>
                ) : (
                  <Block className="h-2.5 w-2/3" key={item} />
                ),
              )}
            </div>
          ))}
        </div>
      );
  }
}

// Contenido de una sección del panel, con la forma de la pantalla que se está abriendo
export function PageSkeleton({ path }) {
  if (path === "/employer/configuration" || path === "/configuracion") {
    return <ConfigurationParticipantSkeleton isEmployer={store.isCompany} />;
  }
  if (path === "/employee/configuration") {
    return <ConfigurationParticipantSkeleton />;
  }

  const routeSkeletons = {
    "/admin": DashboardAdminSkeleton,
    "/employee": DashboardEmployeeSkeleton,
    "/employee/horarios": HorariosEmployeeSkeleton,
    "/employee/francos": FrancosEmployeeSkeleton,
    "/employee/vacaciones": VacacionesEmployeeSkeleton,
    "/employee/sueldos": SueldosEmployeeSkeleton,
  };
  const RouteSkeleton = routeSkeletons[path];
  if (RouteSkeleton) return <RouteSkeleton />;

  const layout = layoutFor(path);
  return (
    <div aria-busy="true" aria-label="Cargando la sección" className="px-4 py-4 md:px-5" data-layout={layout.join(",")} data-testid="page-skeleton" role="status">
      <div className="mx-auto max-w-[93.75rem] space-y-4">
        <div className="space-y-2">
          <Block className="h-2.5 w-40" />
          <Block className="h-6 w-64" />
        </div>
        {layout.map((part, index) => {
          const [kind, count, rows] = part.split(":");
          return <SkeletonPart count={Number(count) || 0} key={`${part}-${index}`} kind={kind} rows={Number(rows) || 1} />;
        })}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

// Primera carga del panel (por ejemplo, al pasar del inicio de sesión al inicio):
// el menú lateral y el contenido aparecen como bloques mientras se leen los datos.
export function ShellSkeleton({ path }) {
  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans">
      <aside aria-hidden="true" className="sticky top-0 hidden h-screen w-[11.5625rem] shrink-0 flex-col gap-3 bg-[#223247] p-3 lg:flex">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#3b475e]" />
          <div className="space-y-1.5">
            <div className="h-2 w-20 rounded bg-[#3b475e]" />
            <div className="h-1.5 w-14 rounded bg-[#2f3d54]" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="h-6 rounded-md bg-[#2b3a50]" key={index} style={{ opacity: 1 - index * 0.07 }} />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div aria-hidden="true" className="flex h-14 items-center gap-3 bg-[#223247] px-3 lg:hidden">
          <div className="h-6 w-6 rounded bg-[#3b475e]" />
          <div className="h-3 w-28 rounded bg-[#3b475e]" />
        </div>
        <PageSkeleton path={path} />
      </div>
    </div>
  );
}

// Páginas públicas y pasos de acceso
export function PublicLoading() {
  return (
    <div aria-busy="true" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f5f7ff] font-sans" role="status">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-700" />
      <p className="text-[0.6875rem] font-semibold text-slate-500">Cargando…</p>
    </div>
  );
}
