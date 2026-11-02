import React from "react";

export default function PricingRedirectCard() {
  return (
    <section
      aria-labelledby="pricing-redirect-title"
      className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
    >
      <div className="relative overflow-hidden rounded-3xl bg-[#0b328f] p-8 text-white shadow-2xl sm:p-12 lg:p-14">
        <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row lg:gap-12">
          <div className="flex-1 space-y-4 text-left">
            <h2
              className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
              id="pricing-redirect-title"
            >
              Encuentre el plan ideal para la escala de su organización
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-blue-100/90 sm:text-base">
              Tarifas transparentes y adaptadas a la dotación de su equipo.
              Descubra cuál es la opción indicada para optimizar la gestión de
              personas.
            </p>
          </div>
          <div className="flex w-full flex-shrink-0 items-center justify-center lg:w-auto">
            <a
              className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-center text-sm font-bold text-[#0b328f] shadow-xl transition duration-200 hover:bg-blue-50 hover:shadow-2xl sm:w-auto"
              href="/price"
            >
              <span>Ver Planes y Precios</span>
              <svg
                aria-hidden="true"
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
