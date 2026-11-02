import React from "react";
import Navbar from "../components/Navbar";
import PasswordForm from "../components/PasswordForm";
import { signOut, updatePassword } from "../lib/api";
import { store } from "../lib/store";

// RF-03: en el primer ingreso el empleado debe reemplazar la contraseña
// provisoria. Hasta que lo haga, no puede acceder a ninguna otra pantalla.
export default function ChangeTemporaryPassword() {
  const name = store.account?.display_name?.split(" ")[0];

  async function handleSubmit(password) {
    await updatePassword(password);
    window.location.assign(store.account?.role === "employer" ? "/employer" : "/employee");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#edf2f7] font-sans text-slate-800 antialiased">
      <Navbar brandHref="/home" />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <h1 className="mb-2 text-center text-[1.375rem] font-bold tracking-tight text-[#1e293b]">
          Creá tu contraseña
        </h1>
        <p className="mb-5 max-w-[19.375rem] text-center text-[0.6875rem] leading-relaxed text-slate-600">
          {name ? `${name}, antes` : "Antes"} de continuar tenés que reemplazar la contraseña
          provisoria que te entregó tu empleador.
        </p>
        <div className="w-full max-w-[19.375rem] rounded-xl border border-slate-100 bg-white p-7 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <PasswordForm onSubmit={handleSubmit} submitLabel="Guardar y continuar" />
          <button
            className="mt-3 w-full text-center text-[0.625rem] text-slate-500 hover:text-slate-800"
            onClick={signOut}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}
