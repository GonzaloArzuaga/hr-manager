-- ============================================================================
-- HR Manager - Actualización v3: jerarquía de la empresa
-- ============================================================================
-- Reemplaza el único usuario Empleador por dos niveles dentro de la empresa:
--
--   Empresa   (role = 'company')  creado por el administrador del sistema.
--                                 Acceso total a su empresa. Crea cuentas de
--                                 Encargado y de Empleado. Es el único que ve
--                                 y modifica la configuración del negocio.
--                                 No tiene nombre visible editable ni foto.
--   Encargado (role = 'manager')  creado por la Empresa. Es un empleado cuyo
--                                 puesto está habilitado como Encargado. Solo
--                                 gestiona a los empleados de su sucursal y
--                                 solo puede crear cuentas de Empleado.
--   Empleado  (role = 'employee') sin cambios.
--
-- El administrador del sistema (system_admins) no cambia.
--
-- Ejecutar una sola vez sobre un proyecto que ya tenga el esquema anterior.
-- Los cambios también están integrados en database/schema.sql.
-- ============================================================================


-- ============================================================================
-- 1. PUESTOS HABILITADOS COMO ENCARGADO
-- ============================================================================

ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.job_positions.is_manager IS
  'El puesto habilita a quien lo ocupa como Encargado de su sucursal.';


-- ============================================================================
-- 2. ROLES DE LAS CUENTAS
-- ============================================================================

ALTER TABLE public.user_accounts DROP CONSTRAINT IF EXISTS user_accounts_role_check;
UPDATE public.user_accounts SET role = 'company' WHERE role = 'employer';
ALTER TABLE public.user_accounts ADD CONSTRAINT user_accounts_role_check
  CHECK (role IN ('company', 'manager', 'employee'));

-- El Encargado siempre tiene ficha de empleado: de ahí sale su sucursal.
ALTER TABLE public.user_accounts DROP CONSTRAINT IF EXISTS user_accounts_manager_has_employee;
ALTER TABLE public.user_accounts ADD CONSTRAINT user_accounts_manager_has_employee
  CHECK (role <> 'manager' OR employee_id IS NOT NULL);


-- ============================================================================
-- 3. FUNCIONES DE CONTEXTO
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_company()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT COALESCE((private.current_account()).role = 'company', FALSE) $$;

CREATE OR REPLACE FUNCTION private.is_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT COALESCE((private.current_account()).role = 'manager', FALSE) $$;

-- Quien gestiona personal: la Empresa o un Encargado.
CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT COALESCE((private.current_account()).role IN ('company', 'manager'), FALSE) $$;

-- Nombre anterior, conservado para no romper funciones que ya lo usan.
CREATE OR REPLACE FUNCTION private.is_employer()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT private.is_staff() $$;

-- Sucursal del Encargado. NULL para la Empresa, que no está acotada.
CREATE OR REPLACE FUNCTION private.current_branch_id()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.branch_id
  FROM public.employees e
  WHERE e.id = (private.current_account()).employee_id
    AND private.is_manager()
$$;

-- Sucursal de un empleado, sin pasar por RLS: la usan las políticas.
CREATE OR REPLACE FUNCTION private.employee_branch(p_employee_id BIGINT)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT branch_id FROM public.employees WHERE id = p_employee_id $$;

CREATE OR REPLACE FUNCTION private.days_off_request_branch(p_request_id BIGINT)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.employee_branch(r.employee_id)
  FROM public.days_off_requests r WHERE r.id = p_request_id
$$;

-- ¿El empleado indicado entra en lo que puede gestionar quien llama?
CREATE OR REPLACE FUNCTION private.in_scope(p_employee_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = p_employee_id
      AND e.company_id = private.current_company_id()
      AND (private.is_company()
           OR (private.is_manager() AND e.branch_id = private.current_branch_id()))
  )
$$;

