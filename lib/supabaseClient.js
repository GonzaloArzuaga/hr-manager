import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copiá .env.example como .env y completalos con los datos de Project Settings > API de Supabase.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Convierte los errores de Supabase en un mensaje legible para la interfaz.
// Los errores del motor de reglas ya vienen redactados en español desde la base.
export function errorMessage(error, fallback = "No se pudo completar la operación.") {
  if (!error) return fallback;
  const raw = error.message || String(error);
  if (/Invalid login credentials/i.test(raw)) return "El email o la contraseña son incorrectos.";
  if (/Failed to fetch|NetworkError/i.test(raw)) return "No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.";
  if (/duplicate key|already registered|already been registered/i.test(raw)) return "Ya existe un registro con esos datos.";
  if (/row-level security|permission denied/i.test(raw)) return "No tenés permiso para realizar esta acción.";
  return raw || fallback;
}

// Lanza el error si la respuesta de Supabase vino con error; si no, devuelve los datos.
export function unwrap({ data, error }, fallback) {
  if (error) throw new Error(errorMessage(error, fallback));
  return data;
}
