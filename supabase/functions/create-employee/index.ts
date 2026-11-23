// Función de servidor: alta de un empleado o un encargado con su cuenta de
// acceso (RF-02, RF-07, RNF-08).
//
// Crear un usuario en Supabase Auth requiere la clave de servicio, que nunca
// puede estar en el navegador. Por eso el alta pasa por esta función:
//   1. Verifica que quien la llama tenga sesión y sea Empresa o Encargado.
//      El Encargado solo da de alta empleados de su propia sucursal.
//   2. Valida los datos y la política de contraseñas (RNF-03).
//   3. Crea el usuario en Auth con la contraseña provisoria.
//   4. Crea la ficha del empleado y su cuenta en una sola transacción.
//      Si algo falla, borra el usuario recién creado para no dejar restos.
//
// El rol de la cuenta lo decide el puesto: si está habilitado como Encargado,
// la cuenta nace con rol 'manager'. Esa resolución vive en admin_create_employee.
//
// Despliegue: supabase functions deploy create-employee

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

function generatePassword(length = 12) {
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

function passwordProblems(password: string) {
  const problems: string[] = [];
  if (password.length < 8) problems.push("tener al menos 8 caracteres");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("incluir al menos un carácter especial");
  return problems;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Iniciá sesión para continuar." }, 401);

  // 1. Quién llama: se consulta con su propia sesión, así aplican las políticas RLS
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.slice(7));
  if (userError || !userData?.user) return json({ error: "La sesión no es válida." }, 401);

  const { data: account } = await userClient
    .from("user_accounts")
    .select("company_id, role, is_active, employee_id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!account || !account.is_active || !["company", "manager"].includes(account.role)) {
    return json({ error: "Solo la empresa o un encargado pueden dar de alta personal." }, 403);
  }

  // 2. Validación de datos
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Los datos enviados no son válidos." }, 400);
  }
  const required = ["fullName", "email", "cuil", "jobPosition", "department", "branch", "birthDate", "hireDate"];
  const missing = required.filter((field) => !String(body[field] ?? "").trim());
  if (missing.length) return json({ error: "Completá todos los campos obligatorios." }, 400);

  const email = body.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "El email no es válido." }, 400);
  const cuil = body.cuil.replace(/\D/g, "");
  if (cuil.length !== 11) return json({ error: "El CUIL debe tener 11 dígitos." }, 400);
  if (body.hireDate < body.birthDate) {
    return json({ error: "La fecha de ingreso no puede ser anterior a la fecha de nacimiento." }, 400);
  }
  const password = String(body.password ?? "").trim() || generatePassword();
  const problems = passwordProblems(password);
  if (problems.length) return json({ error: `La contraseña provisoria debe ${problems.join(" y ")}.` }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 3. Límites del encargado: su sucursal y solo cuentas de empleado
  const branchName = body.branch.trim();
  const positionName = body.jobPosition.trim();
  if (account.role === "manager") {
    const { data: own } = await admin
      .from("employees")
      .select("branches(name)")
      .eq("id", account.employee_id)
      .maybeSingle();
    const ownBranch = (own?.branches as { name?: string } | null)?.name ?? "";
    if (ownBranch.toLocaleLowerCase("es") !== branchName.toLocaleLowerCase("es")) {
      return json({ error: "Solo podés dar de alta empleados de tu sucursal." }, 403);
    }
    const { data: position } = await admin
      .from("job_positions")
      .select("is_manager")
      .eq("company_id", account.company_id)
      .ilike("name", positionName)
      .maybeSingle();
    if (position?.is_manager) {
      return json({ error: "Solo la empresa puede dar de alta encargados." }, 403);
    }
  }

  // 4. Usuario en Supabase Auth
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    const message = /already|registered|exists/i.test(createError?.message ?? "")
      ? "Ya existe una cuenta con ese email."
      : "No se pudo crear la cuenta del empleado.";
    return json({ error: message }, 400);
  }

  // 5. Ficha del empleado y cuenta, en una sola transacción
  const { data: employee, error: employeeError } = await admin.rpc("admin_create_employee", {
    p_company_id: account.company_id,
    p_auth_user_id: created.user.id,
    p_full_name: body.fullName,
    p_email: email,
    p_cuil: cuil,
    p_department: body.department,
    p_branch: body.branch,
    p_job_position: body.jobPosition,
    p_birth_date: body.birthDate,
    p_hire_date: body.hireDate,
  });
  if (employeeError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const message = /duplicate key/i.test(employeeError.message)
      ? "Ya existe un empleado con ese CUIL o email en la organización."
      : employeeError.message;
    return json({ error: message }, 400);
  }

  return json({ employee, temporaryPassword: password });
});