-- ¿El puesto indicado habilita como Encargado?
CREATE OR REPLACE FUNCTION private.position_is_manager(p_position_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT COALESCE((SELECT is_manager FROM public.job_positions WHERE id = p_position_id), FALSE) $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;


-- ============================================================================
-- 4. SEGURIDAD A NIVEL DE FILA
-- ============================================================================
-- La Empresa administra todos los datos de su organización. El Encargado solo
-- las filas de los empleados de su sucursal. El Empleado solo las propias.
--
-- Rendimiento: las funciones de contexto se escriben como (SELECT f()), sin
-- argumentos que dependan de la fila. Así PostgreSQL las resuelve una sola vez
-- por consulta en lugar de una vez por fila, que sobre las tablas con un año
-- de datos es la diferencia entre milisegundos y segundos. Por el mismo motivo
-- el alcance del Encargado se compara contra una lista de empleados calculada
-- de antemano y no con una búsqueda por cada fila.

-- Empleados que puede gestionar quien llama: todos los de la empresa si es la
-- Empresa, los de su sucursal si es Encargado.
CREATE OR REPLACE FUNCTION private.scoped_employee_ids()
RETURNS BIGINT[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT array_agg(e.id)
  FROM public.employees e
  WHERE e.company_id = private.current_company_id()
    AND (private.is_company()
         OR (private.is_manager() AND e.branch_id = private.current_branch_id()))
$fn$;

-- Solicitudes de franco dentro de ese alcance, para la tabla de fechas, que no
-- guarda el empleado sino la solicitud.
CREATE OR REPLACE FUNCTION private.scoped_days_off_request_ids()
RETURNS BIGINT[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT array_agg(r.id)
  FROM public.days_off_requests r
  WHERE r.company_id = private.current_company_id()
    AND r.employee_id = ANY (private.scoped_employee_ids())
$fn$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- 4.1 Empresa -----------------------------------------------------------------
DROP POLICY IF EXISTS "employer updates own company" ON public.companies;
DROP POLICY IF EXISTS "company updates own company" ON public.companies;
CREATE POLICY "company updates own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = (SELECT private.current_company_id()) AND (SELECT private.is_company()))
  WITH CHECK (id = (SELECT private.current_company_id()));

-- 4.2 Catálogos y configuración: todos leen, solo la Empresa modifica ---------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'branches', 'job_positions', 'shift_types',
    'vacation_entitlement_ranges', 'payroll_periods'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "employer manages" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "company manages" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "company manages" ON public.%I FOR ALL TO authenticated
         USING ((SELECT private.is_company())
                AND company_id = (SELECT private.current_company_id()))
         WITH CHECK ((SELECT private.is_company())
                AND company_id = (SELECT private.current_company_id()))', t);
  END LOOP;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'branches', 'job_positions', 'shift_types',
    'vacation_entitlement_ranges', 'payroll_periods'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "members read" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "members read" ON public.%I FOR SELECT TO authenticated
         USING (company_id = (SELECT private.current_company_id()))', t);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "members read own company" ON public.companies;
CREATE POLICY "members read own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = (SELECT private.current_company_id()));

DROP POLICY IF EXISTS "members read rules" ON public.business_rules;
CREATE POLICY "members read rules" ON public.business_rules
  FOR SELECT TO authenticated
  USING (company_id = (SELECT private.current_company_id()));

DROP POLICY IF EXISTS "user reads own account" ON public.user_accounts;
CREATE POLICY "user reads own account" ON public.user_accounts
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- Los períodos de liquidación los crea la carga de sueldos, que también hace
-- el Encargado de la sucursal.
DROP POLICY IF EXISTS "manager creates payroll periods" ON public.payroll_periods;
CREATE POLICY "manager creates payroll periods" ON public.payroll_periods
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_manager())
              AND company_id = (SELECT private.current_company_id()));

-- 4.3 Reglas de negocio: solo la Empresa las modifica (RF-30 a RF-32) ---------
DROP POLICY IF EXISTS "employer updates rules" ON public.business_rules;
DROP POLICY IF EXISTS "company updates rules" ON public.business_rules;
CREATE POLICY "company updates rules" ON public.business_rules
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()))
  WITH CHECK (company_id = (SELECT private.current_company_id()));

