-- ============================================================================
-- 9. ADMINISTRADOR DEL SISTEMA, EDICIÓN DE EMPLEADOS Y NOTIFICACIONES
-- ============================================================================
-- Este bloque está al final de schema_supabase.sql y también se entrega como
-- actualizacion_admin_notificaciones.sql, para correrlo en un proyecto que ya
-- tiene el schema. No borra datos y se puede correr más de una vez.


-- ----------------------------------------------------------------------------
-- 9.1 Empresas suspendidas
-- ----------------------------------------------------------------------------
-- Una empresa suspendida conserva sus datos, pero ninguna de sus cuentas puede
-- operar: la cuenta actual deja de existir para las políticas de seguridad.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION private.current_account()
RETURNS public.user_accounts
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ua.*
  FROM public.user_accounts ua
  JOIN public.companies c ON c.id = ua.company_id AND c.is_active
  WHERE ua.auth_user_id = auth.uid() AND ua.is_active
$$;


-- ----------------------------------------------------------------------------
-- 9.2 Administradores del sistema (RF-01)
-- ----------------------------------------------------------------------------
-- No pertenecen a ninguna empresa. El primero se da de alta desde el SQL
-- Editor (ver README); después administra las empresas desde /admin.

CREATE TABLE IF NOT EXISTS public.system_admins (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads self" ON public.system_admins;
CREATE POLICY "admin reads self" ON public.system_admins
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE OR REPLACE FUNCTION private.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.system_admins WHERE auth_user_id = auth.uid()) $$;

