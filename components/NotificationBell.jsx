import React, { useEffect, useRef, useState } from "react";
import { navigate } from "../lib/router";
import {
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
  useNotifications,
} from "../lib/notifications";

const kindStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  requested: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  payroll: "bg-indigo-100 text-indigo-700",
  other: "bg-slate-100 text-slate-600",
};

function styleFor(kind = "") {
  if (kind.endsWith("approved")) return kindStyles.approved;
  if (kind.endsWith("rejected") || kind.endsWith("cancelled") || kind.endsWith("removed")) return kindStyles.rejected;
  if (kind.endsWith("requested")) return kindStyles.requested;
  if (kind.startsWith("payroll")) return kindStyles.payroll;
  if (kind.endsWith("assigned")) return kindStyles.assigned;
  return kindStyles.other;
}

function BellIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

// Campana con el contador de no leídas y la lista desplegable
export default function NotificationBell({ size = "sm" }) {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(window.innerWidth - 16, 360);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      setPosition({ top: rect.bottom + 8, left, width });
    }
    function onPointer(event) {
      if (!panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    place();
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(item) {
    markNotificationRead(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        className="relative rounded-md p-1.5 text-slate-300 transition-colors hover:bg-[#2b3a50] hover:text-white"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        title="Notificaciones"
        type="button"
      >
        <BellIcon className={iconSize} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.5rem] font-bold leading-none text-white ring-2 ring-[#223247]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && position && (
        <div
          aria-label="Notificaciones"
          className="fixed z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
          ref={panelRef}
          role="dialog"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
            <p className="text-xs font-bold text-slate-900">Notificaciones</p>
            {unread > 0 && (
              <button
                className="text-[0.5625rem] font-semibold text-blue-700 hover:underline"
                onClick={markAllNotificationsRead}
                type="button"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={`flex w-full gap-2.5 border-b border-slate-50 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                    item.read_at ? "" : "bg-blue-50/50"
                  }`}
                  onClick={() => openItem(item)}
                  type="button"
                >
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${styleFor(item.kind)}`}>
                    <BellIcon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-[0.625rem] ${item.read_at ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>
                        {item.title}
                      </span>
                      {!item.read_at && <span aria-label="Sin leer" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                    </span>
                    {item.body && <span className="mt-0.5 block text-[0.5625rem] leading-snug text-slate-500">{item.body}</span>}
                    <span className="mt-1 block text-[0.5rem] text-slate-400">{timeAgo(item.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-3.5 py-8 text-center text-[0.625rem] text-slate-500">No tenés notificaciones.</li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