-- 4.4 Empleados ---------------------------------------------------------------
DROP POLICY IF EXISTS "employer manages employees" ON public.employees;
DROP POLICY IF EXISTS "company manages employees" ON public.employees;
CREATE POLICY "company manages employees" ON public.employees
  FOR ALL TO authenticated
  USING ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()))
  WITH CHECK ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()));

DROP POLICY IF EXISTS "manager manages branch employees" ON public.employees;
CREATE POLICY "manager manages branch employees" ON public.employees
  FOR ALL TO authenticated
  USING ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND branch_id = (SELECT private.current_branch_id()))
  WITH CHECK ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND branch_id = (SELECT private.current_branch_id()));

DROP POLICY IF EXISTS "employee reads self" ON public.employees;
CREATE POLICY "employee reads self" ON public.employees
  FOR SELECT TO authenticated
  USING (id = (SELECT private.current_employee_id()));

-- 4.5 Cuentas de acceso -------------------------------------------------------
DROP POLICY IF EXISTS "employer reads company accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "employer updates company accounts" ON public.user_accounts;

DROP POLICY IF EXISTS "company reads company accounts" ON public.user_accounts;
CREATE POLICY "company reads company accounts" ON public.user_accounts
  FOR SELECT TO authenticated
  USING ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()));

DROP POLICY IF EXISTS "company updates company accounts" ON public.user_accounts;
CREATE POLICY "company updates company accounts" ON public.user_accounts
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()))
  WITH CHECK (company_id = (SELECT private.current_company_id()));

-- El Encargado ve y da de baja únicamente cuentas de empleado de su sucursal.
DROP POLICY IF EXISTS "manager reads branch accounts" ON public.user_accounts;
CREATE POLICY "manager reads branch accounts" ON public.user_accounts
  FOR SELECT TO authenticated
  USING ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND employee_id IN (SELECT unnest(private.scoped_employee_ids())));

DROP POLICY IF EXISTS "manager updates branch accounts" ON public.user_accounts;
CREATE POLICY "manager updates branch accounts" ON public.user_accounts
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND role = 'employee'
         AND employee_id IN (SELECT unnest(private.scoped_employee_ids())))
  WITH CHECK (company_id = (SELECT private.current_company_id()) AND role = 'employee');

-- 4.6 Tablas operativas -------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'work_schedules', 'attendance_records', 'days_off_requests',
    'vacation_periods', 'vacation_requests', 'payroll_records'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "employer manages" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "company manages" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "manager manages branch" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "company manages" ON public.%I FOR ALL TO authenticated
         USING ((SELECT private.is_company())
                AND company_id = (SELECT private.current_company_id()))
         WITH CHECK ((SELECT private.is_company())
                AND company_id = (SELECT private.current_company_id()))', t);
    EXECUTE format(
      'CREATE POLICY "manager manages branch" ON public.%I FOR ALL TO authenticated
         USING ((SELECT private.is_manager())
                AND company_id = (SELECT private.current_company_id())
                AND employee_id IN (SELECT unnest(private.scoped_employee_ids())))
         WITH CHECK ((SELECT private.is_manager())
                AND company_id = (SELECT private.current_company_id())
                AND employee_id IN (SELECT unnest(private.scoped_employee_ids())))', t);
    -- La política del empleado venía del esquema anterior sin envolver sus
    -- funciones, de modo que se evaluaban una vez por fila. Se rehace igual
    -- pero con el mismo criterio de rendimiento.
    EXECUTE format('DROP POLICY IF EXISTS "employee reads own" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "employee reads own" ON public.%I FOR SELECT TO authenticated
         USING (company_id = (SELECT private.current_company_id())
                AND employee_id = (SELECT private.current_employee_id()))', t);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "employer manages dates" ON public.days_off_request_dates;
DROP POLICY IF EXISTS "company manages dates" ON public.days_off_request_dates;
CREATE POLICY "company manages dates" ON public.days_off_request_dates
  FOR ALL TO authenticated
  USING ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()))
  WITH CHECK ((SELECT private.is_company())
         AND company_id = (SELECT private.current_company_id()));

