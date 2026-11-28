// Función de servidor: ingreso con CUIL (RF-04).
//
// Se ingresa únicamente con la identificación tributaria de once dígitos: el
// CUIL de la persona o el CUIT de la organización. El correo electrónico no
// sirve para entrar; queda solo como dato de contacto y como destino de la
// recuperación de contraseña.
//
// Supabase Auth identifica a cada usuario por su correo, así que la
// traducción se hace acá, del lado del servidor:
//
//   1. Se descartan guiones y espacios y se exige que queden once dígitos.
//   2. Con la clave de servicio se busca a qué cuenta corresponde: primero
//      entre los empleados, después entre las organizaciones y por último
//      entre los administradores del sistema.
//   3. Se inicia la sesión y se devuelven los tokens, que el navegador carga
//      en su propio cliente.
//
// Si la identificación no existe, la respuesta es la misma que cuando la
// contraseña es incorrecta. Así nadie puede averiguar qué CUIL está dado de
// alta probando identificaciones contra esta función.
//
// Despliegue: supabase functions deploy login-cuil --no-verify-jwt
//
// La función se invoca sin sesión previa, por eso va con --no-verify-jwt.

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

// Un único mensaje para todos los casos de CUIL o contraseña incorrectos,
// para no revelar cuál de los dos falló ni qué CUIL está dado de alta.
const CREDENCIALES = "El CUIL o la contraseña son incorrectos.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let body: { identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "No se recibieron los datos de ingreso." }, 400);
  }

  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");
  if (!identifier || !password) {
    return json({ error: "Completá el CUIL y la contraseña." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Resolver el CUIL a un correo de Auth
  const digits = identifier.replace(/\D/g, "");
  if (digits.length !== 11) {
    return json({ error: "Ingresá tu CUIL, sin puntos ni guiones: son 11 dígitos." }, 400);
  }

  let email: string | null = null;

  // Empleado o encargado: el CUIL está en su ficha. Se consulta en dos pasos
  // en lugar de con una relación anidada, para no depender de cómo se
  // resuelve la clave foránea compuesta entre las dos tablas.
  const { data: empleado } = await admin
    .from("employees")
    .select("id")
    .eq("cuil", digits)
    .limit(1)
    .maybeSingle();

  if (empleado?.id) {
    const { data: cuenta } = await admin
      .from("user_accounts")
      .select("email, is_active")
      .eq("employee_id", empleado.id)
      .limit(1)
      .maybeSingle();
    if (cuenta?.is_active) email = cuenta.email;
  }

  // Cuenta Empresa: el CUIT está en la organización.
  if (!email) {
    const { data: empresa } = await admin
      .from("companies")
      .select("id")
      .eq("tax_id", digits)
      .maybeSingle();
    if (empresa?.id) {
      const { data: cuentaEmpresa } = await admin
        .from("user_accounts")
        .select("email, is_active")
        .eq("company_id", empresa.id)
        .eq("role", "company")
        .order("id")
        .limit(1)
        .maybeSingle();
      if (cuentaEmpresa?.is_active) email = cuentaEmpresa.email;
    }
  }

  // Administrador del sistema: no es empleado de ninguna organización, su
  // CUIL vive en su propia tabla.
  if (!email) {
    const { data: adminFila } = await admin
      .from("system_admins")
      .select("auth_user_id")
      .eq("cuil", digits)
      .limit(1)
      .maybeSingle();
    if (adminFila?.auth_user_id) {
      const { data: usuario } = await admin.auth.admin.getUserById(adminFila.auth_user_id);
      if (usuario?.user?.email) email = usuario.user.email;
    }
  }

  // 2. Iniciar la sesión. Si no se resolvió la identificación, se responde el
  //    mismo error que ante una contraseña incorrecta.
  if (!email) return json({ error: CREDENCIALES }, 400);

  const publico = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await publico.auth.signInWithPassword({ email, password });

  if (error || !data?.session) {
    return json({ error: CREDENCIALES }, 400);
  }

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
