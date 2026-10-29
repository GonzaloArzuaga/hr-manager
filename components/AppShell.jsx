import React, { useEffect, useState } from "react";
import Sidebar, { navigationItems, UserAvatar } from "./Sidebar";
import { store } from "../lib/store";
import { watchNotifications } from "../lib/notifications";
import NotificationBell from "./NotificationBell";

// Marco de las pantallas con sesión: el menú queda montado y solo cambia el
// contenido. En pantallas de menos de 1024 px el menú se abre desde la barra
// superior como un cajón.
export default function AppShell({ path, loading, children }) {
  const [open, setOpen] = useState(false);
  const role = store.role ?? (store.isEmployer ? "employer" : "employee");
  const current = navigationItems.find(
    (item) => item[role] === path || (item.aliases ?? []).includes(path),
  );

  // Notificaciones de la cuenta con sesión
  useEffect(() => watchNotifications(), []);

  // Redibuja el menú cuando cambia la foto o el nombre del usuario
  const [, setProfileVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setProfileVersion((value) => value + 1);
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, []);

  // Cierra el cajón al cambiar de sección
  useEffect(() => setOpen(false), [path]);

  // Mientras el cajón está abierto: Escape lo cierra y la página no se desplaza
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-[#f5f7ff] font-sans">
      <div className="hidden lg:block">
        <Sidebar activePath={path} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-[#223247] px-3 text-white shadow-md lg:hidden">
          <button
            aria-controls="menu-lateral"
            aria-expanded={open}
            aria-label="Abrir menú"
            className="rounded-md p-2 transition-colors hover:bg-[#2b3a50]"
            onClick={() => setOpen(true)}
            type="button"
          >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">HRManager</p>
            <p className="truncate text-sm font-semibold">{current?.label ?? ""}</p>
          </div>
          {role !== "admin" && <NotificationBell size="lg" />}
          <UserAvatar className="h-8 w-8 text-[0.6875rem]" />
        </header>

        {loading && (
          <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-blue-100">
            <div className="h-full w-1/3 animate-[shell-progress_1s_ease-in-out_infinite] bg-blue-600" />
          </div>
        )}

        <div className="min-w-0 flex-1" aria-busy={loading || undefined}>
          {children}
        </div>
      </div>

      {/* Cajón para tablet y celular */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        id="menu-lateral"
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-200 ease-out ${
            open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
          inert={open ? undefined : ""}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          <Sidebar activePath={path} onClose={() => setOpen(false)} variant="drawer" />
        </div>
      </div>
    </div>
  );
}
