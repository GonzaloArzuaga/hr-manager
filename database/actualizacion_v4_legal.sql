-- =====================================================================
-- HR Manager · actualización v4: validaciones conforme a la Ley 20.744
-- =====================================================================
--
-- Qué cambia:
--
--  1. Francos. El aviso previo mínimo pasa a ser de un día: un franco se
--     solicita o se asigna desde mañana en adelante, nunca para hoy, porque
--     el empleado ya está trabajando. Vale tanto para el empleado que lo
--     solicita como para la empresa o el encargado que lo asignan.
--
--  2. Vacaciones. El aviso previo pasa a tener una base fija de 14 días más
--     los días adicionales que configure cada empresa. Se aplica tanto a la
--     solicitud del empleado como a la asignación directa.
--
--  3. Se elimina la aprobación automática. Toda solicitud de franco o de
--     vacaciones nace pendiente y la resuelve un responsable. Lo único que
--     nace aprobado es la asignación directa, que no es una solicitud.
--
--  4. Empleados. La fecha de ingreso puede ser anterior o posterior a la
--     fecha actual. A cambio, el empleado debe tener 18 años cumplidos a su
--     fecha de ingreso, conforme al artículo 32 de la Ley 20.744.
--
--  5. Antigüedad. Los tramos pasan de años a meses y sus límites se evalúan
--     contra la fecha exacta, no contra años truncados. Esto corrige dos
--     defectos de la versión anterior:
--       · un empleado con la antigüedad justo en el borde de un tramo
--         quedaba fuera de todos los tramos y obtenía cero días;
--       · un empleado con cinco años y un día obtenía los días del tramo de
--         hasta cinco años, cuando el artículo 150 le da los del siguiente.
--
--  6. Tiempo mínimo trabajado. Se aplican los artículos 151 y 153: quien no
--     trabajó al menos la mitad de los días hábiles del año calendario no
--     recibe la licencia completa sino un día por cada veinte trabajados.
--
--  7. Francos adeudados. Se acumulan los francos que corresponden por las
--     semanas completas transcurridas desde el ingreso y todavía no fueron
--     otorgados.
--
--  8. CUIT de la empresa, para que la cuenta Empresa también pueda ingresar
--     con su identificación tributaria y no solo con su correo.
--
-- Esta actualización se puede ejecutar más de una vez sin efectos adversos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Reglas de negocio
-- ---------------------------------------------------------------------

-- Aviso previo de francos: mínimo un día.
UPDATE public.business_rules SET days_off_notice = 1 WHERE days_off_notice < 1;

ALTER TABLE public.business_rules
  DROP CONSTRAINT IF EXISTS business_rules_days_off_notice_check;
ALTER TABLE public.business_rules
  ADD CONSTRAINT business_rules_days_off_notice_check
  CHECK (days_off_notice >= 1);
ALTER TABLE public.business_rules
  ALTER COLUMN days_off_notice SET DEFAULT 1;

-- Aviso previo de vacaciones: 14 días de base más los adicionales de la empresa.
ALTER TABLE public.business_rules
  ADD COLUMN IF NOT EXISTS vacation_extra_notice SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.business_rules
  DROP CONSTRAINT IF EXISTS business_rules_vacation_extra_notice_check;
ALTER TABLE public.business_rules
  ADD CONSTRAINT business_rules_vacation_extra_notice_check
  CHECK (vacation_extra_notice >= 0);

DO $migracion$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_rules'
      AND column_name = 'vacation_notice'
  ) THEN
    UPDATE public.business_rules
       SET vacation_extra_notice = GREATEST(vacation_notice - 14, 0)
     WHERE vacation_extra_notice = 0;
    ALTER TABLE public.business_rules DROP COLUMN vacation_notice;
  END IF;
END
$migracion$;

-- Se elimina la aprobación automática.
ALTER TABLE public.business_rules DROP COLUMN IF EXISTS requires_days_off_approval;
ALTER TABLE public.business_rules DROP COLUMN IF EXISTS requires_vacation_approval;

