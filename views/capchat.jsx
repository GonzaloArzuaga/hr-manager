import React, { useEffect, useState } from "react";

export default function Capchat() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (status === "checking") {
        setStatus("verified");
      } else if (status === "verified") {
        setStatus("complete");
      } else {
        window.location.replace("/home");
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [status]);

  const isVerified = status !== "checking";
  const isComplete = status === "complete";

  return (
    <>
      <style>{`
        @keyframes turnstile-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .turnstile-spin-animation {
          animation: turnstile-spin 1.1s steps(8, end) infinite;
        }
      `}</style>

      <div className="flex min-h-screen flex-col justify-between bg-black font-sans text-white antialiased">
        <main className="flex flex-1 flex-col items-center justify-start px-4 pt-24 md:pt-28">
          <div className="flex w-full max-w-xl flex-col items-start text-left">
            <header className="mb-4 flex items-center gap-3">
              <img
                alt="Logo de HRManager"
                className="h-7 w-7 flex-shrink-0 object-contain"
                src="/favicon.png"
              />
              <h1 className="text-2xl font-semibold leading-none tracking-tight text-white md:text-3xl">
                hrmanager.ar
              </h1>
            </header>

            <h2 className="mb-3 text-xl font-bold text-white md:text-2xl">
              Verificación de seguridad en curso
            </h2>
            <p className="mb-6 max-w-lg text-sm font-normal leading-relaxed text-neutral-300">
              Este sitio web utiliza un servicio de seguridad para protegerse
              contra bots maliciosos. Esta página se muestra mientras el sitio
              web verifica que tú no eres un bot.
            </p>

            <div aria-live="polite" className="min-h-[70px] w-full">
              {!isComplete ? (
                <div
                  aria-label={isVerified ? "Verificado" : "Verificando"}
                  className="flex h-[65px] w-72 items-center justify-between rounded-md border border-[#444444] bg-[#1a1a1a] px-3.5 shadow-sm"
                  role="status"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center">
                      {isVerified ? (
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="m5 12 4 4L19 6"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                          />
                        </svg>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="turnstile-spin-animation h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="3.5" fill="#34d399" opacity="1" r="1.6" />
                          <circle cx="18.01" cy="5.99" fill="#34d399" opacity="0.875" r="1.6" />
                          <circle cx="20.5" cy="12" fill="#34d399" opacity="0.75" r="1.6" />
                          <circle cx="18.01" cy="18.01" fill="#34d399" opacity="0.625" r="1.6" />
                          <circle cx="12" cy="20.5" fill="#34d399" opacity="0.5" r="1.6" />
                          <circle cx="5.99" cy="18.01" fill="#34d399" opacity="0.375" r="1.6" />
                          <circle cx="3.5" cy="12" fill="#34d399" opacity="0.25" r="1.6" />
                          <circle cx="5.99" cy="5.99" fill="#34d399" opacity="0.125" r="1.6" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-normal text-neutral-200">
                      {isVerified ? "Verificado" : "Verificando..."}
                    </span>
                  </span>

                  <div className="flex select-none flex-col items-end justify-center pt-0.5">
                    <div className="flex items-center gap-1">
                      <svg
                        aria-hidden="true"
                        className="h-3 w-5 fill-current text-[#f6821f]"
                        viewBox="0 0 48 30"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M38.5 12.5C37.8 5.5 32 0 24.8 0C18.9 0 13.9 3.7 12 9C5.3 9.7 0 15.3 0 22.3C0 29.8 6.2 30 6.6 30H38.2C43.6 30 48 25.6 48 20.2C48 15.1 43.8 12.7 38.5 12.5Z" />
                      </svg>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-100">
                        CLOUDFLARE
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[9px] text-neutral-400">
                      <a
                        className="transition-colors hover:text-neutral-300 hover:underline"
                        href="https://www.cloudflare.com/es-es/privacypolicy/"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Privacidad
                      </a>
                      <span className="text-[7px] text-neutral-500">•</span>
                      <a
                        className="transition-colors hover:text-neutral-300 hover:underline"
                        href="https://developers.cloudflare.com/cloudflare-challenges/troubleshooting/challenge-solve-issues/"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Ayuda
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xl font-bold leading-snug tracking-tight text-white md:text-[22px]">
                  Verificación correcta. Esperando a que hrmanager.ar responda.
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="flex w-full flex-col items-center px-4 pb-8 pt-6">
          <div className="mb-4 w-full max-w-2xl border-t border-[#262626]" />
          <div className="flex flex-col items-center gap-1 text-center text-xs text-neutral-400">
            <p className="font-mono text-[11px] text-neutral-300">
              Ray ID: <span className="text-neutral-200">a514d6c8b9d2cb06</span>
            </p>
            <p className="text-[11px] text-neutral-400">
              Rendimiento y seguridad de{" "}
              <a
                className="text-neutral-300 hover:underline"
                href="https://www.cloudflare.com/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Cloudflare
              </a>
              <span className="mx-1 text-neutral-600">|</span>
              <a
                className="text-neutral-300 hover:underline"
                href="https://www.cloudflare.com/es-es/privacypolicy/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Privacidad
              </a>
            </p>
            <p className="mt-2 text-[10px] font-light text-neutral-500">
              Modo de demostración • Esta es una pantalla de prueba simulada,
              no un captcha activo real.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
