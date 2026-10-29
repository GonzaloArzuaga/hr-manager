// Notificaciones del usuario. Las crea la base de datos; acá se leen, se
// marcan como leídas y se escuchan las nuevas en tiempo real (con una
// consulta cada minuto como respaldo).

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { store } from "./store";

const POLL_MS = 60000;
const state = { items: [], unread: 0, loaded: false };
const listeners = new Set();
let timer = null;
let channel = null;
let watchingAccountId = null;

function emit() {
  const snapshot = { ...state };
  listeners.forEach((listener) => listener(snapshot));
}

export async function loadNotifications() {
  if (!store.account?.id) return;
  const [list, count] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (list.error || count.error) return;
  state.items = list.data ?? [];
  state.unread = count.count ?? 0;
  state.loaded = true;
  emit();
}

export async function markNotificationRead(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item || item.read_at) return;
  item.read_at = new Date().toISOString();
  state.unread = Math.max(0, state.unread - 1);
  emit();
  await supabase.from("notifications").update({ read_at: item.read_at }).eq("id", id);
}

export async function markAllNotificationsRead() {
  const now = new Date().toISOString();
  state.items.forEach((item) => {
    if (!item.read_at) item.read_at = now;
  });
  state.unread = 0;
  emit();
  await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
}

// Empieza a seguir las notificaciones de la cuenta con sesión
export function watchNotifications() {
  const accountId = store.account?.id;
  if (!accountId || store.role === "admin") return;
  if (watchingAccountId === accountId) return;
  stopNotifications();
  watchingAccountId = accountId;
  loadNotifications();
  timer = window.setInterval(loadNotifications, POLL_MS);
  try {
    channel = supabase
      .channel(`notifications-${accountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_account_id=eq.${accountId}` },
        () => loadNotifications(),
      )
      .subscribe();
  } catch {
    channel = null;
  }
}

export function stopNotifications() {
  if (timer) window.clearInterval(timer);
  timer = null;
  if (channel) supabase.removeChannel(channel);
  channel = null;
  watchingAccountId = null;
  state.items = [];
  state.unread = 0;
  state.loaded = false;
  emit();
}

export function useNotifications() {
  const [snapshot, setSnapshot] = useState({ ...state });
  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot({ ...state });
    return () => listeners.delete(setSnapshot);
  }, []);
  return snapshot;
}

export function timeAgo(timestamp) {
  const seconds = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "recién";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  return new Date(timestamp).toLocaleDateString("es-AR");
}
