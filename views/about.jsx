import React, { useEffect, useRef, useState } from "react";
import { demoVideoUrls } from "../data/demoVideos";
import { hasPlayableVideo, isDirectVideoUrl, loadYouTubeApi, youtubeVideoId } from "../lib/demoVideos";
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
    footerIcon:
      "M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
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

const demoChapters = [
  {
    label: "Horarios",
    title: "Planificación de Turnos y Horarios",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    videoUrl:
      demoVideoUrls.horarios,
  },
  {
    label: "Fichajes",
    title: "Registro de Asistencia y Fichajes Digitales",
    icon: "M80-40v-80h800v80H80Zm80-120v-240q-33-54-51-114.5T91-638q0-61 15.5-120T143-874q8-21 26-33.5t40-12.5q31 0 53 21t18 50l-11 91q-6 48 8.5 91t43.5 75.5q29 32.5 70 52t89 19.5q60 0 120.5 12.5T706-472q45 23 69.5 58.5T800-326v166H160Zm80-80h480v-86q0-24-12-42.5T674-398q-41-20-95-31t-99-11q-66 0-122.5-27t-96-72.5Q222-585 202-644.5T190-768q-10 30-14.5 64t-4.5 66q0 58 20.5 111.5T240-422v182Zm127-367q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47Zm169.5-56.5Q560-687 560-720t-23.5-56.5Q513-800 480-800t-56.5 23.5Q400-753 400-720t23.5 56.5Q447-640 480-640t56.5-23.5ZM320-160v-37q0-67 46.5-115T480-360h160v80H480q-34 0-57 24.5T400-197v37h-80Zm160-80Zm0-480Z",
    videoUrl:
      demoVideoUrls.fichajes,
    filled: true,
  },
  {
    label: "Francos",
    title: "Gestión de Francos y Días Compensatorios",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    videoUrl:
      demoVideoUrls.francos,
  },
  {
    label: "Vacaciones",
    title: "Solicitudes y Calendario de Vacaciones",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    videoUrl:
      demoVideoUrls.vacaciones,
  },
  {
    label: "Empleados",
    title: "Directorio y Legajos de Colaboradores",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    videoUrl:
      demoVideoUrls.empleados,
  },
  {
    label: "Sueldos",
    title: "Liquidación de Sueldos y Recibos Digitales",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    videoUrl:
      demoVideoUrls.sueldos,
  },
  {
    label: "Estadísticas",
    title: "Métricas, Informes y Analíticas de RR. HH.",
    icon: "M280-280h80v-280h-80v280Zm160 0h80v-400h-80v400Zm160 0h80v-160h-80v160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z",
    videoUrl:
      demoVideoUrls.estadisticas,
    filled: true,
  },
];

function Icon({ path, className = "h-4 w-4", filled = false }) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        viewBox="0 -960 960 960"
      >
        <path d={path} />
      </svg>
    );
  }

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
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      {footer && (
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs font-medium text-blue-700">
          <Icon className="h-3.5 w-3.5 shrink-0" path={footerIcon} />
          <span>{footer}</span>
        </div>
      )}
    </article>
  );
}

function ProductDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [progress, setProgress] = useState(0);
  const [apiReady, setApiReady] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  // Mientras el video se descarga se muestra un aviso de carga sobre el reproductor
  const [videoLoading, setVideoLoading] = useState(true);
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const activeIndexRef = useRef(activeIndex);
  const activeChapter = demoChapters[activeIndex];
  const activeVideoId = youtubeVideoId(activeChapter.videoUrl);
  const activeHasVideo = Boolean(
    activeVideoId || isDirectVideoUrl(activeChapter.videoUrl),
  );
  const activeIsDirectVideo = isDirectVideoUrl(activeChapter.videoUrl);
  const hasYouTubeVideos = demoChapters.some((chapter) =>
    youtubeVideoId(chapter.videoUrl),
  );
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!hasYouTubeVideos) {
      return undefined;
    }

    let cancelled = false;

    loadYouTubeApi()
      .then((youtube) => {
        if (cancelled || !playerContainerRef.current) {
          return;
        }

        const player = new youtube.Player(playerContainerRef.current, {
          height: "100%",
          width: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }
              event.target.mute();
              event.target.getIframe().title = "Video de demostración de HRManager";
              setApiReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === youtube.PlayerState.PLAYING) setVideoLoading(false);
              if (event.data === youtube.PlayerState.BUFFERING || event.data === -1) setVideoLoading(true);
              if (event.data === youtube.PlayerState.ENDED) advanceAfterVideo();
            },
            onError: () => {
              if (!cancelled) {
                setVideoUnavailable(true);
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setVideoUnavailable(true);
        }
      });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [hasYouTubeVideos]);

  useEffect(() => {
    if (!apiReady || !playerRef.current) {
      return;
    }

    const player = playerRef.current;
    if (!activeVideoId) {
      player.stopVideo();
      return;
    }

    setVideoUnavailable(false);
    setProgress(0);
    player.mute();
    player.getIframe().title = `Video de demostración: ${activeChapter.label}`;
    player.loadVideoById(activeVideoId);
  }, [activeChapter.label, activeVideoId, activeIndex, apiReady, selectionVersion]);

  function advanceAfterVideo() {
    const endedIndex = activeIndexRef.current;
    const nextIndex = (endedIndex + 1) % demoChapters.length;

    activeIndexRef.current = nextIndex;
    setVideoLoading(true);
    setProgress(0);
    setVideoUnavailable(!hasPlayableVideo(demoChapters[nextIndex].videoUrl));
    setActiveIndex(nextIndex);
  }

  useEffect(() => {
    if (!apiReady || !activeVideoId || videoUnavailable) {
      return undefined;
    }

    const progressInterval = window.setInterval(() => {
      const player = playerRef.current;
      if (
        !player ||
        player.getPlayerState() !== window.YT.PlayerState.PLAYING
      ) {
        return;
      }

      const duration = player.getDuration();
      if (Number.isFinite(duration) && duration > 0) {
        setProgress(
          Math.min(100, (player.getCurrentTime() / duration) * 100),
        );
      }
    }, 100);

    return () => window.clearInterval(progressInterval);
  }, [activeIndex, activeVideoId, apiReady, videoUnavailable]);

  function selectChapter(index) {
    activeIndexRef.current = index;
    setVideoLoading(true);
    setActiveIndex(index);
    setSelectionVersion((version) => version + 1);
    setProgress(0);
    setVideoUnavailable(!hasPlayableVideo(demoChapters[index].videoUrl));
  }

  return (
    <section
      aria-labelledby="product-demo-title"
      className="bg-[#edf3ff]"
      id="demo"
    >
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mb-5 max-w-4xl">
          <h2
            className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            id="product-demo-title"
          >
            Conocé HRManager en acción
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Seleccioná una funcionalidad para ver cómo se usa la plataforma.
          </p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
          <nav
            aria-label="Capítulos de demostración"
            className="border-b border-slate-200/90 bg-slate-50/90 p-2 sm:p-3"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {demoChapters.map((chapter, index) => {
                const chapterProgress =
                  index === activeIndex ? progress : 0;
                const isActive = index === activeIndex;

                return (
                  <button
                    aria-label={chapter.label}
                    aria-pressed={isActive}
                    className={`group relative flex min-w-0 items-center overflow-hidden rounded-xl border bg-white px-2.5 py-2 text-left transition-colors hover:border-slate-300 ${
                      isActive ? "border-blue-500" : "border-slate-200/80"
                    }`}
                    key={chapter.label}
                    onClick={() => selectChapter(index)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-blue-100/70 transition-[width] duration-100"
                      style={{ width: `${chapterProgress}%` }}
                    />
                    <span className="relative z-10 flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon
                          className="h-4 w-4"
                          filled={chapter.filled}
                          path={chapter.icon}
                        />
                      </span>
                      <span
                        className={`truncate text-xs ${
                          isActive
                            ? "font-bold text-blue-900"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {chapter.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-slate-100/70">
            {activeIsDirectVideo && !videoUnavailable && (
              <video
                autoPlay
                className="absolute inset-0 h-full w-full object-contain"
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                key={`${activeIndex}-${selectionVersion}`}
                muted
                onContextMenu={(event) => event.preventDefault()}
                onCanPlay={() => setVideoLoading(false)}
                onEnded={advanceAfterVideo}
                onError={() => setVideoUnavailable(true)}
                onLoadStart={() => setVideoLoading(true)}
                onPlaying={() => setVideoLoading(false)}
                onWaiting={() => setVideoLoading(true)}
                onTimeUpdate={(event) => {
                  const { currentTime, duration } = event.currentTarget;
                  if (Number.isFinite(duration) && duration > 0) {
                    setProgress(Math.min(100, (currentTime / duration) * 100));
                  }
                }}
                playsInline
                preload="auto"
                src={activeChapter.videoUrl}
              />
            )}
            <div
              className={`pointer-events-none absolute inset-0 ${
                activeVideoId && !videoUnavailable ? "" : "hidden"
              }`}
            >
              <div
                className="h-full w-full"
                ref={playerContainerRef}
              />
            </div>
            {activeHasVideo && !videoUnavailable && videoLoading && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/85 backdrop-blur-[1px]"
                data-testid="video-loading"
                role="status"
              >
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                <p className="text-sm font-semibold text-slate-700">Cargando el video de {activeChapter.label}…</p>
                <p className="text-xs text-slate-500">Puede tardar unos segundos según tu conexión.</p>
              </div>
            )}
            {!activeHasVideo || videoUnavailable ? (
              <div
                className="flex max-w-md flex-col items-center px-6 text-center"
                role="status"
              >
                <svg
                  aria-hidden="true"
                  className="mb-3 h-12 w-12 text-slate-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.1 21.21q-1.82-.79-3.17-2.14Q3.58 17.73 2.79 15.9T2 12q0-2.08.79-3.9  .79-1.83 2.14-3.17 1.35-1.36 3.17-2.14Q9.93 2 12 2t3.9.79q1.82.78 3.17 2.14 1.35 1.35 2.14 3.17Q22 9.92 22 12t-.79 3.9q-.79 1.82-2.14 3.17-1.35 1.35-3.17 2.14T12 22q-2.07 0-3.9-.79ZM12 20q1.35 0 2.6-.44t2.3-1.26L5.7 7.1q-.82 1.05-1.26 2.3T4 12q0 3.35 2.33 5.68T12 20Zm6.3-3.1q.82-1.05 1.26-2.3T20 12q0-3.35-2.32-5.68T12 4q-1.35 0-2.6.44T7.1 5.7l11.2 11.2ZM12 12Z" />
                </svg>
                <h3 className="mb-1 text-lg font-bold text-slate-800">
                  Video no disponible
                </h3>
                <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                  La demostración audiovisual se encuentra en mantenimiento o
                  no está disponible temporalmente.
                </p>
              </div>
            ) : activeVideoId && !apiReady ? (
              <p className="text-sm font-medium text-slate-500" role="status">
                Cargando video...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
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
              Brindamos a directores de Recursos Humanos y a empresas con
              equipos por turnos una plataforma para organizar turnos
              rotativos, francos y vacaciones según las reglas de negocio de
              cada empresa.
            </p>
          </div>
        </section>

        {/*
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
        */}

        <ProductDemo />
        <PricingRedirectCard />
      </main>

      <Footer />
    </div>
  );
}
