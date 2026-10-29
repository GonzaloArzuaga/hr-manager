import React from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export default function Error404() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] font-sans text-slate-900">
      <Navbar />
      <main className="flex flex-1 items-center">
        <section
          aria-labelledby="not-found-title"
          className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 py-12 text-center sm:px-8 sm:py-16 lg:px-12"
        >
          <div className="flex flex-col items-center">
            <div className="relative mb-6 flex min-h-48 w-full items-center justify-center sm:min-h-56">
              <span
                aria-hidden="true"
                className="absolute inset-0 select-none text-center text-[11rem] font-extrabold leading-none tracking-tighter text-slate-400/20 sm:text-[15rem]"
              >
                404
              </span>
              <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6">
                <span
                  aria-hidden="true"
                  className="select-none text-8xl font-extrabold leading-none tracking-tight text-blue-800 sm:text-9xl"
                >
                  4
                </span>
                <img
                  alt="Mascota desorientada buscando la página"
                  className="w-32 max-w-[8rem] select-none object-contain drop-shadow-md sm:w-40 sm:max-w-[10rem] md:w-48 md:max-w-[12rem]"
                  src="/404.png"
                />
                <span
                  aria-hidden="true"
                  className="select-none text-8xl font-extrabold leading-none tracking-tight text-blue-800 sm:text-9xl"
                >
                  4
                </span>
              </div>
            </div>
            <h1
              className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
              id="not-found-title"
            >
              Página no encontrada
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              El recurso, sección o enlace al que intentás acceder no está
              disponible. Es posible que haya sido movido o que la dirección
              esté escrita incorrectamente.
            </p>
            <a
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              href="/home"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              Volver al inicio
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
