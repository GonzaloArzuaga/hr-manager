import { useEffect, useState } from "react";

// Navegación sin recarga: cambia la dirección con la History API y avisa a
// la aplicación para que reemplace solo el contenido de la página.

const listeners = new Set();

export function currentPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function notify() {
  const path = currentPath();
  listeners.forEach((listener) => listener(path));
}

export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.origin);
  if (url.origin !== window.location.origin) {
    window.location.assign(to);
    return;
  }
  const target = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target !== current) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", target);
  }
  notify();
}

export function usePath() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    listeners.add(setPath);
    return () => listeners.delete(setPath);
  }, []);
  return path;
}

window.addEventListener("popstate", notify);

// Intercepta los clics en enlaces internos (<a href="/...">) para que no
// recarguen la página. isKnownPath decide qué rutas maneja la aplicación.
export function interceptLinks(isKnownPath) {
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || /^(mailto|tel):/i.test(href)) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (!isKnownPath(path)) return;
    event.preventDefault();
    navigate(`${path}${url.search}${url.hash}`);
  }
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
