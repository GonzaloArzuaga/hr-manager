-- ============================================================================
-- 10. PLANES, FOTO DE PERFIL E IMPORTACIÓN DE FICHAJES
-- ============================================================================
-- Este bloque está al final de schema_supabase.sql y también se entrega como
-- actualizacion_planes_perfil_fichadas.sql, para un proyecto que ya tiene el
-- schema y las actualizaciones anteriores. No borra datos y se puede correr
-- más de una vez.


-- ----------------------------------------------------------------------------
-- 10.1 Planes
-- ----------------------------------------------------------------------------
-- Cada empresa tiene un plan. El plan fija cuántos empleados activos puede
-- tener; el administrador del sistema edita los planes y asigna el de cada
-- empresa. Los planes son públicos porque se muestran en la página de precios.

CREATE TABLE IF NOT EXISTS public.plans (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  monthly_price NUMERIC(12, 2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  max_employees INTEGER CHECK (max_employees IS NULL OR max_employees > 0),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.plans (code, name, description, monthly_price, max_employees, sort_order) VALUES
  ('operativo', 'Operativo / Pyme', 'Empresas y equipos en crecimiento.', 39, 50, 1),
  ('profesional', 'Profesional / CCT', 'Medianas empresas y plantas bajo convenio.', 103, 250, 2),
  ('a_medida', 'Enterprise / A medida', 'Corporaciones con varias plantas y sedes.', NULL, NULL, 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads plans" ON public.plans;
CREATE POLICY "anyone reads plans" ON public.plans FOR SELECT TO anon, authenticated USING (TRUE);
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_code VARCHAR(30) NOT NULL DEFAULT 'operativo'
  REFERENCES public.plans(code);

DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Límite de empleados activos según el plan
CREATE OR REPLACE FUNCTION private.check_employee_limit(p_company_id BIGINT, p_extra INTEGER DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.plans;
  v_current INTEGER;
BEGIN
  SELECT p.* INTO v_plan FROM public.companies c JOIN public.plans p ON p.code = c.plan_code WHERE c.id = p_company_id;
  IF v_plan.max_employees IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO v_current FROM public.employees
   WHERE company_id = p_company_id AND employment_status <> 'inactive';
  IF v_current + p_extra > v_plan.max_employees THEN
    RAISE EXCEPTION 'Tu plan % permite hasta % empleados activos y ya tenés %. Para sumar más, pedile al administrador del sistema un cambio de plan.',
      v_plan.name, v_plan.max_employees, v_current;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.employees_limit_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.employment_status <> 'inactive'
     AND (TG_OP = 'INSERT' OR OLD.employment_status = 'inactive') THEN
    PERFORM private.check_employee_limit(NEW.company_id, 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_limit_guard ON public.employees;
CREATE TRIGGER employees_limit_guard
  BEFORE INSERT OR UPDATE OF employment_status ON public.employees
  FOR EACH ROW EXECUTE FUNCTION private.employees_limit_guard();

CREATE OR REPLACE FUNCTION public.admin_update_plan(
  p_code TEXT, p_name TEXT, p_description TEXT, p_monthly_price NUMERIC, p_max_employees INTEGER
)
RETURNS public.plans
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.plans;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede editar los planes';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'El plan necesita un nombre';
  END IF;
  UPDATE public.plans
     SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''),
         monthly_price = p_monthly_price, max_employees = p_max_employees
   WHERE code = p_code
  RETURNING * INTO v_plan;
  IF v_plan.code IS NULL THEN
    RAISE EXCEPTION 'El plan no existe';
  END IF;
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_company_plan(p_company_id BIGINT, p_plan_code TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.plans;
  v_current INTEGER;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede cambiar el plan';
  END IF;
  SELECT * INTO v_plan FROM public.plans WHERE code = p_plan_code;
  IF v_plan.code IS NULL THEN
    RAISE EXCEPTION 'El plan no existe';
  END IF;
  SELECT count(*) INTO v_current FROM public.employees
   WHERE company_id = p_company_id AND employment_status <> 'inactive';
  IF v_plan.max_employees IS NOT NULL AND v_current > v_plan.max_employees THEN
    RAISE EXCEPTION 'La empresa tiene % empleados activos y el plan % permite hasta %',
      v_current, v_plan.name, v_plan.max_employees;
  END IF;
  UPDATE public.companies SET plan_code = p_plan_code WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La empresa no existe';
  END IF;
END;
$$;

-- El listado de empresas ahora incluye el plan
DROP FUNCTION IF EXISTS public.admin_list_companies();
CREATE FUNCTION public.admin_list_companies()
RETURNS TABLE (
  id BIGINT,
  legal_name VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  plan_code VARCHAR,
  plan_name VARCHAR,
  plan_max_employees INTEGER,
  employer_email VARCHAR,
  employer_name VARCHAR,
  employer_last_login TIMESTAMPTZ,
  employer_must_change_password BOOLEAN,
  employees_count BIGINT,
  active_employees BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede ver las empresas';
  END IF;
  RETURN QUERY
  SELECT c.id, c.legal_name, c.is_active, c.created_at,
         p.code, p.name, p.max_employees,
         ua.email, ua.display_name, ua.last_login_at, ua.must_change_password,
         (SELECT count(*) FROM public.employees e WHERE e.company_id = c.id),
         (SELECT count(*) FROM public.employees e WHERE e.company_id = c.id AND e.employment_status <> 'inactive')
  FROM public.companies c
  JOIN public.plans p ON p.code = c.plan_code
  LEFT JOIN LATERAL (
    SELECT * FROM public.user_accounts u
     WHERE u.company_id = c.id AND u.role = 'employer'
     ORDER BY u.id LIMIT 1
  ) ua ON TRUE
  ORDER BY c.legal_name;
END;
$$;

-- Indicadores del panel de inicio del administrador
CREATE OR REPLACE FUNCTION public.admin_dashboard()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede ver este panel';
  END IF;
  SELECT jsonb_build_object(
    'companies', (SELECT count(*) FROM public.companies),
    'active_companies', (SELECT count(*) FROM public.companies WHERE is_active),
    'employees', (SELECT count(*) FROM public.employees e JOIN public.companies c ON c.id = e.company_id
                   WHERE c.is_active AND e.employment_status <> 'inactive'),
    'accounts', (SELECT count(*) FROM public.user_accounts WHERE is_active),
    'logins_30d', (SELECT count(*) FROM public.user_accounts WHERE last_login_at > now() - INTERVAL '30 days'),
    'pending_first_login', (SELECT count(*) FROM public.user_accounts WHERE role = 'employer' AND must_change_password),
    'monthly_revenue', (SELECT COALESCE(sum(p.monthly_price), 0) FROM public.companies c
                         JOIN public.plans p ON p.code = c.plan_code WHERE c.is_active),
    'custom_plans', (SELECT count(*) FROM public.companies c JOIN public.plans p ON p.code = c.plan_code
                      WHERE c.is_active AND p.monthly_price IS NULL),
    'by_plan', (SELECT COALESCE(jsonb_agg(r ORDER BY r.sort_order), '[]') FROM (
                  SELECT p.code, p.name, p.sort_order,
                         count(c.id) FILTER (WHERE c.is_active) AS companies
                  FROM public.plans p LEFT JOIN public.companies c ON c.plan_code = p.code
                  GROUP BY p.code, p.name, p.sort_order) r),
    'by_month', (SELECT COALESCE(jsonb_agg(r ORDER BY r.month), '[]') FROM (
                   SELECT to_char(m, 'YYYY-MM') AS month,
                          (SELECT count(*) FROM public.companies c
                            WHERE date_trunc('month', c.created_at) = m) AS companies
                   FROM generate_series(date_trunc('month', now()) - INTERVAL '11 months',
                                        date_trunc('month', now()), INTERVAL '1 month') m) r),
    'near_limit', (SELECT COALESCE(jsonb_agg(r ORDER BY r.usage DESC), '[]') FROM (
                     SELECT c.id, c.legal_name, p.name AS plan_name, p.max_employees,
                            count(e.id) FILTER (WHERE e.employment_status <> 'inactive') AS employees,
                            round(100.0 * count(e.id) FILTER (WHERE e.employment_status <> 'inactive') / p.max_employees) AS usage
                     FROM public.companies c
                     JOIN public.plans p ON p.code = c.plan_code
                     LEFT JOIN public.employees e ON e.company_id = c.id
                     WHERE c.is_active AND p.max_employees IS NOT NULL
                     GROUP BY c.id, c.legal_name, p.name, p.max_employees
                     HAVING count(e.id) FILTER (WHERE e.employment_status <> 'inactive') >= 0.8 * p.max_employees) r),
    'recent', (SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]') FROM (
                 SELECT c.id, c.legal_name, c.created_at, c.is_active, p.name AS plan_name
                 FROM public.companies c JOIN public.plans p ON p.code = c.plan_code
                 ORDER BY c.created_at DESC LIMIT 5) r)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Nombre visible del administrador
CREATE OR REPLACE FUNCTION public.admin_update_profile(p_display_name TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede hacer esto';
  END IF;
  UPDATE public.system_admins SET display_name = NULLIF(btrim(COALESCE(p_display_name, '')), '')
   WHERE auth_user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_company_plan(BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_companies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_plan(BIGINT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 10.2 Foto de perfil
-- ----------------------------------------------------------------------------
-- Bucket público de imágenes chicas. Cada usuario escribe solo en su carpeta,
-- que se llama como su identificador de Supabase Auth.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "users manage own avatar" ON storage.objects;
CREATE POLICY "users manage own avatar" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE OR REPLACE FUNCTION public.set_my_profile_photo(p_storage_key TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_storage_key IS NOT NULL AND split_part(p_storage_key, '/', 1) <> auth.uid()::TEXT THEN
    RAISE EXCEPTION 'La foto tiene que estar en tu carpeta';
  END IF;
  UPDATE public.user_accounts SET profile_photo_storage_key = p_storage_key
   WHERE auth_user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu usuario no tiene una cuenta asociada';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_profile_photo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_profile_photo(TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 10.3 Importación de fichajes desde una planilla
-- ----------------------------------------------------------------------------
-- Recibe las filas ya leídas por la aplicación: legajo, entrada y salida
-- (fecha y hora local). Cada fila se guarda con las mismas validaciones que la
-- carga manual; las que fallan no frenan al resto y vuelven con su error.

CREATE OR REPLACE FUNCTION public.import_attendance(p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
  v_item JSONB;
  v_index BIGINT;
  v_employee_id BIGINT;
  v_results JSONB := '[]'::JSONB;
BEGIN
  IF v_acc.id IS NULL OR v_acc.role <> 'employer' THEN
    RAISE EXCEPTION 'Solo el empleador puede importar fichajes';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'La planilla no tiene filas para importar';
  END IF;
  IF jsonb_array_length(p_rows) > 3000 THEN
    RAISE EXCEPTION 'Se pueden importar hasta 3000 filas por vez';
  END IF;

  FOR v_item, v_index IN SELECT value, ordinality FROM jsonb_array_elements(p_rows) WITH ORDINALITY LOOP
    BEGIN
      SELECT id INTO v_employee_id FROM public.employees
       WHERE company_id = v_acc.company_id AND employee_number = btrim(v_item->>'legajo');
      IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'No existe el legajo %', v_item->>'legajo';
      END IF;
      PERFORM public.register_attendance(
        v_employee_id,
        (v_item->>'entrada')::TIMESTAMP,
        NULLIF(v_item->>'salida', '')::TIMESTAMP
      );
      v_results := v_results || jsonb_build_object('fila', COALESCE((v_item->>'fila')::INT, v_index), 'ok', TRUE);
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object('fila', COALESCE((v_item->>'fila')::INT, v_index), 'ok', FALSE, 'error', SQLERRM);
    END;
  END LOOP;
  RETURN v_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.import_attendance(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_attendance(JSONB) TO authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
