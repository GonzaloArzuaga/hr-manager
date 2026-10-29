import React from "react";

const defaultLinks = [
  // { href: "/aviso-legal", label: "Aviso legal" },
  // { href: "/privacidad", label: "Privacidad" },
  // { href: "/cookies", label: "Cookies" },
];

export default function Footer({
  id = "pie-de-pagina",
  links = defaultLinks,
  year = new Date().getFullYear(),
}) {
  return (
    <footer
      className="border-t border-slate-200/80 bg-[#f1f5f9] py-4"
      id={id}
    >
      <div
        className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-xs text-slate-500 sm:px-6 md:flex-row lg:px-10"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[0.8125rem] font-bold text-slate-800">
            HRManager
          </span>
        </div>
        <p className="text-center">
          © {year} HRManager. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-5">
          {links.map(({ href, label }) => (
            <a
              className="transition-colors hover:text-blue-700"
              href={href}
              key={label}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