-- Desde cuándo se acumulan los francos adeudados. Sin valor, desde el ingreso
-- de cada empleado. Sirve para las empresas que empezaron a usar el sistema
-- mucho después de haber contratado a su personal.
ALTER TABLE public.business_rules
  ADD COLUMN IF NOT EXISTS days_off_backlog_from DATE;

-- Base legal del aviso previo de vacaciones: dos semanas.
CREATE OR REPLACE FUNCTION private.vacation_base_notice()
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $fn$ SELECT 14 $fn$;

-- Aviso previo total de vacaciones para una empresa.
CREATE OR REPLACE FUNCTION public.vacation_notice_days(p_company_id BIGINT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT private.vacation_base_notice()
       + COALESCE((SELECT r.vacation_extra_notice FROM public.business_rules r
                    WHERE r.company_id = p_company_id), 0)
$fn$;

-- ---------------------------------------------------------------------
-- 2. CUIT de la empresa
-- ---------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(11);
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_tax_id_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_tax_id_check
  CHECK (tax_id IS NULL OR tax_id ~ '^[0-9]{11}$');
CREATE UNIQUE INDEX IF NOT EXISTS companies_tax_id_uq
  ON public.companies (tax_id) WHERE tax_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Tramos de antigüedad en meses
-- ---------------------------------------------------------------------
--
-- Un tramo cubre la antigüedad mayor a seniority_months_from meses y hasta
-- seniority_months_to meses inclusive, medida sobre la fecha exacta. El
-- primer tramo, con from = 0, incluye también la propia fecha de ingreso.
-- Así, con los tramos legales 0-60, 60-120, 120-240 y 240 en adelante, cinco
-- años exactos quedan en el primer tramo y cinco años y un día en el segundo,
-- que es lo que dice el artículo 150.

ALTER TABLE public.vacation_entitlement_ranges
  ADD COLUMN IF NOT EXISTS seniority_months_from INTEGER;
ALTER TABLE public.vacation_entitlement_ranges
  ADD COLUMN IF NOT EXISTS seniority_months_to INTEGER;

DO $migracion$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vacation_entitlement_ranges'
      AND column_name = 'seniority_years_from'
  ) THEN
    -- Los tramos anteriores se expresaban en años, con ambos extremos
    -- inclusive: el tramo "de 5 a 9 años" cubre hasta el día anterior a los
    -- 10 años cumplidos, o sea hasta los 120 meses.
    UPDATE public.vacation_entitlement_ranges
       SET seniority_months_from =
             CASE WHEN seniority_years_from <= 0 THEN 0
                  ELSE seniority_years_from * 12 END,
           seniority_months_to =
             CASE WHEN seniority_years_to IS NULL THEN NULL
                  ELSE (seniority_years_to + 1) * 12 END
     WHERE seniority_months_from IS NULL;

    DROP INDEX IF EXISTS public.vacation_entitlement_one_open_range_uq;
    ALTER TABLE public.vacation_entitlement_ranges
      DROP CONSTRAINT IF EXISTS vacation_entitlement_ranges_company_id_seniority_years_from_key;
    ALTER TABLE public.vacation_entitlement_ranges
      DROP CONSTRAINT IF EXISTS vacation_entitlement_ranges_check;
    ALTER TABLE public.vacation_entitlement_ranges DROP COLUMN seniority_years_from;
    ALTER TABLE public.vacation_entitlement_ranges DROP COLUMN seniority_years_to;
  END IF;
END
$migracion$;

UPDATE public.vacation_entitlement_ranges
   SET seniority_months_from = 0 WHERE seniority_months_from IS NULL;

ALTER TABLE public.vacation_entitlement_ranges
  ALTER COLUMN seniority_months_from SET NOT NULL;
ALTER TABLE public.vacation_entitlement_ranges
  DROP CONSTRAINT IF EXISTS vacation_ranges_months_check;
ALTER TABLE public.vacation_entitlement_ranges
  ADD CONSTRAINT vacation_ranges_months_check
  CHECK (
    seniority_months_from >= 0
    AND (seniority_months_to IS NULL OR seniority_months_to > seniority_months_from)
  );

CREATE UNIQUE INDEX IF NOT EXISTS vacation_ranges_company_from_uq
  ON public.vacation_entitlement_ranges (company_id, seniority_months_from);
