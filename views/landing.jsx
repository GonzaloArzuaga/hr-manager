import React from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import PricingRedirectCard from "../components/cards/PricingRedirectCard";
import valeriaRossi from "../data/valeria-rossi.png";

const capabilities = [
  {
    title: "Motor de Reglas Automatizado",
    description:
      "Cálculo autónomo de antigüedad, escalas salariales y preaviso de francos y licencias según las normativas CCT vigentes.",
    footer: "Parámetros CCT dinámicos",
    icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    footerIcon: "M8 9l4-4 4 4m0 6l-4 4-4-4",
  },
  {
    title: "Planificación de Turnos y Francos",
    description:
      "Un algoritmo predictivo evita solapamientos de descansos y ayuda a garantizar la dotación mínima operativa.",
    footer: "Prevención de solapamientos",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    footerIcon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  },
  {
    title: "Onboarding con Código Único",
    description:
      "Vinculación ágil del personal mediante códigos únicos, con autogestión de legajos y solicitudes desde el móvil.",
    footer: "Autogestión de empleados",
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    footerIcon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    title: "Auditoría y Recibos Inmutables",
    description:
      "Trazabilidad de cambios en nóminas y exportación de libros de sueldos digitales para inspecciones laborales.",
    footer: "Respaldo jurídico",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    footerIcon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

function Icon({ path, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

function CapabilityCard({ capability }) {
  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex-1 p-5">
        <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" path={capability.icon} />
        </span>
        <h3 className="mb-2 text-sm font-bold text-slate-900">
          {capability.title}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500">
          {capability.description}
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-blue-50/40 px-5 py-3 text-[0.6875rem] font-medium text-blue-700">
        <span>{capability.footer}</span>
        <Icon className="h-3.5 w-3.5" path={capability.footerIcon} />
      </div>
    </article>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f7ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main id="inicio">
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-6 lg:px-10 lg:pb-14 lg:pt-14">
          <h1 className="mb-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.625rem]">
            Gestión inteligente del capital humano, turnos y descansos en tiempo
            real
          </h1>
          <p className="mb-6 max-w-5xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Optimice la asignación de francos, vacaciones y horarios de sus empleados, 
            con estricto cumplimiento de las reglas de negocio de su empresa, y centralice 
            los recibos de sueldo en un solo lugar.
          </p>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
              href="/price"
            >
              Ver planes y precios
              <Icon path="M14 5l7 7m0 0l-7 7m7-7H3" />
            </a>
            <a
              className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-transparent px-5 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              href="#casos"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <svg
                  aria-hidden="true"
                  className="ml-0.5 h-2.5 w-2.5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              Ver casos de éxito
            </a>
          </div>
        </section>

        <section
          aria-labelledby="capabilities-title"
          className="mx-auto mb-12 max-w-7xl px-5 sm:px-6 lg:px-10"
          id="capacidades"
        >
          <div className="rounded-2xl border border-blue-100 bg-[#edf4ff] p-5 sm:p-7 lg:p-9">
            <div className="mb-6 max-w-3xl">
              <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-wider text-blue-700">
                Capacidades de vanguardia
              </p>
              <h2
                className="mb-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                id="capabilities-title"
              >
                Arquitectura para equipos de RRHH con alta complejidad operativa
              </h2>
              <p className="text-sm text-slate-600">
                Reemplace las planillas manuales por una plataforma que coordina
                procesos, normas sindicales y gestión laboral.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((capability) => (
                <CapabilityCard capability={capability} key={capability.title} />
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label="Caso de éxito"
          className="mx-auto mb-12 max-w-7xl scroll-mt-16 px-5 sm:px-6 lg:px-10"
          id="casos"
        >
          <article
            className="grid overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:grid-cols-12"
            id="sobre-nosotros"
          >
            <div className="min-h-64 lg:col-span-4 lg:min-h-[24.375rem]">
              <img
                alt="Valeria Rossi, gerente de Recursos Humanos"
                className="h-full max-h-[26.25rem] min-h-64 w-full object-cover object-top lg:max-h-none"
                src={valeriaRossi}
              />
            </div>
            <div className="flex flex-col justify-between gap-7 p-6 sm:p-8 lg:col-span-8 lg:p-10">
              <div>
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-serif text-2xl font-bold text-blue-700">
                  “
                </span>
                <blockquote className="max-w-3xl text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
                  “Con más de 1.200 colaboradores en tres plantas productivas,
                  gestionar turnos y descansos era una pesadilla. HRManager
                  transformó nuestra operación: automatizamos el control de
                  horas extras y eliminamos los errores de cálculo de CCT.”
                </blockquote>
              </div>
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Valeria Rossi
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Gerente de Recursos Humanos · Acme Corp LatAm
                  </p>
                </div>
                <div
                  aria-label="Calificación: 5 de 5 estrellas"
                  className="flex items-center gap-1 text-blue-600"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 fill-current"
                      key={index}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>

        <PricingRedirectCard />
      </main>
      <Footer />
    </div>
  );
}