-- Listado de empresas con su empleador y su dotación
CREATE OR REPLACE FUNCTION public.admin_list_companies()
RETURNS TABLE (
  id BIGINT,
  legal_name VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
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
         ua.email, ua.display_name, ua.last_login_at, ua.must_change_password,
         (SELECT count(*) FROM public.employees e WHERE e.company_id = c.id),
         (SELECT count(*) FROM public.employees e WHERE e.company_id = c.id AND e.employment_status <> 'inactive')
  FROM public.companies c
  LEFT JOIN LATERAL (
    SELECT * FROM public.user_accounts u
     WHERE u.company_id = c.id AND u.role = 'employer'
     ORDER BY u.id LIMIT 1
  ) ua ON TRUE
  ORDER BY c.legal_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_company_status(p_company_id BIGINT, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede suspender empresas';
  END IF;
  UPDATE public.companies SET is_active = p_active WHERE id = p_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La empresa no existe';
  END IF;
END;
$$;

-- La función de servidor admin-companies crea la empresa con la clave de servicio
GRANT EXECUTE ON FUNCTION public.admin_create_company(TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_list_companies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_company_status(BIGINT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_status(BIGINT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_system_admin() TO authenticated;


-- ----------------------------------------------------------------------------
-- 9.3 Edición de los datos de un empleado
-- ----------------------------------------------------------------------------
-- El email de acceso se cambia aparte, con la función de servidor
-- update-employee-email, porque también hay que cambiarlo en Supabase Auth.

CREATE OR REPLACE FUNCTION public.update_employee(
  p_employee_id BIGINT,
  p_full_name TEXT,
  p_cuil TEXT,
  p_department TEXT,
  p_branch TEXT,
  p_job_position TEXT,
  p_birth_date DATE,
  p_hire_date DATE,
  p_collective_agreement TEXT DEFAULT NULL
)
RETURNS public.employees
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company BIGINT := private.current_company_id();
  v_cuil TEXT := regexp_replace(COALESCE(p_cuil, ''), '\D', '', 'g');
  v_dep BIGINT; v_branch BIGINT; v_pos BIGINT;
  v_emp public.employees;
BEGIN
  IF NOT private.is_employer() THEN
    RAISE EXCEPTION 'Solo el empleador puede editar empleados';
  END IF;
  IF btrim(COALESCE(p_full_name, '')) = '' OR btrim(COALESCE(p_department, '')) = ''
     OR btrim(COALESCE(p_branch, '')) = '' OR btrim(COALESCE(p_job_position, '')) = ''
     OR p_birth_date IS NULL OR p_hire_date IS NULL THEN
    RAISE EXCEPTION 'Completá todos los campos obligatorios';
  END IF;
  IF length(v_cuil) <> 11 THEN
    RAISE EXCEPTION 'El CUIL debe tener 11 dígitos';
  END IF;
  IF p_hire_date < p_birth_date THEN
    RAISE EXCEPTION 'La fecha de ingreso no puede ser anterior a la fecha de nacimiento';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = p_employee_id AND company_id = v_company;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu organización';
  END IF;

  INSERT INTO public.departments (company_id, name) VALUES (v_company, btrim(p_department))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_dep;
  INSERT INTO public.branches (company_id, name) VALUES (v_company, btrim(p_branch))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_branch;
  INSERT INTO public.job_positions (company_id, name) VALUES (v_company, btrim(p_job_position))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_pos;

  UPDATE public.employees
     SET full_name = btrim(p_full_name),
         cuil = v_cuil,
         department_id = v_dep,
         branch_id = v_branch,
         job_position_id = v_pos,
         birth_date = p_birth_date,
         hire_date = p_hire_date,
         collective_agreement = NULLIF(btrim(COALESCE(p_collective_agreement, '')), '')
   WHERE id = p_employee_id AND company_id = v_company
  RETURNING * INTO v_emp;

  UPDATE public.user_accounts SET display_name = v_emp.full_name
   WHERE employee_id = v_emp.id AND company_id = v_company;

  RETURN v_emp;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ya existe otro empleado con ese CUIL en la organización';
END;
$$;

-- Usada por la función de servidor update-employee-email con la clave de servicio
CREATE OR REPLACE FUNCTION public.admin_update_employee_email(
  p_company_id BIGINT,
  p_employee_id BIGINT,
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.employees SET email = lower(btrim(p_email))
   WHERE id = p_employee_id AND company_id = p_company_id;
  UPDATE public.user_accounts SET email = lower(btrim(p_email))
   WHERE employee_id = p_employee_id AND company_id = p_company_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ya existe una cuenta con ese email';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_employee(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_employee(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_employee_email(BIGINT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_employee_email(BIGINT, BIGINT, TEXT) TO service_role;


-- ----------------------------------------------------------------------------
-- 9.4 Notificaciones
-- ----------------------------------------------------------------------------
-- Las crea la base sola, con disparadores, cuando pasa algo que le interesa a
-- alguien: una solicitud nueva o respondida, un horario asignado o un recibo
-- cargado. Cada usuario ve solo las suyas y solo puede marcarlas como leídas.

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_account_id BIGINT NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(200),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON public.notifications (recipient_account_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipient reads own" ON public.notifications;
CREATE POLICY "recipient reads own" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_account_id = private.current_account_id());
DROP POLICY IF EXISTS "recipient marks own" ON public.notifications;
CREATE POLICY "recipient marks own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_account_id = private.current_account_id())
  WITH CHECK (recipient_account_id = private.current_account_id());

-- Desde la aplicación solo se puede leer y marcar como leída
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION private.notify_employers(
  p_company_id BIGINT, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (company_id, recipient_account_id, kind, title, body, link)
  SELECT p_company_id, ua.id, p_kind, p_title, p_body, p_link
  FROM public.user_accounts ua
  WHERE ua.company_id = p_company_id AND ua.role = 'employer' AND ua.is_active;
$$;

CREATE OR REPLACE FUNCTION private.notify_employee(
  p_company_id BIGINT, p_employee_id BIGINT, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (company_id, recipient_account_id, kind, title, body, link)
  SELECT p_company_id, ua.id, p_kind, p_title, p_body, p_link
  FROM public.user_accounts ua
  WHERE ua.company_id = p_company_id AND ua.employee_id = p_employee_id AND ua.is_active;
$$;

CREATE OR REPLACE FUNCTION private.employee_name(p_employee_id BIGINT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT full_name FROM public.employees WHERE id = p_employee_id $$;

CREATE OR REPLACE FUNCTION private.short_date(p_date DATE)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT to_char(p_date, 'DD/MM/YYYY') $$;

-- Francos. Se evalúa al confirmar la transacción, cuando ya están cargados los días.
CREATE OR REPLACE FUNCTION private.notify_days_off()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := private.employee_name(NEW.employee_id);
  v_dates TEXT;
  v_count INTEGER;
BEGIN
  SELECT string_agg(private.short_date(requested_date), ', ' ORDER BY requested_date), count(*)
    INTO v_dates, v_count
    FROM public.days_off_request_dates WHERE request_id = NEW.id;
  v_dates := COALESCE(v_dates, '');

  IF TG_OP = 'INSERT' THEN
    IF NEW.request_type = 'employer_assignment' THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'days_off_assigned',
        'Te asignaron francos', 'Días: ' || v_dates || '.', '/empleado/francos');
    ELSIF NEW.status = 'pending' THEN
      PERFORM private.notify_employers(NEW.company_id, 'days_off_requested',
        'Nueva solicitud de franco',
        v_name || ' pidió ' || v_count || CASE WHEN v_count = 1 THEN ' día: ' ELSE ' días: ' END || v_dates || '.',
        '/empleador/francos');
    ELSIF NEW.status = 'approved' THEN
      PERFORM private.notify_employers(NEW.company_id, 'days_off_auto_approved',
        'Franco aprobado automáticamente',
        v_name || ' se tomó franco el ' || v_dates || '. Cumplía las reglas configuradas.',
        '/empleador/francos');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id,
        'days_off_' || NEW.status,
        CASE WHEN NEW.status = 'approved' THEN 'Tu solicitud de franco fue aprobada'
             ELSE 'Tu solicitud de franco fue rechazada' END,
        'Días: ' || v_dates || '.' || COALESCE(' Motivo: ' || NULLIF(btrim(NEW.resolution_note), ''), ''),
        '/empleado/francos');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM private.notify_employers(NEW.company_id, 'days_off_cancelled',
        'Solicitud de franco cancelada', v_name || ' canceló su pedido para el ' || v_dates || '.',
        '/empleador/francos');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS days_off_requests_notify_insert ON public.days_off_requests;
CREATE CONSTRAINT TRIGGER days_off_requests_notify_insert
  AFTER INSERT ON public.days_off_requests
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION private.notify_days_off();
DROP TRIGGER IF EXISTS days_off_requests_notify_update ON public.days_off_requests;
CREATE TRIGGER days_off_requests_notify_update
  AFTER UPDATE OF status ON public.days_off_requests
  FOR EACH ROW EXECUTE FUNCTION private.notify_days_off();

-- Vacaciones
CREATE OR REPLACE FUNCTION private.notify_vacation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := private.employee_name(NEW.employee_id);
  v_range TEXT := 'del ' || private.short_date(NEW.start_date) || ' al ' || private.short_date(NEW.end_date)
    || ' (' || NEW.requested_days || ' días)';
  v_by_employer BOOLEAN;
BEGIN
  SELECT role = 'employer' INTO v_by_employer FROM public.user_accounts WHERE id = NEW.submitted_by_user_id;

  IF TG_OP = 'INSERT' THEN
    IF v_by_employer THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'vacation_assigned',
        'Te asignaron vacaciones', 'Período ' || v_range || '.', '/empleado/vacaciones');
    ELSIF NEW.status = 'pending' THEN
      PERFORM private.notify_employers(NEW.company_id, 'vacation_requested',
        'Nueva solicitud de vacaciones', v_name || ' pidió vacaciones ' || v_range || '.',
        '/empleador/vacaciones');
    ELSIF NEW.status = 'approved' THEN
      PERFORM private.notify_employers(NEW.company_id, 'vacation_auto_approved',
        'Vacaciones aprobadas automáticamente', v_name || ' se tomará vacaciones ' || v_range || '.',
        '/empleador/vacaciones');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id,
        'vacation_' || NEW.status,
        CASE WHEN NEW.status = 'approved' THEN 'Tus vacaciones fueron aprobadas'
             ELSE 'Tu solicitud de vacaciones fue rechazada' END,
        'Período ' || v_range || '.' || COALESCE(' Motivo: ' || NULLIF(btrim(NEW.resolution_note), ''), ''),
        '/empleado/vacaciones');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM private.notify_employers(NEW.company_id, 'vacation_cancelled',
        'Solicitud de vacaciones cancelada', v_name || ' canceló su pedido ' || v_range || '.',
        '/empleador/vacaciones');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS vacation_requests_notify ON public.vacation_requests;
CREATE TRIGGER vacation_requests_notify
  AFTER INSERT OR UPDATE OF status ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION private.notify_vacation();

-- Horarios
CREATE OR REPLACE FUNCTION private.notify_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week TEXT := 'la semana del ' || private.short_date(NEW.week_start_date);
BEGIN
  IF NEW.status = 'cancelled' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'schedule_removed',
        'Se quitó tu horario', 'Ya no tenés turno asignado para ' || v_week || '.', '/empleado/horarios');
    END IF;
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status
     AND OLD.shift_type_id = NEW.shift_type_id
     AND OLD.starts_at_snapshot = NEW.starts_at_snapshot
     AND OLD.ends_at_snapshot = NEW.ends_at_snapshot THEN
    RETURN NULL;
  END IF;
  PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'schedule_assigned',
    CASE WHEN TG_OP = 'INSERT' THEN 'Tenés horario asignado' ELSE 'Cambió tu horario' END,
    NEW.shift_name_snapshot || ', de ' || to_char(NEW.starts_at_snapshot, 'HH24:MI') || ' a '
      || to_char(NEW.ends_at_snapshot, 'HH24:MI') || ', para ' || v_week || '.',
    '/empleado/horarios');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS work_schedules_notify ON public.work_schedules;
CREATE TRIGGER work_schedules_notify
  AFTER INSERT OR UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION private.notify_schedule();

-- Recibos de sueldo
CREATE OR REPLACE FUNCTION private.notify_payroll()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_period DATE;
  v_months TEXT[] := ARRAY['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                           'septiembre','octubre','noviembre','diciembre'];
BEGIN
  IF NEW.status <> 'paid' OR (TG_OP = 'UPDATE' AND OLD.status = 'paid') THEN
    RETURN NULL;
  END IF;
  SELECT starts_on INTO v_period FROM public.payroll_periods WHERE id = NEW.payroll_period_id;
  PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'payroll_paid',
    'Ya está tu recibo de sueldo',
    CASE NEW.payment_type
      WHEN 'aguinaldo_first_installment' THEN 'Aguinaldo, primera cuota'
      WHEN 'aguinaldo_second_installment' THEN 'Aguinaldo, segunda cuota'
      ELSE 'Sueldo' END
      || ' de ' || v_months[EXTRACT(MONTH FROM v_period)::INT] || ' ' || EXTRACT(YEAR FROM v_period)::INT || '.',
    '/empleado/sueldos');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS payroll_records_notify ON public.payroll_records;
CREATE TRIGGER payroll_records_notify
  AFTER INSERT OR UPDATE OF status ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION private.notify_payroll();

-- Aviso en tiempo real: la aplicación escucha las notificaciones nuevas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