CREATE UNIQUE INDEX IF NOT EXISTS vacation_ranges_one_open_uq
  ON public.vacation_entitlement_ranges (company_id)
  WHERE seniority_months_to IS NULL;

-- ---------------------------------------------------------------------
-- 4. Fechas de nacimiento e ingreso
-- ---------------------------------------------------------------------
--
-- La fecha de ingreso queda libre: puede ser anterior a hoy, porque se cargan
-- empleados que ya venían trabajando, o posterior, porque se registra un alta
-- programada. Lo que sí se exige es la edad mínima para contratar.

-- Se quita la restricción anterior cualquiera sea el nombre que le haya
-- puesto PostgreSQL al crearla.
DO $migracion$
DECLARE
  v_nombre TEXT;
BEGIN
  FOR v_nombre IN
    SELECT c.conname FROM pg_constraint c
     WHERE c.conrelid = 'public.employees'::regclass
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) LIKE '%birth_date%'
  LOOP
    EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT %I', v_nombre);
  END LOOP;
END
$migracion$;
-- Se agrega como NOT VALID a propósito: rige para toda alta y toda
-- modificación a partir de ahora, pero no rechaza la migración si hay fichas
-- viejas cargadas con una fecha incoherente. Abajo se informa cuántas son.
ALTER TABLE public.employees
  ADD CONSTRAINT employees_minimum_age_check
  CHECK (hire_date >= (birth_date + INTERVAL '18 years')::DATE) NOT VALID;

DO $migracion$
DECLARE
  v_malas INTEGER;
BEGIN
  SELECT count(*) INTO v_malas FROM public.employees
   WHERE hire_date < (birth_date + INTERVAL '18 years')::DATE;
  IF v_malas > 0 THEN
    RAISE NOTICE 'Atención: % empleado(s) tienen una fecha de ingreso anterior a sus 18 años. Corregilas y después ejecutá: ALTER TABLE public.employees VALIDATE CONSTRAINT employees_minimum_age_check;', v_malas;
  END IF;
END
$migracion$;

