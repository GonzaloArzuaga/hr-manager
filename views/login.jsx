import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { signIn } from "../lib/api";

export default function Login() {
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password"));

    setSubmitting(true);
    setNotice("");
    try {
      await signIn(email, password);
      // La página de login detecta la sesión y lleva al panel que corresponde
      // (o al cambio de contraseña provisoria, si hace falta).
      window.location.assign("/login");
    } catch (error) {
      setNotice(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#edf2f7] font-sans text-slate-800 antialiased">
      <Navbar
        actionHref="/"
        actionLabel="← Volver"
        actionVariant="link"
        brandHref="/home"
      />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <h1 className="mb-5 text-center text-[1.375rem] font-bold tracking-tight text-[#1e293b]">
          Inicio de Sesión
        </h1>
        <div className="w-full max-w-[19.375rem] rounded-xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-1.5 block text-[0.625rem] font-semibold text-slate-700"
                htmlFor="email"
              >
                Email
              </label>
              <input
                autoComplete="username"
                className="h-[1.9375rem] w-full rounded-md border border-slate-200 px-2.5 text-[0.625rem] text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                id="email"
                name="email"
                onChange={() => setNotice("")}
                placeholder="ejemplo@mail.com"
                required
                type="email"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-[0.625rem] font-semibold text-slate-700"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="h-[1.9375rem] w-full rounded-md border border-slate-200 px-2.5 pr-16 text-[0.625rem] tracking-widest text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  id="password"
                  name="password"
                  onChange={() => setNotice("")}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-2 flex items-center text-[0.5625rem] font-semibold text-blue-700 hover:text-blue-900"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-0.5">
              <a
                className="text-[0.625rem] font-medium text-blue-600 transition-colors hover:text-blue-700"
                href="/login/recover"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <button
              className="h-8 w-full rounded-md bg-[#1e293b] px-4 text-[0.625rem] font-medium text-white shadow-sm transition-colors hover:bg-[#17223b] active:bg-[#0f172a] disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
            {notice && (
              <p
                aria-live="polite"
                className="text-[0.625rem] leading-relaxed text-red-700"
                role="status"
              >
                {notice}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
