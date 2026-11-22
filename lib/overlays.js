import { useEffect, useRef } from "react";

// Solo una ventana flotante abierta a la vez: notificaciones, calendarios,
// desplegables y ventanas propias. Al abrirse una, las demás se cierran.
const listeners = new Set();
let counter = 0;

export function announceOverlay(id) {
  for (const listener of [...listeners]) listener(id);
}

export function useExclusiveOverlay(open, close) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    counter += 1;
    idRef.current = `overlay-${counter}`;
  }
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return undefined;
    const id = idRef.current;
    announceOverlay(id);
    const listener = (other) => {
      if (other !== id) closeRef.current?.();
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [open]);
}