-- ---------------------------------------------------------------------
-- 5. Días de vacaciones que corresponden (artículos 150, 151 y 153)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vacation_entitlement_days(p_employee_id BIGINT, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_emp      public.employees;
  v_cutoff   DATE;      -- 31 de diciembre del año de la licencia
  v_start    DATE;      -- desde cuándo prestó servicios ese año
  v_days     INTEGER;   -- días del tramo de antigüedad
  v_worked   INTEGER;   -- días hábiles trabajados en el año
  v_total    INTEGER;   -- días hábiles del año calendario
BEGIN
  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF v_emp.id IS NULL THEN RETURN 0; END IF;
  IF v_emp.id IS DISTINCT FROM private.current_employee_id()
     AND NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'No podés consultar los datos de ese empleado';
  END IF;

  v_cutoff := make_date(p_year, 12, 31);
  IF v_emp.hire_date > v_cutoff THEN RETURN 0; END IF;

  -- Artículo 150: la antigüedad se computa al 31 de diciembre del año al que
  -- correspondan las vacaciones, y el tramo se decide sobre la fecha exacta.
  SELECT r.entitlement_days INTO v_days
    FROM public.vacation_entitlement_ranges r
   WHERE r.company_id = v_emp.company_id
     AND (
       r.seniority_months_from = 0
       OR v_cutoff > (v_emp.hire_date + make_interval(months => r.seniority_months_from))::DATE
     )
     AND (
       r.seniority_months_to IS NULL
       OR v_cutoff <= (v_emp.hire_date + make_interval(months => r.seniority_months_to))::DATE
     )
   ORDER BY r.seniority_months_from DESC
   LIMIT 1;

  v_days := COALESCE(v_days, 0);
  IF v_days = 0 THEN RETURN 0; END IF;

  -- Artículo 151: para la licencia completa hay que haber prestado servicios
  -- durante la mitad, como mínimo, de los días hábiles del año calendario.
  v_start := GREATEST(v_emp.hire_date, make_date(p_year, 1, 1));

  SELECT count(*) INTO v_worked
    FROM generate_series(v_start::timestamp, v_cutoff::timestamp, INTERVAL '1 day') d
   WHERE EXTRACT(ISODOW FROM d) < 6;

  SELECT count(*) INTO v_total
    FROM generate_series(make_date(p_year, 1, 1)::timestamp,
                         v_cutoff::timestamp, INTERVAL '1 day') d
   WHERE EXTRACT(ISODOW FROM d) < 6;

  IF v_worked * 2 >= v_total THEN
    RETURN v_days;
  END IF;

  -- Artículo 153: un día de descanso por cada veinte de trabajo efectivo.
  RETURN FLOOR(v_worked / 20.0)::INTEGER;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 6. Francos: solicitud y asignación desde mañana
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_days_off_request(
  p_dates DATE[],
  p_reason TEXT,
  p_category VARCHAR DEFAULT 'ordinary'
)
RETURNS public.days_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_acc public.user_accounts;
  v_rules public.business_rules;
  v_req public.days_off_requests;
  v_date DATE;
  v_notice INTEGER;
  v_week_count INTEGER;
  v_new_in_week INTEGER;
BEGIN
  v_acc := private.current_account();
  IF v_acc.id IS NULL OR v_acc.role <> 'employee' THEN
    RAISE EXCEPTION 'Solo un empleado activo puede solicitar francos';
  END IF;
  IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL THEN
    RAISE EXCEPTION 'Indicá al menos una fecha';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Indicá el motivo de la solicitud';
  END IF;

  SELECT * INTO v_rules FROM public.business_rules WHERE company_id = v_acc.company_id;
  -- Nunca menos de un día: el franco se pide desde mañana en adelante.
  v_notice := GREATEST(COALESCE(v_rules.days_off_notice, 1), 1);

  FOREACH v_date IN ARRAY p_dates LOOP
    IF v_date - private.today() < v_notice THEN
      RAISE EXCEPTION 'La fecha % no respeta el aviso previo de % día(s). La primera fecha posible es %.',
        to_char(v_date, 'DD/MM/YYYY'), v_notice,
        to_char(private.today() + v_notice, 'DD/MM/YYYY');
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.days_off_request_dates d
      JOIN public.days_off_requests r ON r.id = d.request_id
      WHERE r.employee_id = v_acc.employee_id AND r.status IN ('pending', 'approved')
        AND d.requested_date = v_date
    ) THEN
      RAISE EXCEPTION 'Ya tenés un franco solicitado o aprobado para el %', to_char(v_date, 'DD/MM/YYYY');
    END IF;

    SELECT count(*) INTO v_week_count
    FROM public.days_off_request_dates d
    JOIN public.days_off_requests r ON r.id = d.request_id
    WHERE r.employee_id = v_acc.employee_id
      AND r.status IN ('pending', 'approved')
      AND date_trunc('week', d.requested_date) = date_trunc('week', v_date);

    SELECT count(*) INTO v_new_in_week
    FROM unnest(p_dates) x
    WHERE date_trunc('week', x) = date_trunc('week', v_date);

    IF v_week_count + v_new_in_week > v_rules.weekly_days_off THEN
      RAISE EXCEPTION 'La semana del % supera el máximo de % francos por semana',
        to_char(v_date, 'DD/MM/YYYY'), v_rules.weekly_days_off;
    END IF;
  END LOOP;

  -- Toda solicitud nace pendiente: ya no existe la aprobación automática.
  INSERT INTO public.days_off_requests (
    company_id, employee_id, submitted_by_user_id, request_type, category, reason, status
  ) VALUES (
    v_acc.company_id, v_acc.employee_id, v_acc.id,
    CASE WHEN array_length(p_dates, 1) = 1 THEN 'individual' ELSE 'grouped' END,
    p_category, p_reason, 'pending'
  ) RETURNING * INTO v_req;

  INSERT INTO public.days_off_request_dates (company_id, request_id, requested_date, notice_days)
  SELECT v_acc.company_id, v_req.id, d, (d - private.today())::SMALLINT
  FROM unnest(p_dates) AS d;

  RETURN v_req;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.assign_days_off(
  p_employee_id BIGINT,
  p_dates DATE[],
  p_reason TEXT,
  p_category VARCHAR DEFAULT 'ordinary'
)
RETURNS public.days_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
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
  -- El empleado ya está trabajando hoy: el franco se asigna desde mañana.
  IF EXISTS (SELECT 1 FROM unnest(p_dates) d WHERE d <= private.today()) THEN
    RAISE EXCEPTION 'Los francos se asignan desde mañana en adelante. La primera fecha posible es %.',
      to_char(private.today() + 1, 'DD/MM/YYYY');
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
$fn$;

