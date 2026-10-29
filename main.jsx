import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { supabase } from "./lib/supabaseClient";
import { hydrate, loadAccount, store } from "./lib/store";
import { currentPath, interceptLinks, navigate, usePath } from "./lib/router";
import AppShell from "./components/AppShell";
import FeedbackHost from "./components/FeedbackHost";
import { loadNotifications, stopNotifications } from "./lib/notifications";

// Páginas públicas: no requieren sesión
const publicViews = {
  "/": () => import("./views/capchat"),
  "/home": () => import("./views/landing"),
  "/about": () => import("./views/about"),
  "/price": () => import("./views/price"),
  "/login": () => import("./views/login"),
  "/login/recover": () => import("./views/recoverPassword"),
  "/login/change-password": () => import("./views/newPassword"),
};

// Páginas privadas, separadas por rol. Las rutas del otro rol redirigen al inicio propio.
const employerViews = {
  "/employer": () => import("./views/empleador/dashboardEmployer"),
  "/employer/horarios": () => import("./views/empleador/horariosEmployer"),
  "/employer/francos": () => import("./views/empleador/francosEmployer"),
  "/employer/vacaciones": () => import("./views/empleador/vacacionesEmployer"),
  "/employer/sueldos": () => import("./views/empleador/sueldosEmployer"),
  "/employer/empleados": () => import("./views/empleador/empleadosEmployer"),
  "/employer/estadisticas": () => import("./views/empleador/estadisticasEmployer"),
  "/employer/fichajes": () => import("./views/empleador/fichajesEmployer"),
  "/employer/configuration": () => import("./views/participante/configuration"),
  "/configuracion": () => import("./views/participante/configuration"),
};

const employeeViews = {
  "/employee": () => import("./views/empleado/dashboardEmployee"),
  "/employee/horarios": () => import("./views/empleado/horariosEmployee"),
  "/employee/francos": () => import("./views/empleado/francosEmployee"),
  "/employee/vacaciones": () => import("./views/empleado/vacacionesEmployee"),
  "/employee/sueldos": () => import("./views/empleado/sueldosEmployee"),
  "/employee/configuration": () => import("./views/participante/configuration"),
};

const adminViews = {
  "/admin": () => import("./views/admin/AdminInicio"),
  "/admin/empresas": () => import("./views/admin/AdminEmpresas"),
  "/admin/configuracion": () => import("./views/admin/AdminConfiguracion"),
};

const viewProps = {
  "/employer/configuration": { userType: "employer" },
  "/configuracion": { userType: "employer" },
  "/employee/configuration": { userType: "employee" },
};

function FullScreenMessage({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7ff] px-4 font-sans">
      <div className="max-w-sm text-center">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {children && <div className="mt-2 text-xs leading-relaxed text-slate-500">{children}</div>}
      </div>
    </div>
  );
}

const HYDRATE_MAX_AGE_MS = 30000;
// Cuando la sesión se cierra para mostrar un aviso (cuenta dada de baja o
// empresa suspendida), no hay que volver al login: el aviso queda en pantalla.
let keepMessageOnSignOut = false;
let hydratedAt = 0;

async function freshData(force = false) {
  if (force || Date.now() - hydratedAt > HYDRATE_MAX_AGE_MS) {
    await hydrate();
    hydratedAt = Date.now();
  }
}

function homeFor(account) {
  if (account.role === "admin") return "/admin";
  return account.role === "employer" ? "/employer" : "/employee";
}

function viewsFor(account) {
  if (account.role === "admin") return adminViews;
  return account.role === "employer" ? employerViews : employeeViews;
}

function isKnownPath(path) {
  return Boolean(
    publicViews[path] || employerViews[path] || employeeViews[path] || adminViews[path] || path === "/login/change-temporary-password",
  );
}