DROP POLICY IF EXISTS "manager manages branch dates" ON public.days_off_request_dates;
CREATE POLICY "manager manages branch dates" ON public.days_off_request_dates
  FOR ALL TO authenticated
  USING ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND request_id IN (SELECT unnest(private.scoped_days_off_request_ids())))
  WITH CHECK ((SELECT private.is_manager())
         AND company_id = (SELECT private.current_company_id())
         AND request_id IN (SELECT unnest(private.scoped_days_off_request_ids())));


-- ============================================================================
-- 5. MOTOR DE REGLAS: ALCANCE POR SUCURSAL
-- ============================================================================

-- Días de vacaciones que corresponden (RF-18). Lo consulta el propio empleado
-- o quien pueda gestionarlo.
CREATE OR REPLACE FUNCTION public.vacation_entitlement_days(p_employee_id BIGINT, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_emp public.employees;
  v_years INTEGER;
  v_days INTEGER;
BEGIN
  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF v_emp.id IS NULL THEN RETURN 0; END IF;
  IF v_emp.id IS DISTINCT FROM private.current_employee_id()
     AND NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'No podés consultar los datos de ese empleado';
  END IF;

  v_years := EXTRACT(YEAR FROM age(make_date(p_year, 12, 31), v_emp.hire_date))::INTEGER;
  SELECT entitlement_days INTO v_days
    FROM public.vacation_entitlement_ranges
   WHERE company_id = v_emp.company_id
     AND v_years >= seniority_years_from
     AND (seniority_years_to IS NULL OR v_years < seniority_years_to)
   ORDER BY seniority_years_from DESC
   LIMIT 1;
  RETURN COALESCE(v_days, 0);
END;
$$;

-- Asignación directa de francos (RF-59)
CREATE OR REPLACE FUNCTION public.assign_days_off(
  p_employee_id BIGINT,
  p_dates DATE[],
  p_reason TEXT,
  p_category VARCHAR DEFAULT 'ordinary'
)
RETURNS public.days_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts;
  v_req public.days_off_requests;
BEGIN
  v_acc := private.current_account();
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden asignar francos';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
  END IF;
  IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL THEN
    RAISE EXCEPTION 'Indicá al menos una fecha';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_dates) d WHERE d < private.today()) THEN
    RAISE EXCEPTION 'No se pueden asignar francos en días que ya pasaron';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.days_off_request_dates d
    JOIN public.days_off_requests r ON r.id = d.request_id
    WHERE r.employee_id = p_employee_id AND r.status IN ('pending', 'approved')
      AND d.requested_date = ANY (p_dates)
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene un franco en alguna de esas fechas';
  END IF;

  INSERT INTO public.days_off_requests (
    company_id, employee_id, submitted_by_user_id, request_type, category, reason,
    status, resolved_by_user_id, resolved_at
  ) VALUES (
    v_acc.company_id, p_employee_id, v_acc.id, 'employer_assignment', p_category, p_reason,
    'approved', v_acc.id, CURRENT_TIMESTAMP
  ) RETURNING * INTO v_req;

  INSERT INTO public.days_off_request_dates (company_id, request_id, requested_date)
  SELECT v_acc.company_id, v_req.id, d FROM unnest(p_dates) AS d;

  RETURN v_req;
END;
$$;

-- Asignación directa de vacaciones (RF-59)
CREATE OR REPLACE FUNCTION public.assign_vacation(p_employee_id BIGINT, p_start DATE, p_end DATE, p_period_year INTEGER DEFAULT NULL)
RETURNS public.vacation_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
BEGIN
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden asignar vacaciones';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
  END IF;
  RETURN private.register_vacation(v_acc, p_employee_id, p_start, p_end, p_period_year, FALSE, TRUE);
END;
$$;

