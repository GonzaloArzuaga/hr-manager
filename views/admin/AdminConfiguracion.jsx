import React, { useEffect, useState } from "react";
import PasswordForm from "../../components/PasswordForm";
import { adminUpdatePlan, adminUpdateProfile, listPlans, updatePassword } from "../../lib/api";
import { toast } from "../../lib/feedback";
import { store } from "../../lib/store";

const inputClassName =
  "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] font-normal focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClassName = "block text-[0.6875rem] font-semibold text-slate-700";

function PlanEditor({ plan, onSaved }) {
  const [form, setForm] = useState({
    ...plan,
    monthly_price: plan.monthly_price ?? "",
    max_employees: plan.max_employees ?? "",
    description: plan.description ?? "",
  });
  const [saving, setSaving] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminUpdatePlan(form);
      toast.success(`Se guardó el plan ${form.name}.`);
      onSaved();
    } catch (saveError) {
      toast.error(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-lg border border-slate-200/80 p-3" onSubmit={submit}>
      <p className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">Código: {plan.code}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className={labelClassName}>
          Nombre
          <input className={inputClassName} name="name" onChange={update} required value={form.name} />
        </label>
        <label className={labelClassName}>
          Precio mensual (USD)
          <input
            className={inputClassName}
            min="0"
            name="monthly_price"
            onChange={update}
            placeholder="Vacío: a convenir"
            step="0.01"
            type="number"
            value={form.monthly_price}
          />
        </label>
        <label className={labelClassName}>
          Máximo de empleados activos
          <input
            className={inputClassName}
            min="1"
            name="max_employees"
            onChange={update}
            placeholder="Vacío: sin límite"
            type="number"
            value={form.max_employees}
          />
        </label>
        <label className={labelClassName}>
          Descripción
          <input className={inputClassName} name="description" onChange={update} value={form.description} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          className="rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Guardando..." : "Guardar plan"}
        </button>
      </div>
    </form>
  );
}

export default function AdminConfiguracion() {
  const [plans, setPlans] = useState([]);
  const [name, setName] = useState(store.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  function loadPlans() {
    listPlans()
      .then(setPlans)
      .catch((error) => toast.error(error.message));
  }

  useEffect(loadPlans, []);

  async function saveName(event) {
    event.preventDefault();
    setSavingName(true);
    try {
      await adminUpdateProfile(name.trim());
      toast.success("Se guardó tu nombre.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingName(false);
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
              <span className="text-blue-700">Configuración</span>
            </nav>
            <h1 className="page-title">Configuración</h1>
          </header>

          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="mb-3 border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Planes</h2>
              <p className="mt-0.5 text-[0.625rem] text-slate-500">
                El máximo de empleados se controla al dar de alta o reactivar empleados. Los cambios valen desde ese momento para
                todas las empresas del plan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              {plans.map((plan) => (
                <PlanEditor key={`${plan.code}-${plan.updated_at}`} onSaved={loadPlans} plan={plan} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="mb-3 border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Mi cuenta</h2>
                <p className="mt-0.5 text-[0.625rem] text-slate-500">{store.user?.email}</p>
              </div>
              <form className="space-y-3" onSubmit={saveName}>
                <label className={labelClassName}>
                  Nombre visible
                  <input className={inputClassName} onChange={(event) => setName(event.target.value)} value={name} />
                </label>
                <div className="flex justify-end">
                  <button
                    className="rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                    disabled={savingName}
                    type="submit"
                  >
                    Guardar nombre
                  </button>
                </div>
              </form>
            </section>
            <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="mb-3 border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Cambiar contraseña</h2>
              </div>
              <PasswordForm
                onSubmit={async (password) => {
                  await updatePassword(password);
                  toast.success("Tu contraseña se actualizó.");
                }}
                submitLabel="Cambiar contraseña"
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