async function resolveRoute(path) {
  if (publicViews[path]) {
    // Con sesión iniciada, el login lleva directo al panel
    if (path === "/login") {
      const account = await loadAccount();
      if (account?.is_active) return { redirect: homeFor(account) };
    }
    return { load: publicViews[path] };
  }
  if (!isKnownPath(path)) return { load: () => import("./views/error404") };

  // Dentro del panel ya se conoce la cuenta: solo se cambia el contenido
  const inShell =
    store.session && store.account?.is_active && !store.account.must_change_password && !store.account.company_suspended;
  const account = inShell ? store.account : await loadAccount();
  if (!store.session) return { redirect: "/login" };
  if (!account) {
    return {
      message: {
        title: "Tu usuario no tiene una cuenta asociada.",
        body: "Pedile al administrador del sistema o a tu empleador que revise el alta.",
      },
    };
  }
  if (account.company_suspended) {
    keepMessageOnSignOut = true;
    await supabase.auth.signOut();
    return {
      message: {
        title: "La cuenta de tu empresa está suspendida.",
        body: "Comunicate con el administrador del sistema para reactivarla.",
      },
    };
  }
  if (!account.is_active) {
    keepMessageOnSignOut = true;
    await supabase.auth.signOut();
    return {
      message: {
        title: "Tu cuenta fue dada de baja.",
        body: "Si creés que es un error, comunicate con tu empleador.",
      },
    };
  }

  // RF-03: con contraseña provisoria solo se puede acceder al cambio de contraseña
  if (account.must_change_password) {
    if (path !== "/login/change-temporary-password") return { redirect: "/login/change-temporary-password" };
    return { load: () => import("./views/changeTemporaryPassword") };
  }
  if (path === "/login/change-temporary-password") return { redirect: homeFor(account) };

  const views = viewsFor(account);
  if (!views[path]) return { redirect: homeFor(account) };

  await freshData(!inShell);
  loadNotifications();
  return { load: views[path], props: viewProps[path], shell: true };
}

function App() {
  const path = usePath();
  const [state, setState] = useState({ status: "loading" });
  const [pending, setPending] = useState(false);

  // Los enlaces internos cambian de sección sin recargar la página
  useEffect(() => interceptLinks(isKnownPath), []);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    resolveRoute(path)
      .then(async (route) => {
        if (cancelled) return;
        if (route.redirect) {
          navigate(route.redirect, { replace: true });
          return;
        }
        if (route.message) {
          setState({ status: "message", ...route.message });
          return;
        }
        const module = await route.load();
        if (cancelled) return;
        setState({
          status: "ready",
          View: module.default,
          props: route.props ?? {},
          shell: Boolean(route.shell),
          path,
        });
        window.scrollTo(0, 0);
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error });
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Si la sesión se cierra (también desde otra pestaña), se vuelve al login
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        stopNotifications();
        store.account = null;
        hydratedAt = 0;
        if (keepMessageOnSignOut) keepMessageOnSignOut = false;
        else if (isKnownPath(currentPath()) && !publicViews[currentPath()]) {
          navigate("/login", { replace: true });
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (state.status === "loading") return <FullScreenMessage title="Cargando…" />;
  if (state.status === "message") {
    return (
      <FullScreenMessage title={state.title}>
        <p>{state.body}</p>
        <a className="mt-3 inline-block font-semibold text-blue-700" href="/login">Volver al inicio de sesión</a>
      </FullScreenMessage>
    );
  }
  if (state.status === "error") {
    return (
      <FullScreenMessage title="No se pudieron cargar los datos.">
        <p>{state.error.message}</p>
        <button
          className="mt-3 rounded-md bg-blue-800 px-3 py-1.5 font-semibold text-white"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reintentar
        </button>
      </FullScreenMessage>
    );
  }
  const { View, props, shell } = state;
  if (!shell) return <View key={state.path} {...props} />;
  return (
    <AppShell loading={pending} path={state.path}>
      <View key={state.path} {...props} />
    </AppShell>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <FeedbackHost />
  </React.StrictMode>,
);
