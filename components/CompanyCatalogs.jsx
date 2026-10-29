import React, { useMemo, useState } from "react";
import { employeeDirectory } from "../data/employeeDirectory";
import { deleteCatalogItem, saveCatalogItem } from "../lib/api";
import { confirmDialog, promptDialog, toast } from "../lib/feedback";
import { store } from "../lib/store";

const catalogs = [
  { table: "job_positions", raw: "jobPositions", field: "role", title: "Puestos", singular: "puesto", placeholder: "Ej. Operador de depósito" },
  { table: "departments", raw: "departments", field: "department", title: "Áreas", singular: "área", placeholder: "Ej. Logística" },
  { table: "branches", raw: "branches", field: "branch", title: "Sucursales", singular: "sucursal", placeholder: "Ej. Sucursal Norte" },
];

function CatalogCard({ catalog, onChange }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const items = store.raw?.[catalog.raw] ?? [];
  const usage = useMemo(() => {
    const counts = {};
    employeeDirectory
      .filter((employee) => employee.employmentStatus !== "inactive")
      .forEach((employee) => {
        counts[employee[catalog.field]] = (counts[employee[catalog.field]] ?? 0) + 1;
      });
    return counts;
  }, [catalog.field, items]);

  async function run(action, success) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChange();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  function add(event) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    run(async () => {
      await saveCatalogItem(catalog.table, { name: value });
      setName("");
    }, `Se agregó ${catalog.singular === "área" ? "el área" : `el ${catalog.singular}`} ${value}.`);
  }

  async function rename(item) {
    const value = await promptDialog({
      title: `Renombrar ${catalog.singular}`,
      message: "El cambio se ve en todos los empleados que lo tienen asignado.",
      label: "Nombre",
      placeholder: item.name,
      confirmLabel: "Guardar",
      required: true,
      multiline: false,
    });
    if (!value || value === item.name) return;
    run(() => saveCatalogItem(catalog.table, { id: item.id, name: value }), `Se renombró a ${value}.`);
  }

  async function toggle(item) {
    if (item.is_active) {
      const confirmed = await confirmDialog({
        title: `Desactivar ${catalog.singular}`,
        message: `${item.name} deja de aparecer en las listas para nuevos empleados. Los que ya lo tienen asignado no cambian.`,
        confirmLabel: "Desactivar",
        tone: "danger",
      });
      if (!confirmed) return;
    }
    run(
      () => saveCatalogItem(catalog.table, { id: item.id, is_active: !item.is_active }),
      `${item.name} quedó ${item.is_active ? "desactivado" : "activo"}.`,
    );
  }

  async function remove(item) {
    const confirmed = await confirmDialog({
      title: `Eliminar ${catalog.singular}`,
      message: `¿Eliminar ${item.name}? Solo se puede si ningún empleado lo tiene asignado.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!confirmed) return;
    run(() => deleteCatalogItem(catalog.table, item.id), `Se eliminó ${item.name}.`);
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200/80">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <h3 className="text-xs font-bold text-slate-900">{catalog.title}</h3>
        <span className="text-[0.5625rem] text-slate-500">{items.filter((item) => item.is_active).length} activos</span>
      </div>
      <ul className="max-h-64 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => (
          <li className="flex items-center justify-between gap-2 px-3 py-1.5" key={item.id}>
            <div className="min-w-0">
              <p className={`truncate text-[0.625rem] font-semibold ${item.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                {item.name}
              </p>
              <p className="text-[0.5625rem] text-slate-500">
                {usage[item.name] ?? 0} {usage[item.name] === 1 ? "empleado" : "empleados"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button className="rounded px-1.5 py-0.5 text-[0.5625rem] font-semibold text-blue-700 hover:bg-blue-50" disabled={busy} onClick={() => rename(item)} type="button">
                Renombrar
              </button>
              <button className="rounded px-1.5 py-0.5 text-[0.5625rem] font-semibold text-slate-600 hover:bg-slate-100" disabled={busy} onClick={() => toggle(item)} type="button">
                {item.is_active ? "Desactivar" : "Activar"}
              </button>
              {!usage[item.name] && (
                <button className="rounded px-1.5 py-0.5 text-[0.5625rem] font-semibold text-red-600 hover:bg-red-50" disabled={busy} onClick={() => remove(item)} type="button">
                  Eliminar
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-4 text-center text-[0.625rem] text-slate-500">Todavía no hay {catalog.title.toLowerCase()}.</li>}
      </ul>
      <form className="flex gap-1.5 border-t border-slate-100 p-2" onSubmit={add}>
        <label className="sr-only" htmlFor={`new-${catalog.table}`}>Nuevo {catalog.singular}</label>
        <input
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-[0.5625rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          id={`new-${catalog.table}`}
          onChange={(event) => setName(event.target.value)}
          placeholder={catalog.placeholder}
          value={name}
        />
        <button className="rounded-md bg-[#1e40af] px-2.5 py-1.5 text-[0.5625rem] font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={busy || !name.trim()} type="submit">
          Agregar
        </button>
      </form>
    </div>
  );
}

// Puestos, áreas y sucursales de la empresa
export default function CompanyCatalogs() {
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((value) => value + 1);
  const plan = store.company?.plan;
  const activeEmployees = employeeDirectory.filter((employee) => employee.employmentStatus !== "inactive").length;

  return (
    <div className="space-y-3">
      {plan && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50/70 px-3 py-2 text-[0.625rem] text-blue-900">
          <span>
            Plan contratado: <strong>{plan.name}</strong>
          </span>
          <span>
            {activeEmployees} {plan.max_employees ? `de ${plan.max_employees}` : ""} empleados activos
            {plan.max_employees ? "" : " · sin límite"}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {catalogs.map((catalog) => (
          <CatalogCard catalog={catalog} key={catalog.table} onChange={refresh} />
        ))}
      </div>
    </div>
  );
}