-- Respuesta a solicitudes pendientes (RF-16, RF-22)
CREATE OR REPLACE FUNCTION public.resolve_days_off_request(p_request_id BIGINT, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS public.days_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
  v_req public.days_off_requests;
BEGIN
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden responder solicitudes';
  END IF;
  IF NOT p_approve AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'Indicá el motivo del rechazo';
  END IF;
  UPDATE public.days_off_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         resolution_note = p_note, resolved_by_user_id = v_acc.id, resolved_at = CURRENT_TIMESTAMP
   WHERE id = p_request_id AND company_id = v_acc.company_id AND status = 'pending'
     AND private.in_scope(employee_id)
  RETURNING * INTO v_req;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no existe, ya fue resuelta o no pertenece a tu sucursal';
  END IF;
  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_vacation_request(p_request_id BIGINT, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS public.vacation_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
  v_req public.vacation_requests;
BEGIN
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden responder solicitudes';
  END IF;
  IF NOT p_approve AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'Indicá el motivo del rechazo';
  END IF;
  UPDATE public.vacation_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         resolution_note = p_note, resolved_by_user_id = v_acc.id, resolved_at = CURRENT_TIMESTAMP
   WHERE id = p_request_id AND company_id = v_acc.company_id AND status = 'pending'
     AND private.in_scope(employee_id)
  RETURNING * INTO v_req;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no existe, ya fue resuelta o no pertenece a tu sucursal';
  END IF;
  RETURN v_req;
END;
$$;

-- Estado del empleado: activo, en licencia o baja lógica (RF-34)
CREATE OR REPLACE FUNCTION public.set_employee_status(p_employee_id BIGINT, p_status VARCHAR)
RETURNS public.employees
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_emp public.employees;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden cambiar el estado de un empleado';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
  END IF;
  IF private.is_manager() AND EXISTS (
    SELECT 1 FROM public.user_accounts WHERE employee_id = p_employee_id AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Un encargado no puede cambiar el estado de otro encargado';
  END IF;
  UPDATE public.employees SET employment_status = p_status
   WHERE id = p_employee_id AND company_id = private.current_company_id()
  RETURNING * INTO v_emp;
  IF v_emp.id IS NULL THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu organización';
  END IF;
  UPDATE public.user_accounts SET is_active = (p_status <> 'inactive')
   WHERE employee_id = p_employee_id AND company_id = v_emp.company_id;
  RETURN v_emp;
END;
$$;


-- ============================================================================
-- 6. EL PUESTO DEFINE AL ENCARGADO
-- ============================================================================
-- El rol de la cuenta sigue al puesto del empleado: si el puesto está
-- habilitado como Encargado, su cuenta pasa a 'manager'; si deja de estarlo,
-- vuelve a 'employee'. La cuenta de la Empresa no tiene ficha de empleado, así
-- que nunca la alcanza este ajuste.

CREATE OR REPLACE FUNCTION private.sync_account_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_accounts
     SET role = CASE WHEN private.position_is_manager(NEW.job_position_id)
                     THEN 'manager' ELSE 'employee' END
   WHERE employee_id = NEW.id
     AND company_id = NEW.company_id
     AND role IN ('manager', 'employee');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS employees_sync_account_role ON public.employees;
CREATE TRIGGER employees_sync_account_role
  AFTER INSERT OR UPDATE OF job_position_id ON public.employees
  FOR EACH ROW EXECUTE FUNCTION private.sync_account_role();

-- Al habilitar o deshabilitar un puesto como Encargado, se ajustan las cuentas
-- de quienes lo ocupan.
CREATE OR REPLACE FUNCTION private.sync_roles_for_position()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_manager IS DISTINCT FROM OLD.is_manager THEN
    UPDATE public.user_accounts ua
       SET role = CASE WHEN NEW.is_manager THEN 'manager' ELSE 'employee' END
      FROM public.employees e
     WHERE e.id = ua.employee_id
       AND e.job_position_id = NEW.id
       AND ua.role IN ('manager', 'employee');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS job_positions_sync_roles ON public.job_positions;
CREATE TRIGGER job_positions_sync_roles
  AFTER UPDATE OF is_manager ON public.job_positions
  FOR EACH ROW EXECUTE FUNCTION private.sync_roles_for_position();


-- ============================================================================
-- 7. ALTA DE CUENTAS
-- ============================================================================

-- El administrador del sistema crea la empresa y su cuenta Empresa.
CREATE OR REPLACE FUNCTION public.admin_create_company(
  p_legal_name TEXT,
  p_employer_email TEXT,
  p_employer_name TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id BIGINT;
  v_auth_id UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = lower(p_employer_email);
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Primero creá el usuario % en Authentication > Users', p_employer_email;
  END IF;

  INSERT INTO public.companies (legal_name) VALUES (p_legal_name) RETURNING id INTO v_company_id;

  INSERT INTO public.business_rules (company_id) VALUES (v_company_id);

  INSERT INTO public.vacation_entitlement_ranges (company_id, seniority_years_from, seniority_years_to, entitlement_days)
  VALUES (v_company_id, 0, 4, 14), (v_company_id, 5, 9, 21), (v_company_id, 10, 19, 28), (v_company_id, 20, NULL, 35);

  INSERT INTO public.user_accounts (auth_user_id, company_id, email, display_name, role)
  VALUES (v_auth_id, v_company_id, lower(p_employer_email), p_employer_name, 'company');

  RETURN v_company_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_company(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Alta de un empleado o de un encargado. El rol de la cuenta sale del puesto.
CREATE OR REPLACE FUNCTION public.admin_create_employee(
  p_company_id BIGINT,
  p_auth_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
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
  v_dep BIGINT; v_branch BIGINT; v_pos BIGINT;
  v_number TEXT;
  v_emp public.employees;
  v_is_manager BOOLEAN;
BEGIN
  INSERT INTO public.departments (company_id, name) VALUES (p_company_id, btrim(p_department))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_dep;
  INSERT INTO public.branches (company_id, name) VALUES (p_company_id, btrim(p_branch))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_branch;
  INSERT INTO public.job_positions (company_id, name) VALUES (p_company_id, btrim(p_job_position))
    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_pos;

  SELECT COALESCE(is_manager, FALSE) INTO v_is_manager
    FROM public.job_positions WHERE id = v_pos;

  SELECT (COALESCE(MAX(NULLIF(regexp_replace(employee_number, '\D', '', 'g'), '')::BIGINT), 0) + 1)::TEXT
    INTO v_number FROM public.employees WHERE company_id = p_company_id;

  INSERT INTO public.employees (company_id, employee_number, full_name, email, cuil,
    department_id, branch_id, job_position_id, collective_agreement, birth_date, hire_date)
  VALUES (p_company_id, v_number, btrim(p_full_name), lower(btrim(p_email)), regexp_replace(p_cuil, '\D', '', 'g'),
    v_dep, v_branch, v_pos, NULLIF(btrim(p_collective_agreement), ''), p_birth_date, p_hire_date)
  RETURNING * INTO v_emp;

  INSERT INTO public.user_accounts (auth_user_id, company_id, employee_id, email, display_name, role, must_change_password)
  VALUES (p_auth_user_id, p_company_id, v_emp.id, lower(btrim(p_email)), btrim(p_full_name),
          CASE WHEN v_is_manager THEN 'manager' ELSE 'employee' END, TRUE);

  RETURN v_emp;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_employee(BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_employee(BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT)
  TO service_role;


-- ============================================================================
-- 8. PERFIL DE LA CUENTA EMPRESA
-- ============================================================================
-- La cuenta Empresa no tiene nombre visible editable ni foto de perfil: son
-- valores fijos. Solo puede cambiar su email y su contraseña.

CREATE OR REPLACE FUNCTION public.set_my_profile_photo(p_storage_key TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF private.is_company() THEN
    RAISE EXCEPTION 'La cuenta de la empresa no usa foto de perfil';
  END IF;
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

-- La cuenta Empresa conserva su nombre visible y nunca guarda foto.
CREATE OR REPLACE FUNCTION private.lock_company_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'company' THEN
    NEW.display_name := OLD.display_name;
    NEW.profile_photo_storage_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_accounts_lock_company_profile ON public.user_accounts;
CREATE TRIGGER user_accounts_lock_company_profile
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION private.lock_company_profile();

UPDATE public.user_accounts SET profile_photo_storage_key = NULL WHERE role = 'company';


-- ============================================================================
-- 9. NOTIFICACIONES
-- ============================================================================
-- Una solicitud le llega a la Empresa y al Encargado de la sucursal del
-- empleado, que son quienes pueden resolverla.

CREATE OR REPLACE FUNCTION private.notify_supervisors(
  p_company_id BIGINT, p_employee_id BIGINT, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT
)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (company_id, recipient_account_id, kind, title, body, link)
  SELECT p_company_id, ua.id, p_kind, p_title, p_body, p_link
  FROM public.user_accounts ua
  WHERE ua.company_id = p_company_id
    AND ua.is_active
    AND ua.employee_id IS DISTINCT FROM p_employee_id
    AND (ua.role = 'company'
         OR (ua.role = 'manager'
             AND private.employee_branch(ua.employee_id) = private.employee_branch(p_employee_id)));
$$;

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
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'days_off_requested',
        'Nueva solicitud de franco',
        v_name || ' pidió ' || v_count || CASE WHEN v_count = 1 THEN ' día: ' ELSE ' días: ' END || v_dates || '.',
        '/empleador/francos');
    ELSIF NEW.status = 'approved' THEN
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'days_off_auto_approved',
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
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'days_off_cancelled',
        'Solicitud de franco cancelada', v_name || ' canceló su pedido para el ' || v_dates || '.',
        '/empleador/francos');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_vacation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := private.employee_name(NEW.employee_id);
  v_range TEXT := 'del ' || private.short_date(NEW.start_date) || ' al ' || private.short_date(NEW.end_date)
    || ' (' || NEW.requested_days || ' días)';
  v_by_staff BOOLEAN;
BEGIN
  SELECT role IN ('company', 'manager') INTO v_by_staff
    FROM public.user_accounts WHERE id = NEW.submitted_by_user_id;

  IF TG_OP = 'INSERT' THEN
    IF v_by_staff THEN
      PERFORM private.notify_employee(NEW.company_id, NEW.employee_id, 'vacation_assigned',
        'Te asignaron vacaciones', 'Período ' || v_range || '.', '/empleado/vacaciones');
    ELSIF NEW.status = 'pending' THEN
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'vacation_requested',
        'Nueva solicitud de vacaciones', v_name || ' pidió vacaciones ' || v_range || '.',
        '/empleador/vacaciones');
    ELSIF NEW.status = 'approved' THEN
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'vacation_auto_approved',
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
      PERFORM private.notify_supervisors(NEW.company_id, NEW.employee_id, 'vacation_cancelled',
        'Solicitud de vacaciones cancelada', v_name || ' canceló su pedido ' || v_range || '.',
        '/empleador/vacaciones');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


-- ============================================================================
-- 10. PANEL DEL ADMINISTRADOR DEL SISTEMA
-- ============================================================================
-- Las consultas que buscaban la cuenta 'employer' de cada empresa ahora buscan
-- la cuenta 'company'.

CREATE OR REPLACE FUNCTION public.admin_list_companies()
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
     WHERE u.company_id = c.id AND u.role = 'company'
     ORDER BY u.id LIMIT 1
  ) ua ON TRUE
  ORDER BY c.legal_name;
END;
$$;

-- Igual que antes; el único cambio es que las cuentas pendientes de su primer
-- ingreso se cuentan sobre el rol 'company'.
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
    'pending_first_login', (SELECT count(*) FROM public.user_accounts WHERE role = 'company' AND must_change_password),
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


-- ============================================================================
-- 11. SEMILLA: PUESTOS YA HABILITADOS COMO ENCARGADO
-- ============================================================================
-- Nada queda habilitado de forma automática: cada empresa decide qué puestos
-- son de Encargado desde su configuración. Esta actualización solo deja la
-- estructura lista.


-- ============================================================================
-- 12. FUNCIONES ADAPTADAS AL ALCANCE POR SUCURSAL
-- ============================================================================
-- Reproducen la versión anterior con dos cambios: aceptan a la Empresa y al
-- Encargado, y verifican que el empleado entre en el alcance de quien llama.

-- Fichaje cargado por la empresa o el encargado (RF-37)
CREATE OR REPLACE FUNCTION public.register_attendance(
  p_employee_id BIGINT,
  p_clock_in TIMESTAMP,
  p_clock_out TIMESTAMP DEFAULT NULL
)
RETURNS public.attendance_records
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
  v_emp public.employees;
  v_sched public.work_schedules;
  v_now TIMESTAMP := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_date DATE;
  v_rec public.attendance_records;
BEGIN
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden registrar fichajes';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
  END IF;

  SELECT * INTO v_emp FROM public.employees
   WHERE id = p_employee_id AND company_id = v_acc.company_id;
  IF v_emp.id IS NULL THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu organización';
  END IF;
  IF v_emp.employment_status = 'inactive' THEN
    RAISE EXCEPTION 'No se pueden registrar fichajes de un empleado dado de baja';
  END IF;

  IF p_clock_in IS NULL THEN
    RAISE EXCEPTION 'Indicá la fecha y la hora de entrada';
  END IF;
  IF p_clock_in > v_now THEN
    RAISE EXCEPTION 'La entrada no puede ser posterior a este momento';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out <= p_clock_in THEN
    RAISE EXCEPTION 'La salida tiene que ser posterior a la entrada';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out > v_now THEN
    RAISE EXCEPTION 'La salida no puede ser posterior a este momento';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out - p_clock_in > INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Entre la entrada y la salida no puede haber más de 24 horas';
  END IF;

  v_date := p_clock_in::DATE;

  -- Con vacaciones o franco aprobados ese día el empleado no fue a trabajar
  IF EXISTS (
       SELECT 1 FROM public.vacation_requests v
        WHERE v.employee_id = p_employee_id
          AND v.status = 'approved'
          AND v_date BETWEEN v.start_date AND v.end_date) THEN
    RAISE EXCEPTION 'El empleado está de vacaciones el %: no se le puede registrar un fichaje', to_char(v_date, 'DD/MM/YYYY');
  END IF;
  IF EXISTS (
       SELECT 1
         FROM public.days_off_request_dates d
         JOIN public.days_off_requests r ON r.id = d.request_id
        WHERE r.employee_id = p_employee_id
          AND r.status = 'approved'
          AND d.requested_date = v_date) THEN
    RAISE EXCEPTION 'El empleado tiene franco el %: no se le puede registrar un fichaje', to_char(v_date, 'DD/MM/YYYY');
  END IF;

  SELECT * INTO v_sched FROM public.work_schedules
   WHERE company_id = v_acc.company_id
     AND employee_id = p_employee_id
     AND week_start_date = date_trunc('week', v_date)::DATE
     AND status = 'confirmed';

  INSERT INTO public.attendance_records
    (company_id, employee_id, work_schedule_id, work_date, clock_in_at, clock_out_at, status)
  VALUES (
    v_acc.company_id, p_employee_id, v_sched.id, v_date,
    p_clock_in AT TIME ZONE 'America/Argentina/Buenos_Aires',
    p_clock_out AT TIME ZONE 'America/Argentina/Buenos_Aires',
    CASE WHEN v_sched.id IS NOT NULL
          AND p_clock_in::TIME > v_sched.starts_at_snapshot + INTERVAL '10 minutes'
         THEN 'late' ELSE 'present' END
  )
  ON CONFLICT (company_id, employee_id, work_date) DO UPDATE
     SET work_schedule_id = EXCLUDED.work_schedule_id,
         clock_in_at = EXCLUDED.clock_in_at,
         clock_out_at = EXCLUDED.clock_out_at,
         status = EXCLUDED.status
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

-- Edición de los datos de un empleado (RF-55)
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
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden editar empleados';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
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

  -- El encargado no mueve empleados fuera de su sucursal ni nombra encargados
  IF private.is_manager() THEN
    IF v_branch IS DISTINCT FROM private.current_branch_id() THEN
      RAISE EXCEPTION 'Solo podés asignar empleados a tu sucursal';
    END IF;
    IF private.position_is_manager(v_pos) THEN
      RAISE EXCEPTION 'Solo la empresa puede asignar un puesto de encargado';
    END IF;
  END IF;

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

-- Importación de fichajes desde planilla (RF-38)
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
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden importar fichajes';
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

-- Compatibilidad: el nombre anterior sigue existiendo y apunta a la Empresa.
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
  WHERE ua.company_id = p_company_id AND ua.role = 'company' AND ua.is_active;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
