import React, { useEffect, useRef, useState } from "react";
import { closeDialog, dismissToast, useFeedback } from "../lib/feedback";

const toastStyles = {
  success: { box: "border-emerald-200 bg-white", icon: "bg-emerald-100 text-emerald-700", path: "M5 13l4 4L19 7" },
  error: { box: "border-red-200 bg-white", icon: "bg-red-100 text-red-700", path: "M6 18L18 6M6 6l12 12" },
  info: { box: "border-blue-200 bg-white", icon: "bg-blue-100 text-blue-700", path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
};

function Dialog({ dialog }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const fieldRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    setValue("");
    setError("");
    window.setTimeout(() => (fieldRef.current ?? confirmRef.current)?.focus(), 0);
    const onKey = (event) => event.key === "Escape" && closeDialog(dialog.kind === "prompt" ? null : false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  function submit(event) {
    event.preventDefault();
    if (dialog.kind === "confirm") {
      closeDialog(true);
      return;
    }
    const text = value.trim();
    if (dialog.required && !text) {
      setError("Este dato es obligatorio.");
      return;
    }
    closeDialog(text);
  }

  const danger = dialog.tone === "danger";
  const Field = dialog.multiline ? "textarea" : "input";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && closeDialog(dialog.kind === "prompt" ? null : false)}
    >
      <form
        aria-labelledby="feedback-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-4 shadow-2xl sm:p-5"
        onSubmit={submit}
        role="dialog"
      >
        <h2 className="text-sm font-bold text-slate-900" id="feedback-dialog-title">{dialog.title}</h2>
        {dialog.message && <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-slate-600">{dialog.message}</p>}
        {dialog.kind === "prompt" && (
          <label className="mt-3 block text-[0.6875rem] font-semibold text-slate-700">
            {dialog.label}
            {dialog.required && <span className="text-red-600"> *</span>}
            <Field
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[0.625rem] font-normal text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              placeholder={dialog.placeholder}
              ref={fieldRef}
              rows={dialog.multiline ? 3 : undefined}
              value={value}
            />
          </label>
        )}
        {error && <p className="mt-1 text-[0.625rem] font-medium text-red-600" role="alert">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[0.5625rem] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            onClick={() => closeDialog(dialog.kind === "prompt" ? null : false)}
            type="button"
          >
            {dialog.cancelLabel}
          </button>
          <button
            className={`rounded-lg px-3.5 py-1.5 text-[0.5625rem] font-semibold text-white shadow-sm ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#1e40af] hover:bg-blue-800"
            }`}
            ref={confirmRef}
            type="submit"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// Dibuja los avisos y la ventana abierta. Va una sola vez, en la raíz.
export default function FeedbackHost() {
  const { toasts, dialog } = useFeedback();
  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((item) => {
          const style = toastStyles[item.type] ?? toastStyles.info;
          return (
            <div
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-lg ${style.box}`}
              key={item.id}
              role={item.type === "error" ? "alert" : "status"}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
                <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d={style.path} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="flex-1 text-[0.625rem] font-medium leading-snug text-slate-800">{item.message}</p>
              <button
                aria-label="Cerrar aviso"
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => dismissToast(item.id)}
                type="button"
              >
                <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {dialog && <Dialog dialog={dialog} />}
    </>
  );
}
