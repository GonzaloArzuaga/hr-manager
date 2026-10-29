import React from "react";
import { store } from "../lib/store";
import { signOut } from "../lib/api";
import NotificationBell from "./NotificationBell";

const navigationItems = [
  {
    label: "Inicio",
    admin: "/admin",
    path: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    label: "Empresas",
    admin: "/admin/empresas",
    path: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  },
  {
    label: "Inicio",
    employer: "/employer",
    employee: "/employee",
    path: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    label: "Horarios",
    employer: "/employer/horarios",
    employee: "/employee/horarios",
    path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    label: "Fichajes",
    employer: "/employer/fichajes",
    filled: true,
    path: "M80-40v-80h800v80H80Zm80-120v-240q-33-54-51-114.5T91-638q0-61 15.5-120T143-874q8-21 26-33.5t40-12.5q31 0 53 21t18 50l-11 91q-6 48 8.5 91t43.5 75.5q29 32.5 70 52t89 19.5q60 0 120.5 12.5T706-472q45 23 69.5 58.5T800-326v166H160Zm80-80h480v-86q0-24-12-42.5T674-398q-41-20-95-31t-99-11q-66 0-122.5-27t-96-72.5Q222-585 202-644.5T190-768q-10 30-14.5 64t-4.5 66q0 58 20.5 111.5T240-422v182Zm127-367q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47Zm169.5-56.5Q560-687 560-720t-23.5-56.5Q513-800 480-800t-56.5 23.5Q400-753 400-720t23.5 56.5Q447-640 480-640t56.5-23.5ZM320-160v-37q0-67 46.5-115T480-360h160v80H480q-34 0-57 24.5T400-197v37h-80Zm160-80Zm0-480Z",
  },
  {
    label: "Francos",
    employer: "/employer/francos",
    employee: "/employee/francos",
    path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    label: "Vacaciones",
    employer: "/employer/vacaciones",
    employee: "/employee/vacaciones",
    path: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    label: "Empleados",
    employer: "/employer/empleados",
    path: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    label: "Sueldos",
    employer: "/employer/sueldos",
    employee: "/employee/sueldos",
    path: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    label: "Estadísticas",
    employer: "/employer/estadisticas",
    filled: true,
    path: "M280-280h80v-280h-80v280Zm160 0h80v-400h-80v400Zm160 0h80v-160h-80v160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z",
  },
  {
    label: "Configuración",
    admin: "/admin/configuracion",
    employer: "/employer/configuration",
    employee: "/employee/configuration",
    aliases: ["/configuracion"],
    path: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    innerPath: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

export function SidebarIcon({ path, innerPath, filled = false, className = "" }) {
  // Íconos de Material Symbols: relleno y con su propia grilla de 960 unidades
  if (filled) {
    return (
      <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 -960 960 960">
        <path d={path} />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      {innerPath && <path d={innerPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />}
    </svg>
  );
}

export function UserAvatar({ className = "h-6 w-6 text-[0.5625rem]" }) {
  const avatarUrl = store.user?.avatarUrl;
  if (avatarUrl) {
    return (
      <img
        alt={store.user?.name ?? ""}
        className={`shrink-0 rounded-full object-cover ring-1 ring-slate-700 ${className}`}
        src={avatarUrl}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white ring-1 ring-slate-700 ${className}`}
    >
      {store.user?.initials}
    </span>
  );
}

// Menú lateral de las pantallas con sesión. En escritorio queda fijo a la
// izquierda; en tablet y celular se muestra como cajón desplegable
// (variant="drawer") desde la barra superior.
export default function Sidebar({ activePath = "", variant = "desktop", onClose }) {
  const role = store.role ?? (store.isEmployer ? "employer" : "employee");
  const items = navigationItems.filter((item) => item[role] && item.label !== "Configuración");
  const configurationItem = navigationItems.find((item) => item.label === "Configuración" && item[role]);
  const isDrawer = variant === "drawer";

  return (
    <aside
      className={`flex flex-col justify-between overflow-y-auto select-none bg-[#223247] text-slate-300 ${
        isDrawer
          ? "h-full w-72 max-w-[85vw]"
          : "sticky top-0 h-screen w-[11.5625rem] shrink-0 self-start border-r border-[#1e293b]"
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar className={isDrawer ? "h-9 w-9 text-xs" : "h-6 w-6 text-[0.5625rem]"} />
            <div className="flex min-w-0 flex-col">
              <span
                className={`truncate font-semibold leading-tight tracking-tight text-white ${
                  isDrawer ? "text-sm" : "text-[0.6875rem]"
                }`}
              >
                {store.user?.name ?? ""}
              </span>
              <span className={`truncate text-slate-400 ${isDrawer ? "text-xs" : "text-[0.5625rem]"}`}>
                {store.user?.role ?? ""}
              </span>
            </div>
          </div>
          {!isDrawer && role !== "admin" && <NotificationBell />}
          {isDrawer && (
            <button
              aria-label="Cerrar menú"
              className="rounded-md p-2 text-slate-300 transition-colors hover:bg-[#2b3a50] hover:text-white"
              onClick={onClose}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          )}
        </div>

        <nav aria-label="Navegación principal" className={`space-y-0.5 pt-3 ${isDrawer ? "px-2" : "px-1"}`}>
          <p
            className={`mb-1 px-2 font-bold uppercase tracking-wider text-slate-400/80 ${
              isDrawer ? "text-[0.625rem]" : "text-[0.5rem]"
            }`}
          >
            Módulos Principales
          </p>
          {items.map((item) => {
            const href = item[role];
            const isActive = activePath === href || (item.aliases ?? []).includes(activePath);
            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center rounded-md font-medium transition-colors ${
                  isDrawer ? "px-3 py-2.5 text-sm" : "px-2 py-1.5 text-[0.6875rem]"
                } ${
                  isActive
                    ? "bg-[#3b475e] text-white shadow-sm"
                    : "text-slate-300 hover:bg-[#2b3a50] hover:text-slate-100"
                }`}
                href={href}
                key={item.label}
                onClick={onClose}
              >
                <SidebarIcon
                  className={`${isDrawer ? "mr-3 h-5 w-5" : "mr-2 h-3.5 w-3.5"} ${
                    isActive ? "text-white" : "text-slate-300 group-hover:text-slate-200"
                  }`}
                  filled={item.filled}
                  innerPath={item.innerPath}
                  path={item.path}
                />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-700/50 p-3">
        {configurationItem && (() => {
          const href = configurationItem[role];
          const isActive = activePath === href || (configurationItem.aliases ?? []).includes(activePath);
          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={`group mb-1 flex w-full items-center rounded-lg font-medium transition-colors ${
                isDrawer ? "px-3 py-2 text-sm" : "px-2 py-1 text-[0.625rem]"
              } ${
                isActive
                  ? "bg-[#3b475e] text-white"
                  : "text-slate-300 hover:bg-[#2b3a50] hover:text-white"
              }`}
              href={href}
              onClick={onClose}
            >
              <SidebarIcon
                className={`${isDrawer ? "mr-3 h-5 w-5" : "mr-2 h-3.5 w-3.5"} ${
                  isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}
                innerPath={configurationItem.innerPath}
                path={configurationItem.path}
              />
              <span>{configurationItem.label}</span>
            </a>
          );
        })()}
        <button
          className={`group flex w-full items-center rounded-lg font-medium text-slate-300 transition-colors hover:text-white ${
            isDrawer ? "px-3 py-2 text-sm" : "px-2 py-1 text-[0.625rem]"
          }`}
          onClick={signOut}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={`${isDrawer ? "mr-3 h-5 w-5" : "mr-2 h-3.5 w-3.5"} text-slate-300 group-hover:text-white`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export { navigationItems };
