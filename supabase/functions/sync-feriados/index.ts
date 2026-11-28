// Función de servidor: sincronización del calendario de feriados nacionales.
//
// Los feriados de Argentina cambian: hay feriados trasladables que se corren
// cada año y puentes turísticos que se fijan por decreto. Para que el sistema
// no quede desactualizado, el calendario se trae de una API pública en lugar
// de estar escrito en el código.
//
// Fuente: https://api.argentinadatos.com/v1/feriados/{año}, que devuelve una
// lista de objetos con fecha, tipo y nombre. No requiere clave. La autoridad
// última sigue siendo la Jefatura de Gabinete, que publica el calendario en
// argentina.gob.ar/jefatura; si alguna vez difieren, el administrador puede
// corregir el feriado a mano desde el panel.
//
// Por qué una función de servidor y no una llamada desde el navegador:
//   · la API no habilita CORS para cualquier origen;
//   · así la escritura pasa por una sola puerta, con la verificación de que
//     quien sincroniza es el administrador del sistema;
//   · si la API no responde, el calendario que ya está cargado se conserva.
//
// Despliegue: supabase functions deploy sync-feriados

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ORIGEN = "https://api.argentinadatos.com/v1/feriados";

// Tipos que maneja la base. Cualquier otro valor se guarda como "otro".
const TIPOS = ["inamovible", "trasladable", "puente", "no_laborable", "local", "otro"];

type Feriado = { fecha: string; tipo: string; nombre: string };

// La API podría cambiar los nombres de sus campos o devolver algo inesperado.
// Antes de escribir nada se valida fila por fila y se descarta lo que no
// sirve, para no dejar el calendario a medias ni con datos basura.
function normalizar(crudo: unknown, anio: number): Feriado[] {
  if (!Array.isArray(crudo)) return [];
  const vistas = new Set<string>();
  const salida: Feriado[] = [];

  for (const fila of crudo) {
    if (!fila || typeof fila !== "object") continue;
    const f = fila as Record<string, unknown>;
    const fecha = String(f.fecha ?? f.date ?? "").trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    if (Number(fecha.slice(0, 4)) !== anio) continue;
    if (Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) continue;
    if (vistas.has(fecha)) continue;
    vistas.add(fecha);

    const tipoCrudo = String(f.tipo ?? f.type ?? "otro").trim().toLowerCase();
    const tipo = TIPOS.includes(tipoCrudo) ? tipoCrudo : "otro";
    const nombre = String(f.nombre ?? f.motivo ?? f.name ?? "").trim() || "Feriado";

    salida.push({ fecha, tipo, nombre: nombre.slice(0, 160) });
  }
  return salida;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Iniciá sesión para continuar." }, 401);
  }

  let body: { year?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const anio = Number(body.year ?? new Date().getFullYear());
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return json({ error: "El año indicado no es válido." }, 400);
  }

  // Se consulta con la sesión de quien llama: la verificación de que es el
  // administrador del sistema vive en admin_sync_holidays.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // 1. Traer el calendario del año
  let crudo: unknown;
  try {
    const respuesta = await fetch(`${ORIGEN}/${anio}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!respuesta.ok) {
      return json(
        { error: `El servicio de feriados respondió ${respuesta.status}. El calendario que ya estaba cargado se conserva.` },
        502,
      );
    }
    crudo = await respuesta.json();
  } catch {
    return json(
      { error: "No se pudo contactar al servicio de feriados. El calendario que ya estaba cargado se conserva." },
      502,
    );
  }

  const feriados = normalizar(crudo, anio);
  if (!feriados.length) {
    return json(
      { error: `El servicio no devolvió feriados para ${anio}. No se modificó el calendario.` },
      502,
    );
  }

  // 2. Guardarlos. La función de base reemplaza el año entero en una sola
  //    transacción y respeta los feriados cargados a mano.
  const { data, error } = await userClient.rpc("admin_sync_holidays", {
    p_year: anio,
    p_rows: feriados,
  });

  if (error) return json({ error: error.message }, 400);

  return json({ year: anio, total: data, source: "argentinadatos" });
});
