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

export function generatePassword(length = 12) {
  // Siempre con mayúscula, minúscula, número y carácter especial (RNF-03)
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const characters = sets.map(pick);
  while (characters.length < length) characters.push(pick(all));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join("");
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
