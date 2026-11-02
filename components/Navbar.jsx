import React, { useEffect, useState } from "react";

const defaultLinks = [
  { href: "/home", label: "Inicio" },
  { href: "/about", label: "Sobre Nosotros" },
  { href: "/price", label: "Precios" },
];

// Barra superior de las páginas públicas. En celular y tablet chica los
// enlaces se agrupan en un menú desplegable.
export default function Navbar({
  brandHref = "/home",
  actionHref = "/login",
  actionLabel = "Ingresar",
  actionVariant = "button",
  loginHref = "/login",
  links = defaultLinks,
}) {
  const [open, setOpen] = useState(false);
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const actionTarget = actionVariant === "link" ? actionHref : loginHref;
  const isCurrent = ({ current, href }) => current ?? href === path;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <a
          aria-label="HRManager, inicio"
          className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-blue-800"
          href={brandHref}
          onClick={() => setOpen(false)}
        >
          <img
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain"
            src="/logo3.png"
          />
          <span>HRManager</span>
        </a>
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-5 text-xs font-medium text-slate-600 md:flex"
        >
          {links.map((link) => (
            <a
              aria-current={isCurrent(link) ? "page" : undefined}
              className={
                isCurrent(link) ? "font-semibold text-blue-800" : "transition-colors hover:text-blue-700"
              }
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            className={`hidden h-9 w-[6.5rem] items-center justify-center rounded-lg px-5 py-2 text-sm transition-colors sm:inline-flex ${
              actionVariant === "link"
                ? "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                : "bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800"
            }`}
            href={actionTarget}
          >
            {actionLabel}
          </a>
          <button
            aria-controls="menu-publico"
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Menú desplegable para celular */}
      <div
        className={`grid overflow-hidden border-slate-100 bg-white transition-[grid-template-rows] duration-200 md:hidden ${
          open ? "grid-rows-[1fr] border-t" : "grid-rows-[0fr]"
        }`}
        id="menu-publico"
        inert={open ? undefined : ""}
      >
        <nav aria-label="Navegación móvil" className="min-h-0">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => (
              <a
                aria-current={isCurrent(link) ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isCurrent(link) ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50"
                }`}
                href={link.href}
                key={link.label}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              className="mt-2 flex h-11 items-center justify-center rounded-lg bg-blue-700 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 sm:hidden"
              href={actionTarget}
              onClick={() => setOpen(false)}
            >
              {actionLabel}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
