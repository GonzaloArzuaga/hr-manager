-- =====================================================================
-- Verificación funcional de la actualización v5
-- =====================================================================
-- Requiere el schema, las actualizaciones v4 y v5, y los datos de prueba.
-- Corre entero dentro de una transacción que termina en ROLLBACK: no deja
-- datos ni toca el calendario de feriados que ya tengas cargado.
--
--   psql -d <base> -f prueba_v5_feriados.sql
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.verificar(p_titulo TEXT, p_ok BOOLEAN, p_detalle TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok THEN
    RAISE NOTICE 'OK     %', rpad(p_titulo, 52);
  ELSE
    RAISE NOTICE 'FALLA  % -> %', rpad(p_titulo, 52), COALESCE(p_detalle, 'sin detalle');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Sincronización del calendario
-- ---------------------------------------------------------------------
DO $$
DECLARE v_cargados INTEGER; v_admin UUID;
BEGIN
  RAISE NOTICE '--- 1. Calendario de feriados ---';

  SELECT auth_user_id INTO v_admin FROM public.system_admins LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE NOTICE 'OMITIDO  no hay administrador del sistema cargado en esta base';
    RETURN;
  END IF;
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, false);

  -- Lo que devuelve la API: fecha, tipo y nombre.
  SELECT public.admin_sync_holidays(2026, '[
    {"fecha":"2026-01-01","tipo":"inamovible","nombre":"Año Nuevo"},
    {"fecha":"2026-05-01","tipo":"inamovible","nombre":"Día del Trabajador"},
    {"fecha":"2026-07-09","tipo":"inamovible","nombre":"Día de la Independencia"},
    {"fecha":"2026-12-25","tipo":"inamovible","nombre":"Navidad"},
    {"fecha":"2026-12-24","tipo":"no_laborable","nombre":"Víspera de Navidad"}
  ]'::jsonb) INTO v_cargados;

  PERFORM pg_temp.verificar('se cargan los feriados del año', v_cargados = 5, v_cargados::text);
  PERFORM pg_temp.verificar('el feriado obligatorio no es día hábil',
    private.is_holiday(NULL, '2026-12-25'));
  PERFORM pg_temp.verificar('el día no laborable sigue siendo hábil',
    NOT private.is_holiday(NULL, '2026-12-24'));
  PERFORM pg_temp.verificar('un día común no es feriado',
    NOT private.is_holiday(NULL, '2026-12-26'));

  -- Volver a sincronizar reemplaza el año sin duplicar
  SELECT public.admin_sync_holidays(2026, '[
    {"fecha":"2026-01-01","tipo":"inamovible","nombre":"Año Nuevo"},
    {"fecha":"2026-05-01","tipo":"inamovible","nombre":"Día del Trabajador"}
  ]'::jsonb) INTO v_cargados;
  PERFORM pg_temp.verificar('resincronizar reemplaza, no duplica',
    (SELECT count(*) FROM public.public_holidays
      WHERE company_id IS NULL AND holiday_date BETWEEN '2026-01-01' AND '2026-12-31') = 2);
END $$;

-- ---------------------------------------------------------------------
-- 2. Días hábiles y artículo 151
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_company BIGINT; v_sin INTEGER; v_con INTEGER;
BEGIN
  RAISE NOTICE '--- 2. Días hábiles con feriados descontados ---';
  SELECT id INTO v_company FROM public.companies ORDER BY id LIMIT 1;

  -- Mayo de 2026: el 1 de mayo es feriado y cae viernes.
  v_con := private.workdays_between(v_company, '2026-05-01', '2026-05-31');
  SELECT count(*) INTO v_sin
    FROM generate_series('2026-05-01'::timestamp, '2026-05-31'::timestamp, INTERVAL '1 day') g
   WHERE EXTRACT(ISODOW FROM g) < 6;

  PERFORM pg_temp.verificar('el feriado se descuenta de los días hábiles',
    v_con = v_sin - 1, format('con %s, sin %s', v_con, v_sin));
END $$;

