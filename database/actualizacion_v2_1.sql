-- ==========================================================================
-- Versión 2.1
--  1. Vuelve a crear admin_update_demo_request con los datos de contacto
--     (si la base no tenía actualizacion_resultado_solicitudes.sql, guardar una
--     solicitud como "Contactada" fallaba).
--  2. Regla de la empresa: el empleado puede registrar su propia entrada y salida.
--  3. Un día con vacaciones, franco aprobado o licencia no cuenta como llegada tarde.
-- Se puede ejecutar más de una vez.
-- ==========================================================================

-- 1. Solicitudes de demostración --------------------------------------------

DROP FUNCTION IF EXISTS public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT);

CREATE OR REPLACE FUNCTION public.admin_update_demo_request(
  p_id BIGINT,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_company_id BIGINT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_plan_code TEXT DEFAULT NULL
)
RETURNS public.demo_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.demo_requests;
  v_email TEXT;
  v_plan TEXT;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede gestionar las solicitudes';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'contacted', 'converted', 'discarded') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  IF p_email IS NOT NULL THEN
    v_email := lower(btrim(p_email));
    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
      RAISE EXCEPTION 'Ingresá un correo electrónico válido';
    END IF;
  END IF;
  IF p_contact_name IS NOT NULL AND char_length(btrim(p_contact_name)) > 120 THEN
    RAISE EXCEPTION 'El nombre del empleador no puede superar los 120 caracteres';
  END IF;
  IF p_company_name IS NOT NULL AND char_length(btrim(p_company_name)) > 160 THEN
    RAISE EXCEPTION 'La razón social no puede superar los 160 caracteres';
  END IF;
  IF p_plan_code IS NOT NULL THEN
    v_plan := NULLIF(btrim(p_plan_code), '');
    IF v_plan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan) THEN
      RAISE EXCEPTION 'El plan seleccionado no existe';
    END IF;
  END IF;

  UPDATE public.demo_requests
     SET status = p_status,
         admin_notes = CASE WHEN p_admin_notes IS NULL THEN admin_notes ELSE left(p_admin_notes, 1000) END,
         company_id = COALESCE(p_company_id, company_id),
         email = CASE WHEN p_email IS NULL THEN email ELSE v_email END,
         contact_name = CASE WHEN p_contact_name IS NULL THEN contact_name ELSE NULLIF(btrim(p_contact_name), '') END,
         company_name = CASE WHEN p_company_name IS NULL THEN company_name ELSE NULLIF(btrim(p_company_name), '') END,
         plan_code = CASE WHEN p_plan_code IS NULL THEN plan_code ELSE v_plan END
   WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no existe';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 2. Fichaje propio del empleado ---------------------------------------------

ALTER TABLE public.business_rules
  ADD COLUMN IF NOT EXISTS employee_self_clock_in BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.business_rules.employee_self_clock_in IS
  'Si es TRUE, el empleado registra su entrada y salida desde su panel. Si es FALSE, solo el empleador carga los fichajes.';

-- 3. Días justificados ------------------------------------------------------

-- TRUE si ese día el empleado tiene vacaciones aprobadas, franco aprobado o está de licencia
CREATE OR REPLACE FUNCTION private.is_justified_day(p_employee_id BIGINT, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.vacation_requests v
            WHERE v.employee_id = p_employee_id
              AND v.status = 'approved'
              AND p_date BETWEEN v.start_date AND v.end_date)
      OR EXISTS (
           SELECT 1
             FROM public.days_off_request_dates d
             JOIN public.days_off_requests r ON r.id = d.request_id
            WHERE r.employee_id = p_employee_id
              AND r.status = 'approved'
              AND d.requested_date = p_date)
      OR EXISTS (
           SELECT 1 FROM public.employees e
            WHERE e.id = p_employee_id
              AND e.employment_status = 'on_leave');
$$;

-- Se ejecuta en cada fichaje, venga del empleado, del empleador o de la importación
CREATE OR REPLACE FUNCTION private.check_attendance_record()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
BEGIN
  -- El empleado solo puede fichar si la empresa lo permite
  IF v_acc.id IS NOT NULL AND v_acc.role = 'employee' AND NOT COALESCE(
       (SELECT b.employee_self_clock_in FROM public.business_rules b WHERE b.company_id = NEW.company_id),
       TRUE) THEN
    RAISE EXCEPTION 'Tu empresa no tiene habilitado el fichaje desde el panel del empleado. Pedile al empleador que lo registre.';
  END IF;

  -- Con vacaciones, franco o licencia no se computa tardanza
  IF NEW.status = 'late' AND private.is_justified_day(NEW.employee_id, NEW.work_date) THEN
    NEW.status := 'present';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_records_check ON public.attendance_records;
CREATE TRIGGER attendance_records_check
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION private.check_attendance_record();

-- Los fichajes que ya estaban cargados como tarde en un día justificado
UPDATE public.attendance_records a
   SET status = 'present'
 WHERE a.status = 'late'
   AND private.is_justified_day(a.employee_id, a.work_date);

NOTIFY pgrst, 'reload schema';
