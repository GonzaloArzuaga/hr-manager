// Función de servidor: cambio del email de un empleado.
//
// El email es también el usuario con el que ingresa, así que hay que cambiarlo
// en Supabase Auth, y eso requiere la clave de servicio. Si el empleado no
// tiene cuenta de acceso, solo se actualiza su ficha.
// Despliegue: supabase functions deploy update-employee-email

import { corsHeaders, getCaller, isEmail, json, readBody } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const caller = await getCaller(req);
  if ("error" in caller) return caller.error;
  const { userId, userClient, admin } = caller;

  const { data: account } = await userClient
    .from("user_accounts")
    .select("company_id, role, is_active")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (!account || account.role !== "employer" || !account.is_active) {
    return json({ error: "Solo el empleador puede cambiar el email de un empleado." }, 403);
  }

  const body = await readBody(req);
  const employeeId = Number(body?.employeeId);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!employeeId || !email) return json({ error: "Completá el email." }, 400);
  if (!isEmail(email)) return json({ error: "El email no es válido." }, 400);

  const { data: employee } = await admin
    .from("employees")
    .select("id, email")
    .eq("id", employeeId)
    .eq("company_id", account.company_id)
    .maybeSingle();
  if (!employee) return json({ error: "El empleado no pertenece a tu organización." }, 404);
  if (employee.email === email) return json({ email });

  const { data: target } = await admin
    .from("user_accounts")
    .select("auth_user_id")
    .eq("employee_id", employeeId)
    .eq("company_id", account.company_id)
    .maybeSingle();

  const { data: taken } = await admin.from("user_accounts").select("id").ilike("email", email).maybeSingle();
  if (taken) return json({ error: "Ya existe una cuenta con ese email." }, 400);

  if (target) {
    const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { email, email_confirm: true });
    if (error) {
      const message = /already|registered|exists/i.test(error.message)
        ? "Ya existe una cuenta con ese email."
        : "No se pudo cambiar el email de acceso.";
      return json({ error: message }, 400);
    }
  }

  const { error: updateError } = await admin.rpc("admin_update_employee_email", {
    p_company_id: account.company_id,
    p_employee_id: employeeId,
    p_email: email,
  });
  if (updateError) {
    if (target) await admin.auth.admin.updateUserById(target.auth_user_id, { email: employee.email, email_confirm: true });
    return json({ error: updateError.message }, 400);
  }

  return json({ email });
});
