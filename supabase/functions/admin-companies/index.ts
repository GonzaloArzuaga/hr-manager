// Función de servidor del administrador del sistema (RF-01).
//
// Acciones:
//   create          Crea la empresa con su plan, sus reglas por defecto y la
//                   cuenta de su empleador con contraseña provisoria.
//   reset_password  Le genera al empleador una contraseña provisoria nueva.
//
// Solo la puede usar alguien registrado en la tabla system_admins.
// Despliegue: supabase functions deploy admin-companies

import {
  authErrorMessage,
  corsHeaders,
  generatePassword,
  getCaller,
  isEmail,
  json,
  passwordProblems,
  readBody,
} from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const caller = await getCaller(req);
  if ("error" in caller) return caller.error;
  const { userId, admin } = caller;

  const { data: adminRow } = await admin
    .from("system_admins")
    .select("auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (!adminRow) return json({ error: "Solo el administrador del sistema puede hacer esto." }, 403);

  const body = await readBody(req);
  if (!body) return json({ error: "Los datos enviados no son válidos." }, 400);

  if (body.action === "create") {
    const legalName = String(body.legalName ?? "").trim();
    const employerName = String(body.employerName ?? "").trim();
    const email = String(body.employerEmail ?? "").trim().toLowerCase();
    if (!legalName || !employerName || !email) return json({ error: "Completá todos los campos obligatorios." }, 400);
    if (!isEmail(email)) return json({ error: "El email no es válido." }, 400);

    const { data: existing } = await admin.from("companies").select("id").ilike("legal_name", legalName).maybeSingle();
    if (existing) return json({ error: "Ya existe una empresa con esa razón social." }, 400);

    const password = String(body.password ?? "").trim() || generatePassword();
    const problems = passwordProblems(password);
    if (problems.length) return json({ error: `La contraseña provisoria debe ${problems.join(" y ")}.` }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) return json({ error: authErrorMessage(createError?.message) }, 400);

    const { data: companyId, error: companyError } = await admin.rpc("admin_create_company", {
      p_legal_name: legalName,
      p_employer_email: email,
      p_employer_name: employerName,
    });
    if (companyError) {
      await admin.auth.admin.deleteUser(created.user.id);
      const message = /duplicate key/i.test(companyError.message)
        ? "Ya existe una cuenta con ese email."
        : companyError.message;
      return json({ error: message }, 400);
    }

    await admin.from("user_accounts").update({ must_change_password: true }).eq("auth_user_id", created.user.id);
    const planCode = String(body.planCode ?? "").trim();
    if (planCode) await admin.from("companies").update({ plan_code: planCode }).eq("id", companyId);
    return json({ companyId, temporaryPassword: password });
  }

  if (body.action === "reset_password") {
    const companyId = Number(body.companyId);
    const { data: account } = await admin
      .from("user_accounts")
      .select("id, auth_user_id, email")
      .eq("company_id", companyId)
      .eq("role", "employer")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (!account) return json({ error: "La empresa no tiene empleador." }, 404);

    const password = generatePassword();
    const { error } = await admin.auth.admin.updateUserById(account.auth_user_id, { password });
    if (error) return json({ error: "No se pudo cambiar la contraseña." }, 400);
    await admin.from("user_accounts").update({ must_change_password: true }).eq("id", account.id);
    return json({ email: account.email, temporaryPassword: password });
  }

  return json({ error: "Acción desconocida." }, 400);
});
