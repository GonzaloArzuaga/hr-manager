import React, { useEffect, useRef, useState } from "react";
import { TimeField } from "../../components/DateTimeFields";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import { store } from "../../lib/store";
import CompanyCatalogs from "../../components/CompanyCatalogs";
import PasswordForm from "../../components/PasswordForm";
import { CheckIcon, PlusIcon } from "../../components/icons";
import {
  adminUpdatePlan,
  adminUpdateProfile,
  listPlans,
  removeProfilePhoto,
  updatePassword,
  updatePassword as changePassword,
  uploadProfilePhoto,
} from "../../lib/api";
import { allModuleKeys, planModules } from "../../lib/plans";
import {
  getBusinessRules,
  saveBusinessRules,
} from "../../data/businessRules";
import {
  getShiftTypes,
  saveShiftTypes,
} from "../../data/shiftTypes";

const inputClassName =
  "w-full rounded-lg border-0 bg-[#f1f5fa] px-3 py-2 text-[0.5625rem] text-slate-900 focus:ring-2 focus:ring-blue-600";
const smallInputClassName =
  "w-full sm:w-20 rounded-md border-0 bg-[#edf2f8] px-2 py-2.5 text-center text-[0.5625rem] font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500";

function Icon({ path, className = "h-4 w-4" }) {
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
      <path d={path} />
    </svg>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <Icon className="h-4 w-4 text-blue-800" path={icon} />}
      <h2 className="text-sm font-bold tracking-tight text-slate-900">
        {children}
      </h2>
    </div>
  );
}

function FormField({ label, className = inputClassName, ...inputProps }) {
  return (
    <label className="block text-[0.6875rem] font-semibold text-slate-700">
      {label}
      {inputProps.type === "time" ? (
        <span className="mt-2 block">
          <TimeField className={className} {...inputProps} type={undefined} />
        </span>
      ) : (
        <input className={`${className} mt-2 block`} {...inputProps} />
      )}
    </label>
  );
}

