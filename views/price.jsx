import React from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const plans = [
  {
    name: "Básico",
    icon: "domain",
    description:
      "Ideal para pequeñas empresas y equipos reducidos de hasta 20 colaboradores.",
    price: "$20",
    features: [
      { label: "Hasta 20 empleados registrados", included: true },
      { label: "Soporte técnico básico", included: true },
      { label: "Motor de Reglas CCT y convenios", included: false },
    ],
    action: "Seleccionar Plan Básico",
    actionIcon: "arrow",
  },
  {
    name: "Profesional",
    icon: "verified",
    description:
      "Ideal para empresas en crecimiento de hasta 100 empleados.",
    price: "$40",
    popular: true,
    features: [
      { label: "Hasta 100 empleados registrados", included: true },
      { label: "Soporte prioritario técnico 24/7", included: true },
    ],
    action: "Seleccionar Plan Profesional",
    actionIcon: "arrow",
  },
  {
    name: "Enterprise",
    icon: "corporate",
    description:
      "Para organizaciones de +100 empleados o estructuras corporativas complejas a medida.",
    price: "A Medida",
    priceNote: "Cotización adaptada a nómina",
    features: [
      { label: "Hecho a la medida de tu Empresa", included: true },
      { label: "Soporte prioritario técnico 24/7", included: true },
      {
        label: "Cláusula de blindaje y consultoría jurídica directa",
        included: true,
      },
    ],
    action: "Seleccionar Plan Enterprise",
    actionIcon: "arrow",
  },
];

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    arrow: "M5 12h14m-7-7 7 7-7 7",
    check: "M5 12l4 4L19 6",
    corporate:
      "M3 21h18M5 21V5h9v16m0-10h5v10M8 8h3m-3 4h3m-3 4h3m5 0h2",
    calendar:
      "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    domain:
      "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M14 9v.01M14 12v.01M14 15v.01",
    phone:
      "M22 16.92v3a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.8a2 2 0 01-.45 2.11L9 10.87a16 16 0 006.13 6.13l1.24-1.25a2 2 0 012.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0122 18z",
    verified:
      "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4zm-3 9 2 2 4-4",
  };

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
      <path d={paths[name]} />
    </svg>
  );
}

