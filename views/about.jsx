import React from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import PricingRedirectCard from "../components/cards/PricingRedirectCard";

const principles = [
  {
    title: "Apego Normativo Inflexible",
    description:
      "Cada solicitud y cada asignación se validan según las reglas que carga el empleador o el responsable de RR. HH.: francos semanales, preavisos y días de vacaciones por antigüedad.",
    footer: "Reglas configurables",
    icon: "M4 6h16M7 3v6m10-6v6M5 11h14v9H5zM8 14h3m2 0h3m-8 3h3",
    footerIcon: "M5 12l4 4L19 6",
  },
  {
    title: "Transparencia para el Empleado",
    description:
      "Empoderamiento de los empleados con portales de autogestión claros, y visualización instantánea de francos, vacaciones y recibos de sueldo, sin demoras.",
    footer: "Autogestión y Claridad",
    icon: "M8 7V3m8 4V3M5 11h14M5 5h14a2 2 0 012 2v12H3V7a2 2 0 012-2zm3 9h3m2 0h3",
    footerIcon: "M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    title: "Innovación y Automatización",
    description:
      "Erradicación de planillas manuales, cruces caóticos de mensajería y fricciones operativas entre supervisores de línea, delegados y la mesa de liquidación de sueldos.",
    footer: "Cero Fricción Administrativa",
    icon: "M20 7h-9m3-3l-3 3 3 3M4 17h9m-3-3l3 3-3 3M12 2v2m0 16v2",
    footerIcon: "M13 2L4 14h7l-1 8 10-12h-7l1-8z",
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
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

function InfoCard({ title, description, icon, footer, footerIcon }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" path={icon} />
      </span>
      <h3 className="mb-2 text-base font-bold leading-snug text-slate-900">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      {footer && (
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs font-medium text-blue-700">
          <Icon className="h-3.5 w-3.5 shrink-0" path={footerIcon} />
          <span>{footer}</span>
        </div>
      )}
    </article>
  );
}

export default function About() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        brandHref="/home"
        links={[
          { href: "/home", label: "Inicio" },
          { current: true, href: "/about", label: "Sobre Nosotros" },
          { href: "/price", label: "Precios" },
        ]}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div>
            <h1 className="mb-3 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Transformamos la complejidad laboral en certidumbre operativa
            </h1>
            <p className="max-w-5xl text-base leading-relaxed text-slate-600">
              Brindamos a directores de Recursos Humanos y a empresas con equipos 
              por turnos una plataforma para organizar turnos rotativos, francos y 
              vacaciones según las reglas de negocio de cada empresa.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="principles-title"
          className="bg-[#edf3ff]"
          id="principios"
        >
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
            <div className="mb-5 max-w-4xl">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                Principios operativos
              </p>
              <h2
                className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                id="principles-title"
              >
                Arquitectura basada en rigor normativo y velocidad humana
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                Desarrollamos algoritmos que protegen la salud legal de la
                empresa al tiempo que honran los derechos y descansos del
                personal.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {principles.map((principle) => (
                <InfoCard {...principle} key={principle.title} />
              ))}
            </div>
          </div>
        </section>

        <PricingRedirectCard />
      </main>

      <Footer />
    </div>
  );
}
