import { demoVideoUrls } from "../data/demoVideos";

// Reproducción de los videos de la demostración y su precarga.
let youtubeApiPromise;

export function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      const script = document.createElement("script");

      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousCallback === "function") {
          previousCallback();
        }
        resolve(window.YT);
      };

      script.async = true;
      script.onerror = () => reject(new Error("No se pudo cargar YouTube"));
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }

  return youtubeApiPromise;
}

export function youtubeVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : "";
}

export function isDirectVideoUrl(url) {
  return /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url);
}

export function hasPlayableVideo(url) {
  return Boolean(youtubeVideoId(url) || isDirectVideoUrl(url));
}


// Se llama apenas abre la aplicación en una página pública. Si los videos están en
// YouTube, carga el reproductor y abre la conexión con anticipación: cuando el
// visitante llega a la demo, el video empieza enseguida. Si son archivos MP4 solo abre
// la conexión con el servidor, sin descargarlos (descargarlos para cada visitante
// consumiría el tráfico del plan gratuito de Supabase).
let preloaded = false;
export function preloadDemoVideos() {
  if (preloaded) return;
  preloaded = true;
  const urls = Object.values(demoVideoUrls).filter(Boolean);
  const origins = new Set();
  for (const url of urls) {
    try {
      origins.add(new URL(url).origin);
    } catch {
      // enlace inválido: se ignora
    }
  }
  if (urls.some(youtubeVideoId)) {
    origins.add("https://www.youtube.com");
    origins.add("https://i.ytimg.com");
    loadYouTubeApi().catch(() => {});
  }
  for (const origin of origins) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "";
    document.head.appendChild(link);
  }
}