function PricingCard({ onSelectPlan, plan }) {
  return (
    <article
      className={`relative flex flex-col rounded-xl bg-white p-6 ${
        plan.popular
          ? "z-10 border border-blue-100 shadow-xl shadow-blue-900/10 lg:-translate-y-2"
          : "border border-slate-100 shadow-sm transition-shadow hover:shadow-md"
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">
          Más popular
        </span>
      )}

      <div className={`mb-1 flex items-center justify-between ${plan.popular ? "mt-1" : ""}`}>
        <h2
          className={`text-base font-semibold ${
            plan.popular ? "text-blue-900" : "text-slate-900"
          }`}
        >
          {plan.name}
        </h2>
        <Icon
          className={`h-6 w-6 ${
            plan.popular ? "text-blue-800" : "text-blue-600"
          }`}
          name={plan.icon}
        />
      </div>

      <p className="min-h-8 text-xs leading-relaxed text-slate-600">
        {plan.description}
      </p>

      <div className="my-4 border-b border-slate-100 pb-4">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-extrabold tracking-tight ${
              plan.price === "A Medida"
                ? "text-2xl text-slate-900"
                : `text-4xl ${plan.popular ? "text-blue-900" : "text-slate-900"}`
            }`}
          >
            {plan.price}
          </span>
          {plan.price !== "A Medida" && (
            <span className="text-xs text-slate-500">/ mes</span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {plan.priceNote ?? "Facturado mensualmente (USD)"}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <ul className="mb-6 flex flex-col gap-3 py-2">
          {plan.features.map((feature) => (
            <li
              className={`flex items-start gap-2.5 text-xs leading-relaxed ${
                feature.included ? "text-slate-800" : "text-slate-500"
              }`}
              key={feature.label}
            >
              <span
                aria-hidden="true"
                className={`shrink-0 ${
                  feature.included ? "text-blue-800" : "text-slate-400"
                }`}
              >
                {feature.included ? <Icon className="h-4 w-4" name="check" /> : "−"}
              </span>
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>

        <button
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
            plan.popular
              ? "bg-blue-900 text-white shadow-md hover:bg-blue-950"
              : "bg-blue-50 text-blue-900 hover:bg-blue-100"
          }`}
          onClick={() => onSelectPlan(plan.name)}
          type="button"
        >
          <span>{plan.action}</span>
          <Icon className="h-4 w-4" name={plan.actionIcon} />
        </button>
      </div>
    </article>
  );
}

export default function Price() {
  const [selectedPlan, setSelectedPlan] = React.useState("Profesional");

  function selectPlan(planName) {
    setSelectedPlan(planName);
    document.getElementById("contacto")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] font-sans text-slate-900 antialiased">
      <Navbar
        brandHref="/home"
        links={[
          { href: "/home", label: "Inicio" },
          { href: "/about", label: "Sobre Nosotros" },
          { current: true, href: "/price", label: "Precios" },
        ]}
      />

      <main className="w-full flex-1 bg-[#f8f9ff]">
        <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Inversión transparente adaptada a la escala de su organización
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              Sin costos ocultos. Automatice turnos, francos y liquidaciones
              con respaldo legal completo y soporte dedicado.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard
                key={plan.name}
                onSelectPlan={selectPlan}
                plan={plan}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-around gap-4 rounded-xl bg-[#eff4ff] px-4 py-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-blue-800" name="domain" />
              <span>Cancelación flexible sin permanencia forzosa</span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="demo-title"
          className="mx-auto mb-12 w-full max-w-7xl scroll-mt-16 px-5 sm:px-8 lg:px-12"
          id="contacto"
        >
          <div className="grid gap-8 rounded-2xl bg-[#082f91] p-6 text-white shadow-xl shadow-blue-950/15 sm:p-8 lg:grid-cols-12 lg:items-start lg:gap-10 lg:p-10">
            <div className="lg:col-span-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-200">
                Implementación y asesoría directa
              </p>
              <h2
                className="mb-4 max-w-4xl text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl"
                id="demo-title"
              >
                Modernice la gestión de personas en su organización hoy mismo
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
                Conozca cómo digitalizar francos, horarios y nóminas con una
                demostración guiada adaptada a la dotación de su organización.
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-lg sm:p-6 lg:col-span-5 lg:p-7">
              <h3 className="mb-4 text-lg font-bold text-slate-900">
                Agendar Demo Guiada
              </h3>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const email = formData.get("email");
                  const plan = formData.get("plan");
                  const subject = encodeURIComponent(
                    "Solicitud de demo guiada - HRManager",
                  );
                  const body = encodeURIComponent(
                    `Correo corporativo: ${email}\nTipo de Plan interesado: ${plan}`,
                  );
                  window.location.href = `mailto:soporte@hrmanager.com.ar?subject=${subject}&body=${body}`;
                }}
              >
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="demo-email"
                  >
                    Correo Electronico
                  </label>
                  <input
                    autoComplete="email"
                    className="w-full rounded-lg border border-transparent bg-[#eef3ff] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    id="demo-email"
                    name="email"
                    placeholder="nombre@empresa.com"
                    required
                    type="email"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="demo-plan"
                  >
                    Tipo de Plan interesado
                  </label>
                  <select
                    className="w-full rounded-lg border border-transparent bg-[#eef3ff] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    id="demo-plan"
                    name="plan"
                    onChange={(event) => setSelectedPlan(event.target.value)}
                    value={selectedPlan}
                    required
                  >
                    <option value="Básico">Básico</option>
                    <option value="Profesional">Profesional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#082f91] px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  type="submit"
                >
                  Coordinar con un Especialista
                  <Icon className="h-4 w-4" name="calendar" />
                </button>
              </form>
              <p className="mt-4 text-center text-xs text-slate-500">
                Usaremos tus datos únicamente para coordinar la demostración.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
