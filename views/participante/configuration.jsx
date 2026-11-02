import React, { useEffect, useRef, useState } from "react";
import { confirmDialog, promptDialog, toast } from "../../lib/feedback";
import { store } from "../../lib/store";
import CompanyCatalogs from "../../components/CompanyCatalogs";
import { removeProfilePhoto, updatePassword as changePassword, uploadProfilePhoto } from "../../lib/api";
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
      <input className={`${className} mt-2 block`} {...inputProps} />
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

export default function Configuration({ userType = "employer" }) {
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
    await persistRules({ ...rules, vacationRanges }, "Reglas guardadas. Se aplican a las solicitudes nuevas.");
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
                    <div className="mt-5 flex justify-end">
                      <button
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[0.5625rem] font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-60"
                        disabled={saving}
                        type="submit"
                      >
                        Guardar reglas generales
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
                        className="rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900"
                        type="submit"
                      >
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
                              <input
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-[0.625rem] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id={`shift-start-${shift.id}`}
                                onChange={(event) =>
                                  updateShiftType(shift.id, "start", event.target.value)
                                }
                                required
                                type="time"
                                value={shift.start}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <label className="sr-only" htmlFor={`shift-end-${shift.id}`}>
                                Hora de finalización
                              </label>
                              <input
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-[0.625rem] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id={`shift-end-${shift.id}`}
                                onChange={(event) =>
                                  updateShiftType(shift.id, "end", event.target.value)
                                }
                                required
                                type="time"
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
                        className="rounded-lg bg-blue-800 px-3.5 py-1.5 text-[0.5625rem] font-bold text-white transition-colors hover:bg-blue-900"
                        onClick={addShiftType}
                        type="button"
                      >
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
