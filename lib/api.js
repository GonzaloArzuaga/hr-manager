// Operaciones que modifican datos en Supabase.
// Las validaciones de negocio (aviso previo, francos por semana, días de
// vacaciones disponibles, permisos) las hace la base de datos; acá solo se
// envían los datos y se devuelve el mensaje de error tal como llega.

import { supabase, errorMessage, unwrap } from "./supabaseClient";
import { refreshData, store } from "./store";

async function rpc(name, params, fallback) {
  const result = await supabase.rpc(name, params);
  return unwrap(result, fallback);
}

// --------------------------------------------------------------------------
// Acceso
// --------------------------------------------------------------------------

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(errorMessage(error));
  await supabase.rpc("touch_last_login");
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.assign("/login");
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/login/change-password`,
  });
  // Por seguridad no se informa si el email existe o no (RF-08)
  if (error && !/not found|user/i.test(error.message)) {
    throw new Error(errorMessage(error, "No se pudo enviar el correo de recuperación."));
  }
}

// RNF-03: al menos 8 caracteres y un carácter especial
export function passwordProblems(password) {
  const problems = [];
  if (password.length < 8) problems.push("tener al menos 8 caracteres");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("incluir al menos un carácter especial");
  return problems;
}

export async function updatePassword(newPassword, { currentPassword } = {}) {
  const problems = passwordProblems(newPassword);
  if (problems.length) throw new Error(`La contraseña debe ${problems.join(" y ")}.`);

  if (currentPassword !== undefined) {
    // Se verifica la contraseña actual antes de cambiarla
    const email = store.session?.user?.email;
    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (error) throw new Error("La contraseña actual no es correcta.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (/different from the old|same_password/i.test(error.message)) {
      throw new Error("La nueva contraseña tiene que ser distinta de la anterior.");
    }
    throw new Error(errorMessage(error, "No se pudo actualizar la contraseña."));
  }
  await rpc("mark_password_changed", {}, "No se pudo registrar el cambio de contraseña.");
}

// --------------------------------------------------------------------------
// Configuración: reglas de negocio y tipos de turno
// --------------------------------------------------------------------------

export async function saveRules(rules) {
  unwrap(
    await supabase
      .from("business_rules")
      .update({
        weekly_days_off: rules.weeklyDaysOff,
        days_off_notice: rules.daysOffNotice,
        vacation_notice: rules.vacationNotice,
        requires_days_off_approval: rules.requiresDaysOffApproval,
        requires_vacation_approval: rules.requiresVacationApproval,
        updated_by_user_id: store.account.id,
      })
      .eq("company_id", store.account.company_id),
    "No se pudieron guardar las reglas.",
  );

  const ranges = rules.vacationRanges ?? [];
  const keepIds = ranges.filter((range) => typeof range.id === "number" && store.rules.vacationRanges.some((r) => r.id === range.id)).map((range) => range.id);
  const removed = store.rules.vacationRanges.filter((range) => !keepIds.includes(range.id));
  if (removed.length) {
    unwrap(
      await supabase.from("vacation_entitlement_ranges").delete().in("id", removed.map((range) => range.id)),
      "No se pudieron actualizar los tramos de vacaciones.",
    );
  }
  for (const range of ranges) {
    const row = {
      company_id: store.account.company_id,
      seniority_years_from: range.from,
      seniority_years_to: range.to,
      entitlement_days: range.days,
    };
    const query = keepIds.includes(range.id)
      ? supabase.from("vacation_entitlement_ranges").update(row).eq("id", range.id)
      : supabase.from("vacation_entitlement_ranges").insert(row);
    unwrap(await query, "No se pudieron actualizar los tramos de vacaciones.");
  }
  await refreshData();
}

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncShiftTypes(shiftTypes) {
  const existing = new Map(store.shiftTypes.map((shift) => [shift.id, shift]));
  const keep = new Set();
  for (const shift of shiftTypes) {
    const row = { name: shift.name.trim(), starts_at: shift.start, ends_at: shift.end };
    if (existing.has(shift.id)) {
      keep.add(shift.id);
      const before = existing.get(shift.id);
      if (before.name !== row.name || before.start !== row.starts_at || before.end !== row.ends_at) {
        unwrap(await supabase.from("shift_types").update(row).eq("id", before.dbId), "No se pudo actualizar el turno.");
      }
    } else {
      unwrap(
        await supabase.from("shift_types").insert({
          ...row,
          company_id: store.account.company_id,
          code: `${slug(row.name)}-${Date.now().toString(36)}`,
        }),
        "No se pudo crear el tipo de turno.",
      );
    }
  }
  // Los turnos quitados se desactivan: los horarios ya asignados los siguen usando
  const removed = store.shiftTypes.filter((shift) => !keep.has(shift.id));
  if (removed.length) {
    unwrap(
      await supabase.from("shift_types").update({ is_active: false }).in("id", removed.map((shift) => shift.dbId)),
      "No se pudo quitar el tipo de turno.",
    );
  }
  await refreshData();
}

// --------------------------------------------------------------------------
// Empleados
// --------------------------------------------------------------------------

export async function createEmployee(form) {
  const { data, error } = await supabase.functions.invoke("create-employee", {
    body: {
      fullName: form.name,
      email: form.email,
      password: form.password,
      cuil: form.cuil,
      jobPosition: form.role,
      department: form.department,
      branch: form.branch,
      birthDate: form.birthDate,
      hireDate: form.hireDate,
    },
  });
  if (error) {
    // El cuerpo del error trae el mensaje de la función
    let message = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // se usa el mensaje genérico
    }
    throw new Error(errorMessage({ message }, "No se pudo dar de alta al empleado."));
  }
  await refreshData();
  return data;
}

export async function setEmployeeStatus(employeeDbId, status) {
  await rpc("set_employee_status", { p_employee_id: employeeDbId, p_status: status }, "No se pudo cambiar el estado.");
  await refreshData();
}

// --------------------------------------------------------------------------
// Horarios
// --------------------------------------------------------------------------

export async function assignSchedule({ employeeDbId, weekStartDate, shiftType }) {
  unwrap(
    await supabase.from("work_schedules").upsert(
      {
        company_id: store.account.company_id,
        employee_id: employeeDbId,
        week_start_date: weekStartDate,
        shift_type_id: shiftType.dbId,
        shift_name_snapshot: shiftType.name,
        starts_at_snapshot: shiftType.start,
        ends_at_snapshot: shiftType.end,
        status: "confirmed",
        created_by_user_id: store.account.id,
      },
      { onConflict: "company_id,employee_id,week_start_date" },
    ),
    "No se pudo asignar el horario.",
  );
  await refreshData();
}

export async function deleteSchedule(scheduleId) {
  const { error } = await supabase.from("work_schedules").delete().eq("id", scheduleId);
  if (error) {
    // Si ya tiene fichajes asociados no se puede borrar: se marca como cancelado
    if (/foreign key/i.test(error.message)) {
      unwrap(
        await supabase.from("work_schedules").update({ status: "cancelled" }).eq("id", scheduleId),
        "No se pudo eliminar el horario.",
      );
    } else {
      throw new Error(errorMessage(error, "No se pudo eliminar el horario."));
    }
  }
  await refreshData();
}

// --------------------------------------------------------------------------
// Francos
// --------------------------------------------------------------------------

export async function submitDaysOff({ dates, reason, category = "ordinary" }) {
  const result = await rpc(
    "submit_days_off_request",
    { p_dates: dates, p_reason: reason, p_category: category },
    "No se pudo enviar la solicitud.",
  );
  await refreshData();
  return result;
}

export async function assignDaysOff({ employeeDbId, dates, reason }) {
  await rpc(
    "assign_days_off",
    { p_employee_id: employeeDbId, p_dates: dates, p_reason: reason, p_category: "ordinary" },
    "No se pudo asignar el franco.",
  );
  await refreshData();
}

export async function resolveDaysOff(requestId, approve, note) {
  await rpc(
    "resolve_days_off_request",
    { p_request_id: requestId, p_approve: approve, p_note: note ?? null },
    "No se pudo responder la solicitud.",
  );
  await refreshData();
}

export async function cancelMyRequest(kind, requestId) {
  await rpc("cancel_my_request", { p_kind: kind, p_request_id: requestId }, "No se pudo cancelar la solicitud.");
  await refreshData();
}

// --------------------------------------------------------------------------
// Vacaciones
// --------------------------------------------------------------------------

export async function submitVacation({ startDate, endDate, periodYear }) {
  const result = await rpc(
    "submit_vacation_request",
    { p_start: startDate, p_end: endDate, p_period_year: periodYear ?? null },
    "No se pudo enviar la solicitud.",
  );
  await refreshData();
  return result;
}

export async function assignVacation({ employeeDbId, startDate, endDate, periodYear }) {
  await rpc(
    "assign_vacation",
    { p_employee_id: employeeDbId, p_start: startDate, p_end: endDate, p_period_year: periodYear ?? null },
    "No se pudieron registrar las vacaciones.",
  );
  await refreshData();
}

export async function resolveVacation(requestId, approve, note) {
  await rpc(
    "resolve_vacation_request",
    { p_request_id: requestId, p_approve: approve, p_note: note ?? null },
    "No se pudo responder la solicitud.",
  );
  await refreshData();
}

// --------------------------------------------------------------------------
// Sueldos y recibos
// --------------------------------------------------------------------------

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export async function registerPayroll({ employeeDbId, periodStart, amount, paymentType, file }) {
  if (!file || file.type !== "application/pdf") throw new Error("Adjuntá el recibo en formato PDF.");
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("El recibo no puede pesar más de 5 MB.");

  const companyId = store.account.company_id;
  const period = unwrap(
    await supabase
      .from("payroll_periods")
      .upsert({ company_id: companyId, starts_on: periodStart }, { onConflict: "company_id,starts_on" })
      .select("id")
      .single(),
    "No se pudo registrar el período.",
  );

  const storageKey = `${companyId}/${employeeDbId}/${periodStart.slice(0, 7)}-${paymentType}-${Date.now()}.pdf`;
  const upload = await supabase.storage
    .from("payroll-receipts")
    .upload(storageKey, file, { contentType: "application/pdf", upsert: false });
  if (upload.error) throw new Error(errorMessage(upload.error, "No se pudo subir el recibo."));

  const today = new Date();
  const paymentDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  const { error } = await supabase.from("payroll_records").insert({
    company_id: companyId,
    employee_id: employeeDbId,
    payroll_period_id: period.id,
    payment_type: paymentType,
    net_amount: amount,
    payment_date: paymentDate,
    status: "paid",
    receipt_original_file_name: file.name,
    receipt_storage_key: storageKey,
    receipt_content_type: "application/pdf",
    receipt_size_bytes: file.size,
    receipt_uploaded_at: new Date().toISOString(),
    receipt_uploaded_by_user_id: store.account.id,
    created_by_user_id: store.account.id,
  });
  if (error) {
    // Si no se pudo registrar el pago, se borra el archivo subido
    await supabase.storage.from("payroll-receipts").remove([storageKey]);
    if (/duplicate key/i.test(error.message)) {
      throw new Error("Ese empleado ya tiene un pago de ese tipo registrado para el período.");
    }
    throw new Error(errorMessage(error, "No se pudo registrar el pago."));
  }
  await refreshData();
}

// URL temporal para ver o descargar un recibo (RNF-06)
export async function getReceiptUrl(storageKey, { download = false } = {}) {
  if (!storageKey) throw new Error("Este pago no tiene recibo adjunto.");
  if (String(storageKey).startsWith("demo/")) {
    throw new Error("Es un recibo de los datos de demostración: no tiene un PDF cargado.");
  }
  const { data, error } = await supabase.storage
    .from("payroll-receipts")
    .createSignedUrl(storageKey, 60 * 5, download ? { download: true } : undefined);
  if (error) throw new Error(errorMessage(error, "No se pudo abrir el recibo."));
  return data.signedUrl;
}

export async function openReceipt(storageKey, options) {
  const url = await getReceiptUrl(storageKey, options);
  window.open(url, "_blank", "noopener");
}

// --------------------------------------------------------------------------
// Fichaje
// --------------------------------------------------------------------------

export async function clockIn() {
  const record = await rpc("clock_in", {}, "No se pudo registrar la entrada.");
  await refreshData();
  return record;
}

export async function clockOut() {
  const record = await rpc("clock_out", {}, "No se pudo registrar la salida.");
  await refreshData();
  return record;
}

// Fichaje cargado o corregido por el empleador. Las horas van en hora local
// con formato YYYY-MM-DDTHH:MM; la base calcula si llegó tarde.
export async function registerAttendance({ employeeDbId, clockIn, clockOut }) {
  const record = await rpc(
    "register_attendance",
    { p_employee_id: employeeDbId, p_clock_in: clockIn, p_clock_out: clockOut || null },
    "No se pudo guardar el fichaje.",
  );
  await refreshData();
  return record;
}

export async function deleteAttendance(recordId) {
  const { data, error } = await supabase.from("attendance_records").delete().eq("id", recordId).select("id");
  if (error) throw new Error(errorMessage(error, "No se pudo eliminar el fichaje."));
  if (!data?.length) throw new Error("El fichaje no existe o ya fue eliminado.");
  await refreshData();
}

// Llama a una función de servidor y devuelve el mensaje de error que ella manda
async function invokeFunction(name, body, fallback) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch {
      // se usa el mensaje genérico
    }
    throw new Error(errorMessage({ message }, fallback));
  }
  return data;
}

// --------------------------------------------------------------------------
// Edición de empleados
// --------------------------------------------------------------------------

export async function updateEmployee(employeeDbId, form, { emailChanged = false } = {}) {
  if (emailChanged) {
    await invokeFunction(
      "update-employee-email",
      { employeeId: employeeDbId, email: form.email },
      "No se pudo cambiar el email.",
    );
  }
  await rpc(
    "update_employee",
    {
      p_employee_id: employeeDbId,
      p_full_name: form.name,
      p_cuil: form.cuil,
      p_department: form.department,
      p_branch: form.branch,
      p_job_position: form.role,
      p_birth_date: form.birthDate,
      p_hire_date: form.hireDate,
      p_collective_agreement: form.collectiveAgreement || null,
    },
    "No se pudieron guardar los cambios.",
  );
  await refreshData();
}

// --------------------------------------------------------------------------
// Administrador del sistema
// --------------------------------------------------------------------------

export async function adminListCompanies() {
  return rpc("admin_list_companies", {}, "No se pudieron cargar las empresas.");
}

export async function adminCreateCompany({ legalName, employerName, employerEmail, password, planCode }) {
  return invokeFunction(
    "admin-companies",
    { action: "create", legalName, employerName, employerEmail, password, planCode },
    "No se pudo crear la empresa.",
  );
}

export async function adminResetEmployerPassword(companyId) {
  return invokeFunction(
    "admin-companies",
    { action: "reset_password", companyId },
    "No se pudo generar la contraseña.",
  );
}

export async function adminSetCompanyStatus(companyId, active) {
  await rpc("admin_set_company_status", { p_company_id: companyId, p_active: active }, "No se pudo cambiar el estado.");
}

export async function listPlans() {
  const { data, error } = await supabase.from("plans").select("*").order("sort_order");
  if (error) throw new Error(errorMessage(error, "No se pudieron cargar los planes."));
  return data;
}

export async function adminDashboard() {
  return rpc("admin_dashboard", {}, "No se pudo cargar el panel.");
}

export async function adminSetCompanyPlan(companyId, planCode) {
  await rpc("admin_set_company_plan", { p_company_id: companyId, p_plan_code: planCode }, "No se pudo cambiar el plan.");
}

export async function adminUpdatePlan(plan) {
  return rpc(
    "admin_update_plan",
    {
      p_code: plan.code,
      p_name: plan.name,
      p_description: plan.description ?? "",
      p_monthly_price: plan.monthly_price === "" || plan.monthly_price === null ? null : Number(plan.monthly_price),
      p_max_employees: plan.max_employees === "" || plan.max_employees === null ? null : Number(plan.max_employees),
    },
    "No se pudo guardar el plan.",
  );
}

export async function adminUpdateProfile(displayName) {
  await rpc("admin_update_profile", { p_display_name: displayName }, "No se pudo guardar el nombre.");
  store.user = { ...store.user, name: displayName || store.user.email };
  window.dispatchEvent(new Event("profile-updated"));
}

// --------------------------------------------------------------------------
// Puestos, áreas y sucursales
// --------------------------------------------------------------------------

const catalogNames = { job_positions: "un puesto", departments: "un área", branches: "una sucursal" };

export async function saveCatalogItem(table, { id, name, is_active }) {
  const values = {};
  if (name !== undefined) {
    values.name = name.trim().replace(/\s+/g, " ");
    const rawKey = { job_positions: "jobPositions", departments: "departments", branches: "branches" }[table];
    const repeated = (store.raw?.[rawKey] ?? []).some(
      (item) => item.id !== id && item.name.toLocaleLowerCase("es") === values.name.toLocaleLowerCase("es"),
    );
    if (repeated) throw new Error(`Ya existe ${catalogNames[table]} con ese nombre.`);
  }
  if (is_active !== undefined) values.is_active = is_active;
  const query = id
    ? supabase.from(table).update(values).eq("id", id)
    : supabase.from(table).insert({ ...values, company_id: store.company.id });
  const { error } = await query;
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) throw new Error(`Ya existe ${catalogNames[table]} con ese nombre.`);
    throw new Error(errorMessage(error, "No se pudo guardar."));
  }
  await refreshData();
}

export async function deleteCatalogItem(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    if (/foreign key|violates/i.test(error.message)) throw new Error("No se puede eliminar porque hay empleados que lo tienen asignado. Podés desactivarlo.");
    throw new Error(errorMessage(error, "No se pudo eliminar."));
  }
  await refreshData();
}

// --------------------------------------------------------------------------
// Foto de perfil
// --------------------------------------------------------------------------

// Recorta la imagen al centro y la achica a 256 x 256 en JPEG
async function squareJpeg(file, size = 256) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d").drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.88),
  );
}

export async function uploadProfilePhoto(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Elegí una imagen PNG, JPEG o WEBP.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("La imagen no puede pesar más de 8 MB.");
  const blob = await squareJpeg(file);
  const userId = store.session.user.id;
  const key = `${userId}/${Date.now()}.jpg`;
  const previous = store.account?.profile_photo_storage_key;
  const { error } = await supabase.storage.from("avatars").upload(key, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(errorMessage(error, "No se pudo subir la foto."));
  try {
    await rpc("set_my_profile_photo", { p_storage_key: key }, "No se pudo guardar la foto.");
  } catch (saveError) {
    await supabase.storage.from("avatars").remove([key]);
    throw saveError;
  }
  if (previous) await supabase.storage.from("avatars").remove([previous]);
  store.account.profile_photo_storage_key = key;
  await refreshData();
  window.dispatchEvent(new Event("profile-updated"));
}

export async function removeProfilePhoto() {
  const previous = store.account?.profile_photo_storage_key;
  await rpc("set_my_profile_photo", { p_storage_key: null }, "No se pudo quitar la foto.");
  if (previous) await supabase.storage.from("avatars").remove([previous]);
  store.account.profile_photo_storage_key = null;
  await refreshData();
  window.dispatchEvent(new Event("profile-updated"));
}

// Fichajes leídos de una planilla. Devuelve el resultado de cada fila.
export async function importAttendance(rows) {
  const results = await rpc("import_attendance", { p_rows: rows }, "No se pudieron importar los fichajes.");
  await refreshData();
  return results;
}
