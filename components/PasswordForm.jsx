import React, { useState } from "react";
import { passwordProblems } from "../lib/api";

function Requirement({ valid, children }) {
  return (
    <li className={`flex items-center gap-1.5 ${valid ? "text-emerald-700" : "text-slate-500"}`}>
      <span aria-hidden="true">{valid ? "✓" : "•"}</span>
      {children}
    </li>
  );
}

const inputClassName =
  "h-[1.9375rem] w-full rounded-md border border-slate-200 px-2.5 text-[0.625rem] text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

// Formulario de nueva contraseña con la política del RNF-03:
// al menos 8 caracteres y un carácter especial.
export default function PasswordForm({ onSubmit, submitLabel = "Guardar contraseña" }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problems = passwordProblems(password);
    if (problems.length) {
      setError(`La contraseña debe ${problems.join(" y ")}.`);
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(submitError.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3.5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-[0.625rem] font-semibold text-slate-700" htmlFor="new-password">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            autoComplete="new-password"
            className={`${inputClassName} pr-16`}
            id="new-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-2 flex items-center text-[0.5625rem] font-semibold text-blue-700 hover:text-blue-900"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <ul className="mt-1.5 space-y-0.5 text-[0.5625rem]">
          <Requirement valid={password.length >= 8}>Al menos 8 caracteres</Requirement>
          <Requirement valid={/[^A-Za-z0-9]/.test(password)}>Al menos un carácter especial</Requirement>
        </ul>
      </div>
      <div>
        <label className="mb-1.5 block text-[0.625rem] font-semibold text-slate-700" htmlFor="confirm-password">
          Repetí la contraseña
        </label>
        <input
          autoComplete="new-password"
          className={inputClassName}
          id="confirm-password"
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError("");
          }}
          required
          type={showPassword ? "text" : "password"}
          value={confirmation}
        />
      </div>
      <button
        className="h-8 w-full rounded-md bg-[#1e293b] px-4 text-[0.625rem] font-medium text-white shadow-sm transition-colors hover:bg-[#17223b] disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Guardando…" : submitLabel}
      </button>
      {error && (
        <p aria-live="polite" className="text-[0.625rem] leading-relaxed text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