-- ---------------------------------------------------------------------
-- 3. Feriado propio de la organización
-- ---------------------------------------------------------------------
DO $$
DECLARE v_company BIGINT;
BEGIN
  RAISE NOTICE '--- 3. Feriados propios de la empresa ---';
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT private.current_company_id() INTO v_company;

  PERFORM public.set_company_holiday('2026-08-30', 'Fiesta patronal');
  PERFORM pg_temp.verificar('la empresa carga un feriado propio',
    private.is_holiday(v_company, '2026-08-30'));
  PERFORM pg_temp.verificar('ese feriado no afecta a otras organizaciones',
    NOT private.is_holiday(-1, '2026-08-30'));

  PERFORM public.delete_company_holiday('2026-08-30');
  PERFORM pg_temp.verificar('la empresa quita su feriado',
    NOT private.is_holiday(v_company, '2026-08-30'));
END $$;

-- ---------------------------------------------------------------------
-- 4. Francos adeudados con el artículo 207
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_emp BIGINT; v_cuenta BIGINT; hoy DATE; r RECORD;
BEGIN
  RAISE NOTICE '--- 4. Francos adeudados: reclamables y vencidos ---';
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT id INTO v_cuenta FROM public.user_accounts WHERE role = 'company' LIMIT 1;
  SELECT employee_id INTO v_emp FROM public.user_accounts WHERE role = 'employee' ORDER BY id LIMIT 1;
  hoy := private.today();

  DELETE FROM public.days_off_request_dates;
  DELETE FROM public.days_off_requests;
  UPDATE public.employees
     SET hire_date = date_trunc('week', hoy)::DATE - 70, birth_date = '1985-01-01'
   WHERE id = v_emp;
  UPDATE public.business_rules
     SET weekly_days_off = 2, days_off_backlog_from = NULL, days_off_backlog_expires = TRUE;

  SELECT * INTO r FROM public.days_off_backlog(v_emp);
  PERFORM pg_temp.verificar('diez semanas completas contadas', r.weeks_elapsed = 10, r.weeks_elapsed::text);
  PERFORM pg_temp.verificar('corresponden veinte francos', r.expected_days = 20, r.expected_days::text);
  PERFORM pg_temp.verificar('solo son reclamables los de las últimas semanas',
    r.claimable_days > 0 AND r.claimable_days < r.expected_days,
    format('reclamables %s de %s', r.claimable_days, r.expected_days));
  PERFORM pg_temp.verificar('el resto figura como vencido',
    r.claimable_days + r.expired_days = r.expected_days,
    format('%s + %s <> %s', r.claimable_days, r.expired_days, r.expected_days));
  PERFORM pg_temp.verificar('la deuda exigible es la reclamable',
    r.owed_days = r.claimable_days);
  PERFORM pg_temp.verificar('informa hasta cuándo se puede reclamar',
    r.claim_deadline IS NOT NULL AND r.claim_deadline >= hoy, COALESCE(r.claim_deadline::text, 'nulo'));

  UPDATE public.business_rules SET days_off_backlog_expires = FALSE;
  SELECT * INTO r FROM public.days_off_backlog(v_emp);
  PERFORM pg_temp.verificar('sin caducidad, la deuda es el total',
    r.owed_days = r.expected_days, format('%s <> %s', r.owed_days, r.expected_days));
  UPDATE public.business_rules SET days_off_backlog_expires = TRUE;
END $$;

-- ---------------------------------------------------------------------
-- 5. Recargo del 100 % sobre el franco compensatorio
-- ---------------------------------------------------------------------
DO $$
DECLARE v_emp BIGINT; hoy DATE; v_req public.days_off_requests; v_error TEXT;
BEGIN
  RAISE NOTICE '--- 5. Recargo del artículo 207 ---';
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT employee_id INTO v_emp FROM public.user_accounts WHERE role = 'employee' ORDER BY id LIMIT 1;
  hoy := private.today();

  v_req := public.assign_days_off(v_emp, ARRAY[hoy + 3]::DATE[], 'compensatorio', 'compensatory', TRUE);
  PERFORM pg_temp.verificar('el franco compensatorio queda marcado con recargo',
    v_req.pay_surcharge AND v_req.category = 'compensatory');

  BEGIN
    PERFORM public.assign_days_off(v_emp, ARRAY[hoy + 5]::DATE[], 'comun', 'ordinary', TRUE);
    PERFORM pg_temp.verificar('el recargo exige franco compensatorio', FALSE, 'se permitió');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.verificar('el recargo exige franco compensatorio', TRUE);
  END;
END $$;

ROLLBACK;
