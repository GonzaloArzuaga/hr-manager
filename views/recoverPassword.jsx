import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { sendPasswordReset } from "../lib/api";

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    key: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
    mail: "M3 5h18v14H3zM3 6l9 7 9-7",
    check: "M5 12l4 4L19 6",
    info: "M12 8h.01M11 12h1v4h1m8-4a9 9 0 11-18 0 9 9 0 0118 0z",
    arrow: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18",
    refresh: "M20 7v5h-5M4 17v-5h5m-3.5-2A7 7 0 0118 7l2 5M4 12l2 5a7 7 0 0012.5-3",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  };

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
      <path d={paths[name]} />
    </svg>
  );
}

export default function RecoverPassword() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [notice, setNotice] = useState("");

  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setNotice("");
    try {
      await sendPasswordReset(email);
      setEmailSent(true);
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await send();
  }

  async function handleResend() {
    if (await send()) setNotice("Te reenviamos el correo de recuperación.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#edf2f7] font-sans text-slate-800">
      <Navbar
        actionHref="/login"
        actionLabel="← Volver"
        actionVariant="link"
        brandHref="/home"
      />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <section
          aria-labelledby="recovery-title"
          className="w-full max-w-[24.375rem] rounded-2xl border border-slate-200/70 bg-white/40 p-5 shadow-sm sm:p-7"
        >
        {emailSent ? (
          <div className="flex flex-col items-center text-center">
            <span className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-800">
              <Icon className="h-6 w-6" name="mail" />
              <span className="absolute ml-9 mt-8 flex h-4 w-4 items-center justify-center rounded-full bg-blue-800 text-white">
                <Icon className="h-2.5 w-2.5" name="check" />
              </span>
            </span>
            <h1
              className="text-base font-bold tracking-tight text-[#1e293b]"
              id="recovery-title"
            >
              Revisá tu correo
            </h1>
            <p className="mt-2 max-w-[18.125rem] text-[0.6875rem] leading-relaxed text-slate-600">
              Si el email corresponde a una cuenta activa, te enviamos un enlace
              para restablecer tu contraseña a:
            </p>
            <div className="my-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[0.6875rem] font-medium text-slate-700">
              <Icon className="h-3.5 w-3.5 shrink-0 text-blue-800" name="mail" />
              <span className="break-all">{email}</span>
            </div>
            <div className="flex w-full items-start gap-2 rounded-lg bg-slate-100/80 p-3 text-left">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                name="info"
              />
              <div>
                <p className="text-[0.625rem] font-semibold text-slate-700">
                  ¿No encuentras el mensaje?
                </p>
                <p className="mt-1 text-[0.5625rem] leading-relaxed text-slate-600">
                  Revisá tu bandeja de entrada y la carpeta de spam. El enlace
                  se puede usar una sola vez.
                </p>
              </div>
            </div>
            {notice && (
              <p
                aria-live="polite"
                className="mt-3 w-full text-left text-[0.5625rem] leading-relaxed text-amber-800"
                role="status"
              >
                {notice}
              </p>
            )}
            <div className="mt-4 w-full space-y-2">
              <a
                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.625rem] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/login"
              >
                <Icon className="h-3 w-3" name="arrow" />
                Volver al Inicio de Sesión
              </a>
              <button
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.625rem] font-medium text-blue-800 transition-colors hover:bg-blue-50"
                onClick={handleResend}
                type="button"
              >
                <Icon className="h-3 w-3" name="refresh" />
                ¿No lo recibiste? Reenviar correo
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-200/70 pt-3 text-center text-[0.5625rem] text-slate-500">
              <Icon className="h-3 w-3 shrink-0" name="clock" />
              <span>Por seguridad, el enlace expira en 1 hora.</span>
            </div>
            <p className="mt-4 text-[0.5625rem] text-slate-500">
              ¿Necesitas ayuda?{" "}
              <a
                className="font-medium text-blue-800 hover:underline"
                href="mailto:soporte@hrmanager.com.ar"
              >
                Contacta a soporte
              </a>
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-blue-800">
                <Icon className="h-5 w-5" name="key" />
              </span>
            </div>
            <div className="mb-4 text-center">
              <h1
                className="text-[0.8125rem] font-bold tracking-tight text-[#1e293b]"
                id="recovery-title"
              >
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mx-auto mt-1.5 max-w-[18.125rem] text-[0.5625rem] leading-relaxed text-slate-600">
                Ingresá el correo electrónico asociado a tu cuenta corporativa
                y te enviaremos las instrucciones para restablecer tu acceso.
              </p>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label
                  className="mb-1 flex items-center justify-between text-[0.5625rem] font-semibold text-slate-700"
                  htmlFor="corporate-email"
                >
                  <span>Email corporativo</span>
                  <span className="font-normal text-slate-500">Requerido</span>
                </label>
                <div className="relative">
                  <Icon
                    className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
                    name="mail"
                  />
                  <input
                    autoComplete="email"
                    className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-[0.5625rem] text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    id="corporate-email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ejemplo@mail.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>
              <button
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#1e293b] px-3 text-[0.5625rem] font-semibold text-white shadow-sm transition-colors hover:bg-[#17223b] active:bg-[#0f172a] disabled:opacity-60"
                disabled={sending}
                type="submit"
              >
                {sending ? "Enviando…" : "Enviar instrucciones"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            {notice && !emailSent && (
              <p aria-live="polite" className="mt-2 text-[0.5625rem] text-rose-700" role="alert">
                {notice}
              </p>
            )}
            <div className="mt-3 text-center">
              <a
                className="inline-flex items-center gap-1.5 text-[0.5625rem] font-medium text-slate-700 transition-colors hover:text-blue-800"
                href="/login"
              >
                <Icon className="h-3 w-3" name="arrow" />
                ¿Recordaste tu contraseña? Volver a Iniciar Sesión
              </a>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-200/70 pt-3 text-center text-[0.5625rem] text-slate-500">
              <Icon className="h-3 w-3 shrink-0" name="clock" />
              <span>Por seguridad, el enlace expira en 1 hora.</span>
            </div>
          </div>
        )}
        </section>
      </main>
    </div>
  );
}
