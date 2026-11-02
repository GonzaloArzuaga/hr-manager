import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PasswordForm from "../components/PasswordForm";
import { supabase } from "../lib/supabaseClient";
import { updatePassword } from "../lib/api";
import { loadAccount } from "../lib/store";

// Destino del enlace de recuperación que llega por email (RF-08).
// Supabase valida el enlace (vigencia de 1 hora, un solo uso) y abre una
// sesión temporal que permite definir la nueva contraseña.
export default function NuevaContrasenia() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) setStatus("ready");
    });
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get("error")) {
      setStatus("invalid");
    } else {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (sessionData.session) setStatus("ready");
        else setTimeout(() => setStatus((current) => (current === "checking" ? "invalid" : current)), 2500);
      });
    }
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(password) {
    await loadAccount();
    await updatePassword(password);
    await supabase.auth.signOut();
    setStatus("done");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#edf2f7] font-sans text-slate-800 antialiased">
      <Navbar actionHref="/login" actionLabel="← Volver" actionVariant="link" brandHref="/home" />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <h1 className="mb-5 text-center text-[1.375rem] font-bold tracking-tight text-[#1e293b]">
          Restablecer contraseña
        </h1>
        <div className="w-full max-w-[19.375rem] rounded-xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          {status === "checking" && <p className="text-center text-[0.6875rem] text-slate-500">Validando el enlace…</p>}
          {status === "invalid" && (
            <div className="space-y-3 text-center text-[0.6875rem] text-slate-600">
              <p>El enlace venció o ya fue utilizado.</p>
              <a className="font-semibold text-blue-700" href="/login/recover">Pedir un enlace nuevo</a>
            </div>
          )}
          {status === "ready" && <PasswordForm onSubmit={handleSubmit} />}
          {status === "done" && (
            <div className="space-y-3 text-center text-[0.6875rem] text-slate-600">
              <p>Tu contraseña se actualizó correctamente.</p>
              <a className="font-semibold text-blue-700" href="/login">Ir al inicio de sesión</a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