-- ---------------------------------------------------------------------
-- 7. Vacaciones: aviso previo de 14 días más los adicionales
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS private.register_vacation(
  public.user_accounts, BIGINT, DATE, DATE, INTEGER, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION private.register_vacation(
  p_acc public.user_accounts,
  p_employee_id BIGINT,
  p_start DATE,
  p_end DATE,
  p_period_year INTEGER,
  p_assigned BOOLEAN
)
RETURNS public.vacation_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_period public.vacation_periods;
  v_notice INTEGER;
  v_days INTEGER;
  v_used INTEGER;
  v_overlap INTEGER;
  v_req public.vacation_requests;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la de inicio';
  END IF;

  -- El aviso previo rige igual para la solicitud del empleado y para la
  -- asignación directa: las vacaciones se planifican con anticipación.
  v_notice := public.vacation_notice_days(p_acc.company_id);
  IF p_start - private.today() < v_notice THEN
    RAISE EXCEPTION 'Las vacaciones se cargan con al menos % días de anticipación. La primera fecha de inicio posible es %.',
      v_notice, to_char(private.today() + v_notice, 'DD/MM/YYYY');
  END IF;

  SELECT count(*) INTO v_overlap FROM public.vacation_requests
  WHERE employee_id = p_employee_id AND status IN ('pending', 'approved')
    AND start_date <= p_end AND end_date >= p_start;
  IF v_overlap > 0 THEN
    RAISE EXCEPTION 'Ya hay vacaciones solicitadas o aprobadas que se superponen con esas fechas';
  END IF;

  v_period := private.ensure_vacation_period(
    p_employee_id, COALESCE(p_period_year, EXTRACT(YEAR FROM p_start)::INTEGER));
  v_days := p_end - p_start + 1;

  SELECT COALESCE(SUM(requested_days), 0) INTO v_used
  FROM public.vacation_requests
  WHERE vacation_period_id = v_period.id AND status IN ('pending', 'approved');

  IF v_used + v_days > v_period.entitled_days THEN
    RAISE EXCEPTION 'Se solicitaron % días y quedan % disponibles en el período %',
      v_days, v_period.entitled_days - v_used, v_period.period_code;
  END IF;

  -- Solo la asignación directa nace aprobada. La solicitud siempre queda
  -- pendiente de resolución.
  INSERT INTO public.vacation_requests (
    company_id, employee_id, vacation_period_id, submitted_by_user_id,
    start_date, end_date, requested_days, status, resolution_note,
    resolved_by_user_id, resolved_at
  ) VALUES (
    p_acc.company_id, p_employee_id, v_period.id, p_acc.id,
    p_start, p_end, v_days,
    CASE WHEN p_assigned THEN 'approved' ELSE 'pending' END,
    CASE WHEN p_assigned THEN 'Asignadas por el empleador' END,
    CASE WHEN p_assigned THEN p_acc.id END,
    CASE WHEN p_assigned THEN CURRENT_TIMESTAMP END
  ) RETURNING * INTO v_req;

  RETURN v_req;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.submit_vacation_request(p_start DATE, p_end DATE, p_period_year INTEGER DEFAULT NULL)
RETURNS public.vacation_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_acc public.user_accounts := private.current_account();
BEGIN
  IF v_acc.id IS NULL OR v_acc.role <> 'employee' THEN
    RAISE EXCEPTION 'Solo un empleado activo puede solicitar vacaciones';
  END IF;
  RETURN private.register_vacation(v_acc, v_acc.employee_id, p_start, p_end, p_period_year, FALSE);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.assign_vacation(p_employee_id BIGINT, p_start DATE, p_end DATE, p_period_year INTEGER DEFAULT NULL)
RETURNS public.vacation_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_acc public.user_accounts := private.current_account();
BEGIN
  IF v_acc.id IS NULL OR NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden asignar vacaciones';
  END IF;
  IF NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu sucursal';
  END IF;
  RETURN private.register_vacation(v_acc, p_employee_id, p_start, p_end, p_period_year, TRUE);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 8. Francos adeudados desde el ingreso
-- ---------------------------------------------------------------------
--
-- Se cuentan las semanas completas transcurridas entre la fecha de inicio del
-- cómputo y el último domingo. La fecha de inicio es la de ingreso del
-- empleado, salvo que la empresa haya fijado una posterior.

CREATE OR REPLACE FUNCTION private.days_off_backlog_row(p_employee_id BIGINT)
RETURNS TABLE (
  employee_id BIGINT,
  computed_from DATE,
  computed_to DATE,
  weeks_elapsed INTEGER,
  expected_days INTEGER,
  taken_days INTEGER,
  pending_days INTEGER,
  owed_days INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_emp public.employees;
  v_weekly INTEGER;
  v_from DATE;
  v_to DATE;
  v_weeks INTEGER;
  v_taken INTEGER;
  v_pending INTEGER;
BEGIN
  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF v_emp.id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(r.weekly_days_off, 0), r.days_off_backlog_from
    INTO v_weekly, v_from
    FROM public.business_rules r WHERE r.company_id = v_emp.company_id;

  v_from := GREATEST(v_emp.hire_date, COALESCE(v_from, v_emp.hire_date));
  -- Último domingo: solo cuentan las semanas ya terminadas.
  v_to := date_trunc('week', private.today())::DATE - 1;

  IF v_to < v_from THEN
    RETURN QUERY SELECT p_employee_id, v_from, v_from, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  v_weeks := ((v_to - v_from) + 1) / 7;

  SELECT
    count(*) FILTER (WHERE r.status = 'approved'),
    count(*) FILTER (WHERE r.status = 'pending')
  INTO v_taken, v_pending
  FROM public.days_off_request_dates d
  JOIN public.days_off_requests r ON r.id = d.request_id
  WHERE r.employee_id = p_employee_id
    AND d.requested_date BETWEEN v_from AND v_to;

  RETURN QUERY SELECT
    p_employee_id, v_from, v_to, v_weeks,
    v_weeks * v_weekly,
    COALESCE(v_taken, 0),
    COALESCE(v_pending, 0),
    GREATEST(v_weeks * v_weekly - COALESCE(v_taken, 0), 0);
END;
$fn$;

-- Acumulado de un empleado. Lo puede ver el propio empleado o un responsable
-- con alcance sobre él.
CREATE OR REPLACE FUNCTION public.days_off_backlog(p_employee_id BIGINT)
RETURNS TABLE (
  employee_id BIGINT,
  computed_from DATE,
  computed_to DATE,
  weeks_elapsed INTEGER,
  expected_days INTEGER,
  taken_days INTEGER,
  pending_days INTEGER,
  owed_days INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF p_employee_id IS DISTINCT FROM private.current_employee_id()
     AND NOT private.in_scope(p_employee_id) THEN
    RAISE EXCEPTION 'No podés consultar los datos de ese empleado';
  END IF;
  RETURN QUERY SELECT * FROM private.days_off_backlog_row(p_employee_id);
END;
$fn$;

-- Acumulado de todos los empleados que el responsable tiene a cargo.
CREATE OR REPLACE FUNCTION public.days_off_backlog_all()
RETURNS TABLE (
  employee_id BIGINT,
  computed_from DATE,
  computed_to DATE,
  weeks_elapsed INTEGER,
  expected_days INTEGER,
  taken_days INTEGER,
  pending_days INTEGER,
  owed_days INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Solo la empresa o un encargado pueden ver el acumulado de francos';
  END IF;
  RETURN QUERY
  SELECT b.*
  FROM public.employees e
  CROSS JOIN LATERAL private.days_off_backlog_row(e.id) b
  WHERE e.id IN (SELECT unnest(private.scoped_employee_ids()))
    AND e.employment_status <> 'inactive';
END;
$fn$;

-- ---------------------------------------------------------------------
-- 9. Alta de empresa con los tramos legales en meses
-- ---------------------------------------------------------------------

-- Se quita la versión de tres parámetros: si quedaran las dos, una llamada
-- con tres argumentos no podría resolverse y el alta de empresas fallaría.
DROP FUNCTION IF EXISTS public.admin_create_company(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_create_company(
  p_legal_name TEXT,
  p_employer_email TEXT,
  p_employer_name TEXT DEFAULT NULL,
  p_tax_id TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_company_id BIGINT;
  v_auth_id UUID;
  v_tax TEXT;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = lower(p_employer_email);
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Primero creá el usuario % en Authentication > Users', p_employer_email;
  END IF;

  v_tax := NULLIF(regexp_replace(COALESCE(p_tax_id, ''), '[^0-9]', '', 'g'), '');
  IF v_tax IS NOT NULL AND v_tax !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'El CUIT debe tener 11 dígitos';
  END IF;

  INSERT INTO public.companies (legal_name, tax_id)
  VALUES (p_legal_name, v_tax) RETURNING id INTO v_company_id;

  INSERT INTO public.business_rules (company_id) VALUES (v_company_id);

  -- Escala del artículo 150 de la Ley 20.744, expresada en meses.
  INSERT INTO public.vacation_entitlement_ranges
    (company_id, seniority_months_from, seniority_months_to, entitlement_days)
  VALUES (v_company_id,   0,   60, 14),
         (v_company_id,  60,  120, 21),
         (v_company_id, 120,  240, 28),
         (v_company_id, 240, NULL, 35);

  INSERT INTO public.user_accounts (auth_user_id, company_id, email, display_name, role)
  VALUES (v_auth_id, v_company_id, lower(p_employer_email), p_employer_name, 'company');

  RETURN v_company_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.admin_create_company(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Las empresas que nunca tocaron la escala por defecto quedan con la escala
-- legal exacta. Las que definieron tramos propios conservan los suyos, ya
-- convertidos a meses.
DO $migracion$
DECLARE
  v_company BIGINT;
BEGIN
  FOR v_company IN
    SELECT r.company_id
      FROM public.vacation_entitlement_ranges r
     GROUP BY r.company_id
    HAVING count(*) = 4
       AND array_agg(r.entitlement_days ORDER BY r.seniority_months_from)
           = ARRAY[14, 21, 28, 35]::SMALLINT[]
       AND array_agg(r.seniority_months_from ORDER BY r.seniority_months_from)
           IN (ARRAY[0, 60, 120, 240], ARRAY[0, 72, 132, 252])
  LOOP
    DELETE FROM public.vacation_entitlement_ranges WHERE company_id = v_company;
    INSERT INTO public.vacation_entitlement_ranges
      (company_id, seniority_months_from, seniority_months_to, entitlement_days)
    VALUES (v_company,   0,   60, 14),
           (v_company,  60,  120, 21),
           (v_company, 120,  240, 28),
           (v_company, 240, NULL, 35);
  END LOOP;
END
$migracion$;

-- CUIT de una empresa, para que su cuenta pueda ingresar con él.
CREATE OR REPLACE FUNCTION public.admin_set_company_tax_id(p_company_id BIGINT, p_tax_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_tax TEXT;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede modificar el CUIT';
  END IF;
  v_tax := NULLIF(regexp_replace(COALESCE(p_tax_id, ''), '[^0-9]', '', 'g'), '');
  IF v_tax IS NOT NULL AND v_tax !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'El CUIT debe tener 11 dígitos';
  END IF;
  UPDATE public.companies SET tax_id = v_tax WHERE id = p_company_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 10. Permisos
-- ---------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION private.vacation_base_notice() TO authenticated;
GRANT EXECUTE ON FUNCTION private.days_off_backlog_row(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vacation_notice_days(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.days_off_backlog(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.days_off_backlog_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_tax_id(BIGINT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_company_tax_id(BIGINT, TEXT) FROM PUBLIC, anon;

COMMIT;
