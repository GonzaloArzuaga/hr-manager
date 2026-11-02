-- ==========================================================================
-- HRManager: módulos por plan y solicitudes de demostración
-- Ejecutar en el SQL Editor de Supabase después de
-- actualizacion_planes_perfil_fichadas.sql. Se puede ejecutar más de una vez.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 11.1 Módulos que incluye cada plan
-- --------------------------------------------------------------------------
-- Horarios, francos, vacaciones, empleados y configuración están en todos los planes.
-- Los módulos opcionales son: fichajes, sueldos y estadisticas.

-- La primera vez se crea la columna: todos los planes con todo, salvo el básico sin estadísticas.
-- Después lo decide el administrador desde Configuración.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'modules') THEN
    ALTER TABLE public.plans
      ADD COLUMN modules TEXT[] NOT NULL DEFAULT ARRAY['fichajes', 'sueldos', 'estadisticas'];
    UPDATE public.plans SET modules = ARRAY['fichajes', 'sueldos'] WHERE code = 'operativo';
  END IF;
END;
$$;

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_modules_valid;
ALTER TABLE public.plans
  ADD CONSTRAINT plans_modules_valid CHECK (modules <@ ARRAY['fichajes', 'sueldos', 'estadisticas']::TEXT[]);

-- Nombres, precios y límites iguales a la página de Precios. Solo se cambian
-- si siguen con los valores iniciales, para no pisar lo que haya editado el administrador.
UPDATE public.plans
   SET name = 'Básico', monthly_price = 20, max_employees = 20,
       description = 'Ideal para pequeñas empresas y equipos reducidos de hasta 20 colaboradores.'
 WHERE code = 'operativo' AND name = 'Operativo / Pyme' AND monthly_price = 39 AND max_employees = 50;

UPDATE public.plans
   SET name = 'Profesional', monthly_price = 40, max_employees = 100,
       description = 'Ideal para empresas en crecimiento de hasta 100 empleados.'
 WHERE code = 'profesional' AND name = 'Profesional / CCT' AND monthly_price = 103 AND max_employees = 250;

UPDATE public.plans
   SET name = 'Enterprise',
       description = 'Para organizaciones de más de 100 empleados o estructuras corporativas complejas.'
 WHERE code = 'a_medida' AND name = 'Enterprise / A medida';

-- Las empresas del plan básico que ya superan el nuevo límite pasan al profesional
UPDATE public.companies c
   SET plan_code = 'profesional'
 WHERE c.plan_code = 'operativo'
   AND (SELECT count(*) FROM public.employees e
         WHERE e.company_id = c.id AND e.employment_status <> 'inactive')
       > COALESCE((SELECT max_employees FROM public.plans WHERE code = 'operativo'), 2147483647);

-- Edición de planes: ahora también los módulos
DROP FUNCTION IF EXISTS public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER);
CREATE OR REPLACE FUNCTION public.admin_update_plan(
  p_code TEXT, p_name TEXT, p_description TEXT, p_monthly_price NUMERIC, p_max_employees INTEGER,
  p_modules TEXT[] DEFAULT NULL
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
  IF p_monthly_price IS NOT NULL AND p_monthly_price < 0 THEN
    RAISE EXCEPTION 'El precio no puede ser negativo';
  END IF;
  IF p_max_employees IS NOT NULL AND p_max_employees < 1 THEN
    RAISE EXCEPTION 'El máximo de empleados tiene que ser al menos 1';
  END IF;
  IF p_modules IS NOT NULL AND NOT (p_modules <@ ARRAY['fichajes', 'sueldos', 'estadisticas']::TEXT[]) THEN
    RAISE EXCEPTION 'Hay un módulo que no existe';
  END IF;
  UPDATE public.plans
     SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''),
         monthly_price = p_monthly_price, max_employees = p_max_employees,
         modules = COALESCE(p_modules, modules)
   WHERE code = p_code
  RETURNING * INTO v_plan;
  IF v_plan.code IS NULL THEN
    RAISE EXCEPTION 'El plan no existe';
  END IF;
  RETURN v_plan;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT[]) TO authenticated;

