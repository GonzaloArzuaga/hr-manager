-- =====================================================================
-- Verificación funcional de la actualización v4
-- =====================================================================
-- Ejecutar sobre una base que ya tenga el schema, la actualización v4 y los
-- datos de prueba (seed_prueba.sql). No deja datos: todo corre dentro de una
-- transacción que termina en ROLLBACK.
--
--   psql -d <base> -f prueba_v4_legal.sql
--
-- En Supabase, pegar el contenido en el SQL Editor.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.probar(p_titulo TEXT, p_sql TEXT, p_debe_fallar BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    IF p_debe_fallar THEN
      RAISE NOTICE 'FALLA  % -> se permitió y debía rechazarse', rpad(p_titulo, 50);
    ELSE
      RAISE NOTICE 'OK     %', rpad(p_titulo, 50);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    IF p_debe_fallar THEN
      RAISE NOTICE 'OK     % -> rechazado', rpad(p_titulo, 50);
    ELSE
      RAISE NOTICE 'FALLA  % -> %', rpad(p_titulo, 50), left(SQLERRM, 60);
    END IF;
  END;
END $$;

-- ---------------------------------------------------------------------
-- 1. Escala de antigüedad del artículo 150, con los bordes exactos
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_id BIGINT; d INTEGER; i INTEGER; anio INTEGER := 2026;
  casos TEXT[][] := ARRAY[
    ['2023-12-31', '3 años exactos',    '14'],
    ['2022-12-31', '4 años exactos',    '14'],
    ['2021-12-31', '5 años exactos',    '14'],
    ['2021-12-30', '5 años y 1 día',    '21'],
    ['2017-12-31', '9 años exactos',    '21'],
    ['2016-12-31', '10 años exactos',   '21'],
    ['2016-12-30', '10 años y 1 día',   '28'],
    ['2007-12-31', '19 años exactos',   '28'],
    ['2006-12-31', '20 años exactos',   '28'],
    ['2006-12-30', '20 años y 1 día',   '35']
  ];
BEGIN
  RAISE NOTICE '--- 1. Días de vacaciones según antigüedad al 31/12/% ---', anio;
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT id INTO v_id FROM public.employees ORDER BY id LIMIT 1;
  UPDATE public.employees SET birth_date = '1980-01-01' WHERE id = v_id;

  FOR i IN 1..array_length(casos, 1) LOOP
    UPDATE public.employees SET hire_date = casos[i][1]::date WHERE id = v_id;
    SELECT public.vacation_entitlement_days(v_id, anio) INTO d;
    IF d::text = casos[i][3] THEN
      RAISE NOTICE 'OK     % -> % días', rpad(casos[i][2], 20), d;
    ELSE
      RAISE NOTICE 'FALLA  % -> % días (esperado %)', rpad(casos[i][2], 20), d, casos[i][3];
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Tiempo mínimo trabajado: artículos 151 y 153
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_id BIGINT; d INTEGER; f DATE; habiles INTEGER; total INTEGER; anio INTEGER := 2026;
BEGIN
  RAISE NOTICE '--- 2. Licencia proporcional de quien ingresó durante el año ---';
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT id INTO v_id FROM public.employees ORDER BY id LIMIT 1;
  UPDATE public.employees SET birth_date = '1980-01-01' WHERE id = v_id;

  SELECT count(*) INTO total FROM generate_series(
    make_date(anio,1,1)::timestamp, make_date(anio,12,31)::timestamp, INTERVAL '1 day') g
   WHERE EXTRACT(ISODOW FROM g) < 6;
  RAISE NOTICE '       el año % tiene % días hábiles; la mitad son %', anio, total, ceil(total/2.0);

  FOREACH f IN ARRAY ARRAY[
    make_date(anio,1,2), make_date(anio,6,30), make_date(anio,7,1),
    make_date(anio,9,1), make_date(anio,11,1)]
  LOOP
    UPDATE public.employees SET hire_date = f WHERE id = v_id;
    SELECT count(*) INTO habiles FROM generate_series(
      f::timestamp, make_date(anio,12,31)::timestamp, INTERVAL '1 day') g
     WHERE EXTRACT(ISODOW FROM g) < 6;
    SELECT public.vacation_entitlement_days(v_id, anio) INTO d;
    RAISE NOTICE '       ingreso % -> % hábiles trabajados -> % días', f, lpad(habiles::text,3), lpad(d::text,2);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Edad mínima y libertad de la fecha de ingreso
-- ---------------------------------------------------------------------
DO $$
DECLARE v_id BIGINT;
BEGIN
  RAISE NOTICE '--- 3. Fechas de nacimiento e ingreso ---';
  SELECT id INTO v_id FROM public.employees ORDER BY id LIMIT 1;
  PERFORM pg_temp.probar('ingreso un día antes de cumplir 18',
    format('UPDATE public.employees SET birth_date=%L, hire_date=%L WHERE id=%s',
           '2010-06-15', '2028-06-14', v_id), TRUE);
  PERFORM pg_temp.probar('ingreso el día que cumple 18',
    format('UPDATE public.employees SET birth_date=%L, hire_date=%L WHERE id=%s',
           '2010-06-15', '2028-06-15', v_id), FALSE);
  PERFORM pg_temp.probar('fecha de ingreso futura',
    format('UPDATE public.employees SET birth_date=%L, hire_date=%L WHERE id=%s',
           '1990-01-01', (private.today() + 90)::text, v_id), FALSE);
  PERFORM pg_temp.probar('fecha de ingreso muy anterior a hoy',
    format('UPDATE public.employees SET birth_date=%L, hire_date=%L WHERE id=%s',
           '1990-01-01', '2009-03-10', v_id), FALSE);
END $$;

-- ---------------------------------------------------------------------
-- 4. Francos desde mañana y vacaciones con 14 + n días
-- ---------------------------------------------------------------------
DO $$
DECLARE v_emp BIGINT; v_auth_e UUID; v_auth_c UUID; hoy DATE;
BEGIN
  RAISE NOTICE '--- 4. Aviso previo de francos y de vacaciones ---';
  SELECT auth_user_id INTO v_auth_c FROM public.user_accounts WHERE role = 'company' LIMIT 1;
  SELECT auth_user_id, employee_id INTO v_auth_e, v_emp
    FROM public.user_accounts WHERE role = 'employee' ORDER BY id LIMIT 1;
  hoy := private.today();

  UPDATE public.employees SET birth_date = '1985-01-01', hire_date = '2015-01-05' WHERE id = v_emp;
  UPDATE public.business_rules
     SET days_off_notice = 1, weekly_days_off = 2, vacation_extra_notice = 0;
  DELETE FROM public.days_off_request_dates;
  DELETE FROM public.days_off_requests;
  DELETE FROM public.vacation_requests;
  DELETE FROM public.vacation_periods;

  PERFORM set_config('request.jwt.claim.sub', v_auth_e::text, false);
  PERFORM pg_temp.probar('el empleado pide un franco para hoy',
    format('SELECT public.submit_days_off_request(ARRAY[%L]::date[], %L)', hoy, 'motivo'), TRUE);
  PERFORM pg_temp.probar('el empleado pide un franco para mañana',
    format('SELECT public.submit_days_off_request(ARRAY[%L]::date[], %L)', hoy + 1, 'motivo'), FALSE);

  PERFORM set_config('request.jwt.claim.sub', v_auth_c::text, false);
  PERFORM pg_temp.probar('la empresa asigna un franco para hoy',
    format('SELECT public.assign_days_off(%s, ARRAY[%L]::date[], %L)', v_emp, hoy, 'asignado'), TRUE);
  PERFORM pg_temp.probar('la empresa asigna un franco a futuro',
    format('SELECT public.assign_days_off(%s, ARRAY[%L]::date[], %L)', v_emp, hoy + 2, 'asignado'), FALSE);

  PERFORM set_config('request.jwt.claim.sub', v_auth_e::text, false);
  PERFORM pg_temp.probar('vacaciones pedidas con 13 días de aviso',
    format('SELECT public.submit_vacation_request(%L,%L)', hoy + 13, hoy + 17), TRUE);
  PERFORM pg_temp.probar('vacaciones pedidas con 14 días de aviso',
    format('SELECT public.submit_vacation_request(%L,%L)', hoy + 14, hoy + 18), FALSE);

  PERFORM set_config('request.jwt.claim.sub', v_auth_c::text, false);
  PERFORM pg_temp.probar('vacaciones asignadas con 10 días de aviso',
    format('SELECT public.assign_vacation(%s,%L,%L)', v_emp, hoy + 10, hoy + 12), TRUE);
  PERFORM pg_temp.probar('vacaciones asignadas con 20 días de aviso',
    format('SELECT public.assign_vacation(%s,%L,%L)', v_emp, hoy + 20, hoy + 22), FALSE);

  UPDATE public.business_rules SET vacation_extra_notice = 7;
  PERFORM set_config('request.jwt.claim.sub', v_auth_e::text, false);
  PERFORM pg_temp.probar('con +7 configurado, vacaciones con 18 días',
    format('SELECT public.submit_vacation_request(%L,%L)', hoy + 18, hoy + 19), TRUE);
  PERFORM pg_temp.probar('con +7 configurado, vacaciones con 21 días',
    format('SELECT public.submit_vacation_request(%L,%L)', hoy + 30, hoy + 31), FALSE);
END $$;

-- ---------------------------------------------------------------------
-- 5. Toda solicitud nace pendiente
-- ---------------------------------------------------------------------
DO $$
DECLARE v_auto INTEGER;
BEGIN
  RAISE NOTICE '--- 5. Estado inicial de las solicitudes ---';
  SELECT count(*) INTO v_auto FROM public.days_off_requests
   WHERE request_type <> 'employer_assignment' AND status <> 'pending';
  IF v_auto = 0 THEN RAISE NOTICE 'OK     ninguna solicitud de franco nació aprobada';
  ELSE RAISE NOTICE 'FALLA  % solicitudes de franco nacieron aprobadas', v_auto; END IF;

  SELECT count(*) INTO v_auto FROM public.vacation_requests
   WHERE COALESCE(resolution_note, '') <> 'Asignadas por el empleador' AND status <> 'pending';
  IF v_auto = 0 THEN RAISE NOTICE 'OK     ninguna solicitud de vacaciones nació aprobada';
  ELSE RAISE NOTICE 'FALLA  % solicitudes de vacaciones nacieron aprobadas', v_auto; END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. Francos adeudados desde el ingreso
-- ---------------------------------------------------------------------
DO $$
DECLARE v_emp BIGINT; r RECORD; i INTEGER; hoy DATE; v_cuenta BIGINT;
BEGIN
  RAISE NOTICE '--- 6. Acumulado de francos adeudados ---';
  PERFORM set_config('request.jwt.claim.sub',
    (SELECT auth_user_id::text FROM public.user_accounts WHERE role = 'company' LIMIT 1), false);
  SELECT id INTO v_cuenta FROM public.user_accounts WHERE role = 'company' LIMIT 1;
  SELECT employee_id INTO v_emp FROM public.user_accounts WHERE role = 'employee' ORDER BY id LIMIT 1;
  hoy := private.today();

  DELETE FROM public.days_off_request_dates;
  DELETE FROM public.days_off_requests;
  UPDATE public.employees
     SET hire_date = date_trunc('week', hoy)::date - 70, birth_date = '1985-01-01'
   WHERE id = v_emp;
  UPDATE public.business_rules SET weekly_days_off = 2, days_off_backlog_from = NULL;

  -- Se verifican las semanas contadas y los francos que corresponden. El
  -- reparto entre reclamables y vencidos lo introduce la v5 y se verifica en
  -- prueba_v5_feriados.sql, así que acá no se mira.
  SELECT * INTO r FROM public.days_off_backlog(v_emp);
  IF r.weeks_elapsed = 10 AND r.expected_days = 20 AND r.taken_days = 0 THEN
    RAISE NOTICE 'OK     10 semanas sin francos -> corresponden 20';
  ELSE
    RAISE NOTICE 'FALLA  % semanas, corresponden %, otorgados %', r.weeks_elapsed, r.expected_days, r.taken_days;
  END IF;

  FOR i IN 1..6 LOOP
    INSERT INTO public.days_off_requests
      (company_id, employee_id, submitted_by_user_id, request_type, category, reason, status, resolved_at)
    SELECT e.company_id, v_emp, v_cuenta, 'employer_assignment', 'ordinary', 'histórico', 'approved', now()
      FROM public.employees e WHERE e.id = v_emp;
    INSERT INTO public.days_off_request_dates (company_id, request_id, requested_date)
    SELECT company_id, currval(pg_get_serial_sequence('public.days_off_requests','id')),
           date_trunc('week', hoy)::date - (70 - i * 7)
      FROM public.days_off_requests
     WHERE id = currval(pg_get_serial_sequence('public.days_off_requests','id'));
  END LOOP;

  SELECT * INTO r FROM public.days_off_backlog(v_emp);
  IF r.taken_days = 6 AND r.expected_days - r.taken_days = 14 THEN
    RAISE NOTICE 'OK     con 6 otorgados -> quedan 14 sin otorgar';
  ELSE
    RAISE NOTICE 'FALLA  otorgados %, corresponden %', r.taken_days, r.expected_days;
  END IF;

  UPDATE public.business_rules SET days_off_backlog_from = date_trunc('week', hoy)::date - 35;
  SELECT * INTO r FROM public.days_off_backlog(v_emp);
  IF r.weeks_elapsed = 5 AND r.expected_days = 10 THEN
    RAISE NOTICE 'OK     con fecha de inicio fijada -> solo cuenta desde ahí';
  ELSE
    RAISE NOTICE 'FALLA  % semanas, corresponden %', r.weeks_elapsed, r.expected_days;
  END IF;
END $$;

ROLLBACK;
