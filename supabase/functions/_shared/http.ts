// Utilidades compartidas por las funciones de servidor.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  const values = crypto.getRandomValues(new Uint32Array(12));
  const base = Array.from(values.slice(0, 11), (v) => alphabet[v % alphabet.length]).join("");
  return base + symbols[values[11] % symbols.length];
}

export function passwordProblems(password: string) {
  const problems: string[] = [];
  if (password.length < 8) problems.push("tener al menos 8 caracteres");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("incluir al menos un carácter especial");
  return problems;
}

export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

// Devuelve el usuario que llama (validado con su propia sesión), un cliente
// con sus permisos y un cliente con la clave de servicio.
export async function getCaller(req: Request): Promise<
  | { error: Response }
  | { userId: string; userClient: SupabaseClient; admin: SupabaseClient }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { error: json({ error: "Iniciá sesión para continuar." }, 401) };

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
  if (error || !data?.user) return { error: json({ error: "La sesión no es válida." }, 401) };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  return { userId: data.user.id, userClient, admin };
}

export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function authErrorMessage(message = "") {
  return /already|registered|exists/i.test(message)
    ? "Ya existe una cuenta con ese email."
    : "No se pudo crear la cuenta.";
}