-- --------------------------------------------------------------------------
-- 11.2 Solicitudes de demostración (formulario de la página de Precios)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  contact_name TEXT CHECK (char_length(contact_name) <= 120),
  company_name TEXT CHECK (char_length(company_name) <= 160),
  plan_code TEXT REFERENCES public.plans(code) ON UPDATE CASCADE ON DELETE SET NULL,
  message TEXT CHECK (char_length(message) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'converted', 'discarded')),
  admin_notes TEXT CHECK (char_length(admin_notes) <= 1000),
  company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON public.demo_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS demo_requests_email_idx ON public.demo_requests (lower(email), created_at DESC);

DROP TRIGGER IF EXISTS demo_requests_set_updated_at ON public.demo_requests;
CREATE TRIGGER demo_requests_set_updated_at
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Solo el administrador del sistema las lee. Nadie escribe directo: se usan las funciones.
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_requests FROM anon, authenticated;
GRANT SELECT ON public.demo_requests TO authenticated;
DROP POLICY IF EXISTS "admins read demo requests" ON public.demo_requests;
CREATE POLICY "admins read demo requests" ON public.demo_requests
  FOR SELECT TO authenticated USING (private.is_system_admin());

-- Envío público del formulario. Si el mismo email ya tiene una solicitud
-- abierta del último día, se actualiza en lugar de duplicarla.
CREATE OR REPLACE FUNCTION public.request_demo(
  p_email TEXT, p_plan_code TEXT DEFAULT NULL, p_contact_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL, p_message TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(p_email, '')));
  v_plan TEXT := NULLIF(btrim(COALESCE(p_plan_code, '')), '');
  v_existing BIGINT;
BEGIN
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'Ingresá un correo electrónico válido';
  END IF;
  IF v_plan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan) THEN
    v_plan := NULL;
  END IF;
  IF (SELECT count(*) FROM public.demo_requests WHERE created_at > now() - INTERVAL '1 hour') >= 60 THEN
    RAISE EXCEPTION 'Recibimos muchas solicitudes en este momento. Probá de nuevo en un rato.';
  END IF;

  SELECT id INTO v_existing
    FROM public.demo_requests
   WHERE lower(email) = v_email AND status = 'pending' AND created_at > now() - INTERVAL '1 day'
   ORDER BY created_at DESC LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.demo_requests
       SET plan_code = COALESCE(v_plan, plan_code),
           contact_name = COALESCE(NULLIF(left(btrim(p_contact_name), 120), ''), contact_name),
           company_name = COALESCE(NULLIF(left(btrim(p_company_name), 160), ''), company_name),
           message = COALESCE(NULLIF(left(btrim(p_message), 1000), ''), message)
     WHERE id = v_existing;
    RETURN 'updated';
  END IF;

  INSERT INTO public.demo_requests (email, plan_code, contact_name, company_name, message)
  VALUES (v_email, v_plan,
          NULLIF(left(btrim(COALESCE(p_contact_name, '')), 120), ''),
          NULLIF(left(btrim(COALESCE(p_company_name, '')), 160), ''),
          NULLIF(left(btrim(COALESCE(p_message, '')), 1000), ''));
  RETURN 'created';
END;
$$;

-- Seguimiento del administrador: estado, notas y empresa creada a partir de la solicitud
CREATE OR REPLACE FUNCTION public.admin_update_demo_request(
  p_id BIGINT, p_status TEXT, p_admin_notes TEXT DEFAULT NULL, p_company_id BIGINT DEFAULT NULL
)
RETURNS public.demo_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.demo_requests;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede gestionar las solicitudes';
  END IF;
  IF p_status NOT IN ('pending', 'contacted', 'converted', 'discarded') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  UPDATE public.demo_requests
     SET status = p_status,
         admin_notes = COALESCE(left(p_admin_notes, 1000), admin_notes),
         company_id = COALESCE(p_company_id, company_id)
   WHERE id = p_id
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no existe';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_demo(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_demo(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT) TO authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