function PasswordRequirement({ valid, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold ${
        valid
          ? "bg-blue-50 text-blue-800"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <Icon
        className="h-3 w-3"
        path={
          valid
            ? "M5 13l4 4L19 7"
            : "M6 18L18 6M6 6l12 12"
        }
      />
      {children}
    </span>
  );
}

const planInputClassName =
  "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[0.5625rem] font-normal focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const planLabelClassName = "block text-[0.6875rem] font-semibold text-slate-700";

function PlanEditor({ plan, onSaved }) {
  const [form, setForm] = useState({
    ...plan,
    monthly_price: plan.monthly_price ?? "",
    max_employees: plan.max_employees ?? "",
    description: plan.description ?? "",
    modules: Array.isArray(plan.modules) ? plan.modules : allModuleKeys,
    features: Array.isArray(plan.features) ? plan.features.map((item) => ({ ...item })) : [],
    highlighted: Boolean(plan.highlighted),
  });
  const [saving, setSaving] = useState(false);

  // Características que muestra la página de Precios (además del límite y los módulos)
  function updateFeature(index, changes) {
    setForm((current) => ({
      ...current,
      features: current.features.map((item, position) => (position === index ? { ...item, ...changes } : item)),
    }));
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function toggleModule(key) {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(key)
        ? current.modules.filter((item) => item !== key)
        : allModuleKeys.filter((item) => item === key || current.modules.includes(item)),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminUpdatePlan(form);
      toast.success(`Se guardó el plan ${form.name}.`);
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-lg border border-slate-200/80 p-3" onSubmit={submit}>
      <p className="mb-2 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">
        Código: {plan.code}
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className={planLabelClassName}>
          Nombre
          <input className={planInputClassName} name="name" onChange={update} required value={form.name} />
        </label>
        <label className={planLabelClassName}>
          Precio mensual (USD)
          <input
            className={planInputClassName}
            min="0"
            name="monthly_price"
            onChange={update}
            placeholder="Vacío: a convenir"
            step="0.01"
            type="number"
            value={form.monthly_price}
          />
        </label>
        <label className={planLabelClassName}>
          Máximo de empleados activos
          <input
            className={planInputClassName}
            min="1"
            name="max_employees"
            onChange={update}
            placeholder="Vacío: sin límite"
            type="number"
            value={form.max_employees}
          />
        </label>
        <label className={planLabelClassName}>
          Descripción
          <input className={planInputClassName} name="description" onChange={update} value={form.description} />
        </label>
      </div>
      <fieldset className="mt-3">
        <legend className={planLabelClassName}>Módulos incluidos</legend>
        <p className="mt-0.5 text-[0.5625rem] text-slate-500">
          Horarios, francos, vacaciones y empleados están en todos los planes.
        </p>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5">
          {planModules.map((module) => {
            const checked = form.modules.includes(module.key);
            return (
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-[0.625rem] transition-colors ${
                  checked
                    ? "border-blue-200 bg-blue-50/70 text-blue-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                key={module.key}
              >
                <input
                  checked={checked}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  name={`module-${module.key}`}
                  onChange={() => toggleModule(module.key)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-semibold">{module.label}</span>
                  <span className="block text-[0.5625rem] text-slate-500">{module.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className={planLabelClassName}>Características en la página de Precios</legend>
        <p className="mt-0.5 text-[0.5625rem] text-slate-500">
          El límite de empleados y los módulos se muestran solos. Acá van el soporte y cualquier otro beneficio.
          Destildá "Incluida" para mostrarla tachada como no incluida.
        </p>
        <div className="mt-1.5 space-y-1.5">
          {form.features.map((feature, index) => (
            <div className="flex items-center gap-2" key={index}>
              <input
                aria-label={`Característica ${index + 1}`}
                className={planInputClassName.replace("mt-1 ", "")}
                maxLength={120}
                onChange={(event) => updateFeature(index, { label: event.target.value })}
                placeholder="Ej. Soporte técnico 24/7"
                value={feature.label}
              />
              <label className="flex shrink-0 items-center gap-1 text-[0.5625rem] text-slate-600">
                <input
                  checked={feature.included !== false}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  onChange={(event) => updateFeature(index, { included: event.target.checked })}
                  type="checkbox"
                />
                Incluida
              </label>
              <button
                aria-label={`Quitar la característica ${index + 1}`}
                className="shrink-0 rounded-md px-1.5 py-1 text-[0.625rem] font-bold text-rose-600 hover:bg-rose-50"
                onClick={() => setForm((current) => ({ ...current, features: current.features.filter((_, position) => position !== index) }))}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
          {form.features.length < 12 && (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[0.5625rem] font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setForm((current) => ({ ...current, features: [...current.features, { label: "", included: true }] }))}
              type="button"
            >
              <PlusIcon className="h-2.5 w-2.5" />
              Agregar característica
            </button>
          )}
        </div>
      </fieldset>
      <label className="mt-3 flex items-center gap-2 text-[0.625rem] text-slate-700">
        <input
          checked={form.highlighted}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
          onChange={(event) => setForm((current) => ({ ...current, highlighted: event.target.checked }))}
          type="checkbox"
        />
        Destacar como "Más popular" en la página de Precios
      </label>
      <div className="mt-3 flex justify-end">
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          <CheckIcon />
          {saving ? "Guardando..." : "Guardar plan"}
        </button>
      </div>
    </form>
  );
}

function AdminConfiguration() {
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
                <label className={planLabelClassName}>
                  Nombre visible
                  <input
                    className={planInputClassName}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    className="rounded-lg bg-[#1e40af] px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
                    disabled={savingName}
                    type="submit"
                  >
                    {savingName ? "Guardando..." : "Guardar nombre"}
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

function ParticipantConfiguration({ userType = "employer" }) {
  const isEmployer = userType !== "employee";
  const user = {
    name: store.user?.name ?? "",
    role: store.user?.role ?? "",
    email: store.account?.email ?? "",
    avatarUrl: store.user?.avatarUrl,
  };

  const [rules, setRules] = useState(getBusinessRules);
  const [vacationRanges, setVacationRanges] = useState(
    () => getBusinessRules().vacationRanges,
  );
  const [newRange, setNewRange] = useState({ from: "", to: "", days: "" });
  const [shiftTypes, setShiftTypes] = useState(getShiftTypes);
  const [newShiftType, setNewShiftType] = useState({
    name: "",
    start: "",
    end: "",
  });
  const [email, setEmail] = useState(user.email);
  const [savedEmail, setSavedEmail] = useState(user.email);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user.avatarUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const profilePhotoInput = useRef(null);


  // Política de contraseñas del RNF-03
  const passwordRequirements = {
    length: newPassword.length >= 8,
    symbol: /[^A-Za-z0-9]/.test(newPassword),
  };
  const passwordIsValid = Object.values(passwordRequirements).every(Boolean);

  function updateRule(event) {
    const { name, value } = event.target;
    setRules((current) => ({ ...current, [name]: Number(value) }));
    setNotice("");
  }

  // Guarda en la base y vuelve a leer lo guardado
  async function persistRules(nextRules, successMessage) {
    setSaving(true);
    setNotice("");
    try {
      await saveBusinessRules(nextRules);
      setRules(getBusinessRules());
      setVacationRanges(getBusinessRules().vacationRanges);
      toast.success(successMessage);
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveRules(event) {
    event.preventDefault();
    if (vacationRanges.some((range) => !Number.isInteger(range.days) || range.days < 1)) {
      setNotice("Cada tramo de vacaciones debe tener al menos 1 día.");
      return;
    }
    setSavingRules(true);
    await persistRules({ ...rules, vacationRanges }, "Reglas guardadas. Se aplican a las solicitudes nuevas.");
    setSavingRules(false);
  }

  async function persistShiftTypes(updatedTypes, successMessage) {
    setSaving(true);
    setNotice("");
    try {
      await saveShiftTypes(updatedTypes);
      setShiftTypes(getShiftTypes());
      toast.success(successMessage);
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateShiftType(shiftId, field, value) {
    setShiftTypes((current) =>
      current.map((shift) =>
        shift.id === shiftId ? { ...shift, [field]: value } : shift,
      ),
    );
    setNotice("");
  }

  async function addShiftType(event) {
    event.preventDefault();
    const shift = {
      id: `nuevo-${Date.now()}`,
      name: newShiftType.name.trim(),
      start: newShiftType.start,
      end: newShiftType.end,
    };
    if (!shift.name || !shift.start || !shift.end || shift.start === shift.end) {
      setNotice("Completá el nombre y un horario de inicio distinto del de fin.");
      return;
    }
    const updatedTypes = [...shiftTypes, shift];
    if (await persistShiftTypes(updatedTypes, "Tipo de turno agregado y guardado.")) {
      setNewShiftType({ name: "", start: "", end: "" });
    }
  }

  async function saveConfiguredShiftTypes(event) {
    event.preventDefault();
    await persistShiftTypes(shiftTypes, "Tipos de turnos guardados.");
  }

  async function removeShiftType(shiftId) {
    const updatedTypes = shiftTypes.filter((shift) => shift.id !== shiftId);
    await persistShiftTypes(
      updatedTypes,
      "Tipo de turno quitado. Los horarios ya asignados con ese turno se conservan.",
    );
  }

  async function addVacationRange(event) {
    event.preventDefault();
    const from = Number(newRange.from);
    const to = Number(newRange.to);
    const days = Number(newRange.days);
    const lastRange = vacationRanges[vacationRanges.length - 1];
    const openRange = vacationRanges.find((range) => range.to === null);

    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      !Number.isInteger(days) ||
      from < 0 ||
      to < from ||
      days < 1 ||
      (openRange ? from <= openRange.from : lastRange && from <= lastRange.to)
    ) {
      setNotice(
        "Revisá el tramo: los años deben ser válidos y comenzar después del último tramo.",
      );
      return;
    }

    const currentOpenRange = vacationRanges.find((range) => range.to === null);
    const nextRangeId = Date.now();
    const updatedRanges = currentOpenRange
      ? [
          ...vacationRanges.map((range) =>
            range.id === currentOpenRange.id
              ? { ...range, to: from - 1 }
              : range,
          ),
          { id: nextRangeId, from, to, days },
          {
            id: nextRangeId + 1,
            from: to + 1,
            to: null,
            days: currentOpenRange.days,
          },
        ]
      : [...vacationRanges, { id: nextRangeId, from, to, days }];
    if (await persistRules({ ...rules, vacationRanges: updatedRanges }, "Tramo de vacaciones agregado.")) {
      setNewRange({ from: "", to: "", days: "" });
    }
  }

  function updateVacationRangeDays(rangeId, value) {
    setVacationRanges((current) =>
      current.map((range) =>
        range.id === rangeId
          ? { ...range, days: value === "" ? "" : Number(value) }
          : range,
      ),
    );
    setNotice("");
  }

  function saveEmail(event) {
    event.preventDefault();
    setEmail(savedEmail);
    setNotice(
      "El email es tu usuario de acceso y no se modifica desde aquí. Si necesitás cambiarlo, pedíselo a tu empleador o al administrador del sistema.",
    );
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (!currentPassword || !passwordIsValid || newPassword !== confirmPassword) {
      setNotice(
        "Ingresá tu contraseña actual, cumplí todos los requisitos y confirmá la nueva contraseña.",
      );
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      await changePassword(newPassword, { currentPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  function discardEmailChanges() {
    setEmail(savedEmail);
    setNotice("");
  }

  async function updateProfilePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadProfilePhoto(file);
      setProfilePhotoUrl(store.user?.avatarUrl);
      toast.success("Se guardó tu foto de perfil.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deleteProfilePhoto() {
    setUploadingPhoto(true);
    try {
      await removeProfilePhoto();
      setProfilePhotoUrl(undefined);
      toast.success("Se quitó tu foto de perfil.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans text-slate-800 antialiased">
      <main className="min-w-0 flex-1 px-4 py-4 md:px-5">
        <div className="mx-auto max-w-[93.75rem]">
          <header className="mb-4">
            <nav
              aria-label="Ruta de navegación"
              className="mb-1 flex items-center gap-2 text-[0.5625rem] font-semibold uppercase tracking-wider text-slate-500"
            >
              <span>Operaciones &amp; RRHH</span>
              <span aria-hidden="true">&gt;</span>
              <span className="text-blue-700">Configuración</span>
            </nav>
            <h1 className="page-title">
              Configuración
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Administrá tus datos de usuario y preferencias.
            </p>
          </header>

          {notice && (
            <p
              aria-live="polite"
              className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
              role="status"
            >
              {notice}
            </p>
          )}

          <div className="space-y-8">
            {isEmployer && (
              <section aria-label="Reglas de negocio">
                <SectionTitle icon="M4 6h16M4 12h16M4 18h16M8 3v6m8 3v6">
                  Configuración de Reglas de Negocio
                </SectionTitle>
                <div className="space-y-5 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <form onSubmit={saveRules}>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <FormField
                        label="Francos por semana"
                        max="7"
                        min="0"
                        name="weeklyDaysOff"
                        onChange={updateRule}
                        required
                        type="number"
                        value={rules.weeklyDaysOff}
                      />
                      <FormField
                        label="Días de aviso previo para franco"
                        min="0"
                        name="daysOffNotice"
                        onChange={updateRule}
                        required
                        type="number"
                        value={rules.daysOffNotice}
                      />
                      <FormField
                        label="Días de aviso previo para vacaciones"
                        min="0"
                        name="vacationNotice"
                        onChange={updateRule}
                        required
                        type="number"
                        value={rules.vacationNotice}
                      />
                    </div>
                    <fieldset className="mt-5 space-y-2">
                      <legend className="mb-2 text-[0.6875rem] font-semibold text-slate-700">
                        Aprobación de solicitudes
                      </legend>
                      <label className="flex items-center gap-2 text-[0.625rem] text-slate-700">
                        <input
                          checked={rules.requiresDaysOffApproval}
                          className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                          onChange={(event) => {
                            setRules((current) => ({ ...current, requiresDaysOffApproval: event.target.checked }));
                            setNotice("");
                          }}
                          type="checkbox"
                        />
                        Los francos requieren aprobación del empleador
                      </label>
                      <label className="flex items-center gap-2 text-[0.625rem] text-slate-700">
                        <input
                          checked={rules.requiresVacationApproval}
                          className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                          onChange={(event) => {
                            setRules((current) => ({ ...current, requiresVacationApproval: event.target.checked }));
                            setNotice("");
                          }}
                          type="checkbox"
                        />
                        Las vacaciones requieren aprobación del empleador
                      </label>
                      <p className="text-[0.6875rem] text-slate-500">
                        Si se desactiva, las solicitudes que cumplen las reglas se aprueban solas.
                      </p>
                    </fieldset>
                    <fieldset className="mt-5 space-y-2">
                      <legend className="mb-2 text-[0.6875rem] font-semibold text-slate-700">
                        Fichajes
                      </legend>
                      <label className="flex items-center gap-2 text-[0.625rem] text-slate-700">
                        <input
                          checked={rules.employeeSelfClockIn !== false}
                          className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                          id="employee-self-clock-in"
                          onChange={(event) => {
                            setRules((current) => ({ ...current, employeeSelfClockIn: event.target.checked }));
                            setNotice("");
                          }}
                          type="checkbox"
                        />
                        Los empleados registran su entrada y salida desde su panel
                      </label>
                      <p className="text-[0.6875rem] text-slate-500">
                        Si se desactiva, el botón "Registrar entrada" no aparece y solo el empleador carga los fichajes.
                      </p>
                    </fieldset>
                    <div className="mt-5 flex justify-end">
                      <button
                        aria-busy={savingRules}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[0.5625rem] font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60"
                        disabled={saving}
                        type="submit"
                      >
                        {savingRules && (
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
                          />
                        )}
                        {savingRules ? "Guardando reglas generales" : "Guardar reglas generales"}
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Régimen de vacaciones por antigüedad
                      </h3>
                      <p className="mt-1 text-[0.625rem] text-slate-500">
                        Días corridos concedidos de acuerdo con la antigüedad.
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="hr-data-table w-full min-w-[38.75rem] text-left text-xs">
                        <thead className="bg-[#edf4ff] text-[0.625rem] uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-4 py-3" scope="col">Tramo</th>
                            <th className="px-4 py-3" scope="col">Desde</th>
                            <th className="px-4 py-3" scope="col">Hasta</th>
                            <th className="px-4 py-3" scope="col">Días de vacaciones</th>
                            <th className="px-4 py-3 text-right" scope="col">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vacationRanges.map((range, index) => (
                            <tr className="hover:bg-slate-50" key={range.id}>
                              <td className="px-4 py-3 font-bold text-blue-800">
                                Tramo {index + 1}
                              </td>
                              <td className="px-4 py-3">{range.from} años</td>
                              <td className="px-4 py-3">
                                {range.to === null ? "Sin tope" : `${range.to} años`}
                              </td>
                              <td className="px-4 py-3">
                                <label className="inline-flex items-center gap-2">
                                  <span className="sr-only">
                                    Días de vacaciones para tramo {index + 1}
                                  </span>
                                  <input
                                    aria-label={`Días de vacaciones para tramo ${index + 1}`}
                                    className="w-14 rounded-md border border-slate-200 px-2 py-1 text-center text-xs font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    min="1"
                                    onChange={(event) =>
                                      updateVacationRangeDays(
                                        range.id,
                                        event.target.value,
                                      )
                                    }
                                    required
                                    type="number"
                                    value={range.days}
                                  />
                                  <span>días corridos</span>
                                </label>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  aria-label={`Eliminar tramo ${index + 1}`}
                                  className="text-slate-400 transition-colors hover:text-red-600"
                                  disabled={saving}
                                  onClick={() => {
                                    const updatedRanges = vacationRanges.filter(
                                      (item) => item.id !== range.id,
                                    );
                                    persistRules(
                                      { ...rules, vacationRanges: updatedRanges },
                                      "Tramo de vacaciones eliminado.",
                                    );
                                  }}
                                  type="button"
                                >
                                  <Icon
                                    className="h-4 w-4"
                                    path="M6 7h12m-10 0V5h8v2m-7 0v12m6-12v12M5 7l1 14h12l1-14"
                                  />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <form
                      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
                      onSubmit={addVacationRange}
                    >
                      <div className="grid grid-cols-3 items-end gap-3 sm:flex sm:flex-wrap">
                        <FormField
                          className={smallInputClassName}
                          label="Desde (años)"
                          min="0"
                          onChange={(event) =>
                            setNewRange((current) => ({
                              ...current,
                              from: event.target.value,
                            }))
                          }
                          required
                          type="number"
                          value={newRange.from}
                        />
                        <FormField
                          className={smallInputClassName}
                          label="Hasta (años)"
                          min="0"
                          onChange={(event) =>
                            setNewRange((current) => ({
                              ...current,
                              to: event.target.value,
                            }))
                          }
                          required
                          type="number"
                          value={newRange.to}
                        />
                        <FormField
                          className={smallInputClassName}
                          label="Días"
                          min="1"
                          onChange={(event) =>
                            setNewRange((current) => ({
                              ...current,
                              days: event.target.value,
                            }))
                          }
                          required
                          type="number"
                          value={newRange.days}
                        />
                      </div>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900"
                        type="submit"
                      >
                        <PlusIcon />
                        Añadir tramo
                      </button>
                    </form>
                  </div>
                  <div className="border-t border-slate-200 pt-6">
                    <SectionTitle>
                      Tipos de Turnos
                    </SectionTitle>
                <form
                  onSubmit={saveConfiguredShiftTypes}
                >
                  <p className="mb-4 text-[0.625rem] text-slate-500">
                    Configurá el nombre y el rango horario de cada turno. La
                    asignación semanal utiliza estos horarios.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="hr-data-table w-full min-w-[40.625rem] text-left text-xs">
                      <thead className="bg-[#edf4ff] text-[0.625rem] uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-4 py-3" scope="col">Tipo de turno</th>
                          <th className="px-4 py-3" scope="col">Desde</th>
                          <th className="px-4 py-3" scope="col">Hasta</th>
                          <th className="px-4 py-3 text-right" scope="col">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shiftTypes.map((shift) => (
                          <tr className="hover:bg-slate-50" key={shift.id}>
                            <td className="px-4 py-3">
                              <label className="sr-only" htmlFor={`shift-name-${shift.id}`}>
                                Nombre del turno
                              </label>
                              <input
                                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-[0.625rem] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id={`shift-name-${shift.id}`}
                                onChange={(event) =>
                                  updateShiftType(shift.id, "name", event.target.value)
                                }
                                required
                                value={shift.name}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <label className="sr-only" htmlFor={`shift-start-${shift.id}`}>
                                Hora de inicio
                              </label>
                              <TimeField
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-[0.625rem] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id={`shift-start-${shift.id}`}
                                onChange={(event) =>
                                  updateShiftType(shift.id, "start", event.target.value)
                                }
                                required
                                value={shift.start}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <label className="sr-only" htmlFor={`shift-end-${shift.id}`}>
                                Hora de finalización
                              </label>
                              <TimeField
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-[0.625rem] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id={`shift-end-${shift.id}`}
                                onChange={(event) =>
                                  updateShiftType(shift.id, "end", event.target.value)
                                }
                                required
                                value={shift.end}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                aria-label={`Eliminar ${shift.name}`}
                                className="text-slate-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={shiftTypes.length <= 1}
                                onClick={() => removeShiftType(shift.id)}
                                type="button"
                              >
                                <Icon
                                  className="h-4 w-4"
                                  path="M6 7h12m-10 0V5h8v2m-7 0v12m6-12v12M5 7l1 14h12l1-14"
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-bold text-slate-900">
                      Agregar tipo de turno
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        label="Nombre"
                        onChange={(event) =>
                          setNewShiftType((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                        value={newShiftType.name}
                      />
                      <FormField
                        label="Desde"
                        onChange={(event) =>
                          setNewShiftType((current) => ({
                            ...current,
                            start: event.target.value,
                          }))
                        }
                        required
                        type="time"
                        value={newShiftType.start}
                      />
                      <FormField
                        label="Hasta"
                        onChange={(event) =>
                          setNewShiftType((current) => ({
                            ...current,
                            end: event.target.value,
                          }))
                        }
                        required
                        type="time"
                        value={newShiftType.end}
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[0.5625rem] font-bold text-blue-800 transition-colors hover:bg-blue-100"
                        type="submit"
                      >
                        Guardar tipos de turnos
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900"
                        onClick={addShiftType}
                        type="button"
                      >
                        <PlusIcon />
                        Agregar tipo
                      </button>
                    </div>
                    <p className="text-[0.6875rem] text-slate-500">
                      Los tipos de turnos se guardan en la base de datos y están
                      disponibles al asignar horarios.
                    </p>
                  </div>
                </form>
                  </div>
                </div>
              </section>
            )}

            {isEmployer && (
              <section aria-label="Estructura de la empresa" className="mb-6">
                <SectionTitle icon="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01">
                  Estructura de la empresa
                </SectionTitle>
                <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-[0.625rem] text-slate-500">
                    Puestos, áreas y sucursales que se ofrecen al dar de alta o editar empleados.
                  </p>
                  <CompanyCatalogs />
                </div>
              </section>
            )}

            <section aria-label="Configuración de usuario">
              <SectionTitle icon="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m6-10a4 4 0 100-8 4 4 0 000 8zm7-5h6m-3-3v6">
                Datos de Usuario
              </SectionTitle>
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                {profilePhotoUrl ? (
                  <img
                    alt={`Foto de perfil de ${user.name}`}
                    className="h-16 w-16 rounded-full object-cover"
                    src={profilePhotoUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white"
                  >
                    {store.user?.initials}
                  </span>
                )}
                <div className="min-w-[12rem] flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Foto de perfil
                  </h3>
                  <p className="mt-1 text-[0.625rem] text-slate-500">
                    PNG, JPEG o WEBP. Se recorta en cuadrado y se ve en el menú y en las listas de tu empresa.
                  </p>
                </div>
                <input
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  onChange={updateProfilePhoto}
                  ref={profilePhotoInput}
                  type="file"
                />
                <div className="flex gap-2">
                  {profilePhotoUrl && (
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[0.5625rem] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                      disabled={uploadingPhoto}
                      onClick={deleteProfilePhoto}
                      type="button"
                    >
                      Quitar foto
                    </button>
                  )}
                  <button
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[0.5625rem] font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60"
                    disabled={uploadingPhoto}
                    onClick={() => profilePhotoInput.current?.click()}
                    type="button"
                  >
                    {uploadingPhoto ? "Guardando..." : profilePhotoUrl ? "Cambiar foto" : "Subir foto"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm lg:grid-cols-2">
                <form className="space-y-4" onSubmit={saveEmail}>
                  <div className="mb-5 flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 text-blue-700"
                      path="M4 6h16v12H4zM4 7l8 6 8-6"
                    />
                    <h3 className="text-sm font-bold text-slate-900">
                      Email de usuario
                    </h3>
                  </div>
                  <FormField
                    autoComplete="email"
                    label="Email"
                    readOnly
                    type="email"
                    value={email}
                  />
                  <p className="text-[0.625rem] text-slate-500">
                    Es tu usuario para ingresar y para recuperar la contraseña. Lo
                    modifica el empleador o el administrador del sistema.
                  </p>
                </form>

                <form className="space-y-4" onSubmit={updatePassword}>
                  <div className="mb-5 flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 text-blue-700"
                      path="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v4h8z"
                    />
                    <h3 className="text-sm font-bold text-slate-900">
                      Credenciales y Seguridad
                    </h3>
                  </div>
                  <FormField
                    autoComplete="current-password"
                    label="Contraseña actual"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    type="password"
                    value={currentPassword}
                  />
                  <FormField
                    autoComplete="new-password"
                    label="Nueva contraseña"
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    type="password"
                    value={newPassword}
                  />
                  <FormField
                    autoComplete="new-password"
                    label="Confirmar nueva contraseña"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    type="password"
                    value={confirmPassword}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs font-medium text-red-600" role="alert">
                      Las contraseñas no coinciden.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <PasswordRequirement valid={passwordRequirements.length}>
                      8+ caracteres
                    </PasswordRequirement>
                    <PasswordRequirement valid={passwordRequirements.symbol}>
                      1 símbolo
                    </PasswordRequirement>
                  </div>
                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                      className="rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900"
                      type="submit"
                    >
                      Actualizar contraseña
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Configuration({ userType = "employer" }) {
  if (userType === "admin") return <AdminConfiguration />;
  return <ParticipantConfiguration userType={userType} />;
}
