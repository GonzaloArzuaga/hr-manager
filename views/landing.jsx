import React, { useEffect } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import PricingRedirectCard from "../components/cards/PricingRedirectCard";
import { navigationItems, SidebarIcon } from "../components/Sidebar";

const navLinks = [
  { href: "/home", label: "Inicio", current: true },
  { href: "/about", label: "Sobre Nosotros" },
  { href: "/price", label: "Precios" },
];

const facts = [
  { value: "20 USD", label: "Desde por mes", detail: "Plan Básico para hasta 20 empleados" },
  { value: "100 %", label: "Recibos digitales", detail: "Cada empleado descarga los suyos en PDF" },
  { value: "A medida", label: "Reglas configurables", detail: "Francos, avisos previos y aprobaciones según su negocio" },
  { value: "0", label: "Accesos a datos ajenos", detail: "Información aislada por empresa y por empleado" },
];

const modules = [
  {
    title: "Empleados",
    description: "Legajo, CUIL, puesto, área y sucursal. Alta con cuenta y contraseña provisoria.",
  },
  {
    title: "Horarios",
    description: "Un tipo de turno por empleado y por semana, con historial conservado.",
  },
  {
    title: "Francos",
    description: "Solicitudes con aviso previo, tope semanal y cálculo de francos del mes.",
  },
  {
    title: "Vacaciones",
    description: "Días corridos según antigüedad, sin superposiciones ni excesos de saldo.",
  },
  {
    title: "Sueldos",
    description: "Recibos PDF por período, visibles solo para su titular.",
    optional: true,
  },
  {
    title: "Fichajes",
    description: "Asistencia diaria, carga individual e importación desde Excel.",
    optional: true,
  },
  {
    title: "Estadísticas",
    description: "Cobertura, demanda por franja horaria y vacaciones por mes.",
    optional: true,
  },
];

const steps = [
  {
    title: "Alta de la empresa",
    description:
      "Creamos su empresa con el plan elegido y la cuenta del empleador responsable.",
  },
  {
    title: "Configuración de reglas",
    description:
      "Defina tipos de turno, francos semanales, aviso previo, puestos, áreas y sucursales.",
  },
  {
    title: "Incorporación del personal",
    description:
      "Dé de alta a sus empleados: cada uno ingresa con su cuenta y gestiona sus solicitudes.",
  },
];

function employerIcon(label) {
  return navigationItems.find((item) => item.label === label && item.employer);
}

function ModuleCard({ module }) {
  const icon = employerIcon(module.title);
  return (
    <article className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf4ff] text-blue-700 transition-colors group-hover:bg-blue-700 group-hover:text-white">
          <SidebarIcon className="h-5 w-5" filled={icon.filled} innerPath={icon.innerPath} path={icon.path} />
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[0.625rem] font-semibold ${
            module.optional ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          {module.optional ? "Según plan" : "Incluido"}
        </span>
      </div>
      <h3 className="mb-1.5 text-sm font-bold text-slate-900">{module.title}</h3>
      <p className="text-xs leading-relaxed text-slate-500">{module.description}</p>
    </article>
  );
}

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("scrollbar-hidden");
    return () => document.documentElement.classList.remove("scrollbar-hidden");
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar links={navLinks} />
      <main id="inicio">
        <section className="relative overflow-hidden bg-[#223247] text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:2.5rem_2.5rem]"
          />
          <div className="relative mx-auto max-w-7xl px-5 pb-28 pt-14 text-center sm:px-6 lg:px-10 lg:pb-32 lg:pt-20">
            <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-blue-200">
              Gestión de Recursos Humanos
            </p>
            <h1 className="mx-auto mb-5 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              La administración del personal que su empresa necesita para
              crecer con orden
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Horarios, francos, vacaciones, fichajes y sueldos bajo las mismas
              reglas, con información separada por empresa y acceso según el
              rol de cada persona.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
                href="/price"
              >
                Solicitar una demostración
                <i aria-hidden="true" className="fa-solid fa-arrow-right text-xs" />
              </a>
              <a
                className="inline-flex items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                href="#modulos"
              >
                Ver módulos
              </a>
            </div>
          </div>
        </section>

        <section aria-label="HRManager en números" className="relative mx-auto -mt-16 max-w-6xl px-5 sm:px-6 lg:px-10">
          <dl className="grid grid-cols-1 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-lg sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {facts.map((fact) => (
              <div className="p-6 text-center" key={fact.label}>
                <dt className="text-xs font-semibold text-slate-700">{fact.label}</dt>
                <dd className="mt-1 text-3xl font-extrabold tracking-tight text-blue-800">{fact.value}</dd>
                <dd className="mt-1 text-[0.6875rem] text-slate-500">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="modulos-titulo"
          className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 sm:px-6 lg:px-10 lg:py-20"
          id="modulos"
        >
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-wider text-blue-700">
              Módulos
            </p>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" id="modulos-titulo">
              Una plataforma, todas las áreas de gestión laboral
            </h2>
            <p className="text-sm text-slate-600">
              Empiece con lo esencial y sume módulos a medida que su
              organización lo requiera.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <ModuleCard key={module.title} module={module} />
            ))}
            <a
              className="flex flex-col items-start justify-between rounded-xl bg-blue-700 p-5 text-white transition-colors hover:bg-blue-800"
              href="/price"
            >
              <i aria-hidden="true" className="fa-solid fa-layer-group text-xl text-blue-200" />
              <span>
                <span className="mb-1 block text-sm font-bold">Compare los planes</span>
                <span className="block text-xs text-blue-100">
                  Vea qué módulos incluye cada uno
                  <i aria-hidden="true" className="fa-solid fa-arrow-right ml-2 text-[0.625rem]" />
                </span>
              </span>
            </a>
          </div>
        </section>

        <section aria-labelledby="pasos-titulo" className="border-y border-blue-100 bg-[#edf4ff]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-10">
            <div className="mb-10 max-w-2xl">
              <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-wider text-blue-700">
                Implementación
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" id="pasos-titulo">
                Operativo en tres pasos
              </h2>
            </div>
            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <li className="relative rounded-xl border border-blue-100 bg-white p-6" key={step.title}>
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#223247] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mb-1.5 text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-label="Caso de éxito" className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-10">
          <figure className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <img
              alt="Valeria Rossi, gerente de Recursos Humanos"
              className="h-40 w-40 rounded-2xl object-cover object-top shadow-sm"
              src="https://prbxcnrjowntijnpczoo.supabase.co/storage/v1/object/public/images/reseniaValeria.png"
            />
            <div className="border-l-4 border-blue-700 pl-6">
              <blockquote className="mb-4 text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
                “HRManager transformó nuestra operación: automatizamos el
                control de horas extras y eliminamos los errores de cálculo
                de CCT.”
              </blockquote>
              <figcaption className="text-sm">
                <span className="font-bold text-slate-900">Valeria Rossi</span>
                <span className="text-slate-500"> · Gerente de Recursos Humanos, Acme Corp LatAm</span>
              </figcaption>
            </div>
          </figure>
        </section>

        <PricingRedirectCard />
      </main>
      <Footer />
    </div>
  );
}
