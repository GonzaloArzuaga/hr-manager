// Avisos breves (toasts) y ventanas de confirmación o de respuesta propias del
// sitio, en lugar de los cuadros del navegador. Las dibuja FeedbackHost.

import { useEffect, useState } from "react";

const state = { toasts: [], dialog: null };
const listeners = new Set();
let nextId = 1;

function emit() {
  const snapshot = { toasts: [...state.toasts], dialog: state.dialog };
  listeners.forEach((listener) => listener(snapshot));
}

function push(type, message, duration = 4500) {
  if (!message) return;
  const id = nextId++;
  // Los avisos informativos (por ejemplo, "Empleado seleccionado") se reemplazan entre sí
  const kept = type === "info" ? state.toasts.filter((toast) => toast.type !== "info") : state.toasts;
  state.toasts = [...kept, { id, type, message }].slice(-4);
  emit();
  window.setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id) {
  state.toasts = state.toasts.filter((toast) => toast.id !== id);
  emit();
}

export const toast = {
  success: (message) => push("success", message),
  error: (message) => push("error", message, 6500),
  info: (message) => push("info", message, 3500),
};

function openDialog(dialog) {
  return new Promise((resolve) => {
    state.dialog = { ...dialog, resolve };
    emit();
  });
}

export function closeDialog(value) {
  const dialog = state.dialog;
  state.dialog = null;
  emit();
  dialog?.resolve(value);
}

// Pregunta de sí o no. Devuelve true si la persona confirma.
export function confirmDialog({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "primary" }) {
  return openDialog({ kind: "confirm", title, message, confirmLabel, cancelLabel, tone });
}

// Pide un texto, por ejemplo el motivo de un rechazo. Devuelve el texto o null si se cancela.
export function promptDialog({
  title,
  message,
  label = "Respuesta",
  placeholder = "",
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  required = false,
  tone = "primary",
  multiline = true,
}) {
  return openDialog({ kind: "prompt", title, message, label, placeholder, confirmLabel, cancelLabel, required, tone, multiline });
}

export function useFeedback() {
  const [snapshot, setSnapshot] = useState({ toasts: state.toasts, dialog: state.dialog });
  useEffect(() => {
    listeners.add(setSnapshot);
    return () => listeners.delete(setSnapshot);
  }, []);
  return snapshot;
}
