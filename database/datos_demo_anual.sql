-- ============================================================================
-- HR Manager - Un año de datos de demostración
-- ============================================================================
-- Ejecutar en el SQL Editor DESPUÉS de seed_prueba.sql. Completa "Empresa Test
-- SRL" con 20 empleados más y, para los últimos 12 meses:
--   * horarios semanales con turnos mañana, tarde, noche y jornada regular
--   * dos francos por semana para cada empleado
--   * vacaciones de verano e invierno, y algunas pendientes de fin de año
--   * fichajes de cada día trabajado, con llegadas tarde y ausencias
--   * sueldos mensuales y aguinaldos
-- Sirve para ver Estadísticas, Fichajes y Sueldos con información real.
-- Los recibos de demostración no tienen PDF: al abrirlos se avisa que no está.
-- Se puede correr una sola vez; si se repite, no duplica lo que ya existe.
-- ============================================================================

-- Todo va en una transacción: si algo falla, no queda nada a medias.
BEGIN;

-- Mientras se cargan los datos no se generan notificaciones
ALTER TABLE public.work_schedules DISABLE TRIGGER work_schedules_notify;
ALTER TABLE public.days_off_requests DISABLE TRIGGER days_off_requests_notify_insert;
ALTER TABLE public.days_off_requests DISABLE TRIGGER days_off_requests_notify_update;
ALTER TABLE public.vacation_requests DISABLE TRIGGER vacation_requests_notify;
ALTER TABLE public.payroll_records DISABLE TRIGGER payroll_records_notify;

DO $$
DECLARE
  v_company BIGINT;
  v_employer BIGINT;
  v_first_week DATE := date_trunc('week', current_date)::DATE - 52 * 7;
  v_last_week DATE := date_trunc('week', current_date)::DATE + 14;
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
  r RECORD;
  v_dep BIGINT; v_branch BIGINT; v_pos BIGINT;
  v_number INTEGER;
BEGIN
  PERFORM setseed(0.42);

  SELECT id INTO v_company FROM public.companies WHERE legal_name = 'Empresa Test SRL';
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Primero corré seed_prueba.sql: no existe Empresa Test SRL';
  END IF;
  SELECT id INTO v_employer FROM public.user_accounts
   WHERE company_id = v_company AND role = 'employer' ORDER BY id LIMIT 1;

  -- 1. Veinte empleados más, sin cuenta de acceso
  SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_number FROM public.employees WHERE company_id = v_company;
  FOR r IN SELECT * FROM (VALUES
    ('Julián Ferreyra', '20311456782', 'Logística', 'Sucursal Norte', 'Operador de Autoelevador', '1987-02-11', '2016-03-01'),
    ('Camila Benítez', '27355123406', 'Logística', 'Sucursal Norte', 'Despachante', '1993-07-24', '2020-08-17'),
    ('Diego Quiroga', '20288877659', 'Logística', 'Centro Operativo', 'Chofer de Reparto', '1984-11-05', '2014-05-12'),
    ('Agustina Ríos', '27402233118', 'Logística', 'Centro Operativo', 'Despachante', '1998-01-30', '2022-02-07'),
    ('Matías Correa', '20367788214', 'Logística', 'Sucursal Sur', 'Chofer de Reparto', '1990-09-18', '2018-10-01'),
    ('Florencia Gómez', '27389911225', 'Operaciones', 'Centro Operativo', 'Operaria de Producción', '1995-04-02', '2021-06-14'),
    ('Nicolás Herrera', '20345566780', 'Operaciones', 'Centro Operativo', 'Operario de Producción', '1991-12-20', '2017-01-09'),
    ('Rocío Medina', '27377788903', 'Operaciones', 'Centro Operativo', 'Control de Calidad', '1994-06-08', '2019-11-04'),
    ('Tomás Acosta', '20399988117', 'Operaciones', 'Sucursal Sur', 'Operario de Producción', '1997-03-15', '2023-01-16'),
    ('Valentina Sosa', '27412233440', 'Operaciones', 'Sucursal Sur', 'Operaria de Producción', '2000-10-27', '2024-03-04'),
    ('Gonzalo Molina', '20302211998', 'Operaciones', 'Centro Operativo', 'Supervisor de Turno', '1985-08-13', '2012-07-02'),
    ('Micaela Torres', '27366644552', 'Atención al Cliente', 'Sede Central', 'Representante de Atención', '1992-05-19', '2018-04-23'),
    ('Federico Luna', '20377711336', 'Atención al Cliente', 'Sede Central', 'Representante de Atención', '1996-02-28', '2021-09-01'),
    ('Paula Domínguez', '27384455661', 'Atención al Cliente', 'Sucursal Norte', 'Representante de Atención', '1995-11-11', '2022-05-16'),
    ('Ezequiel Romero', '20322299885', 'Mantenimiento', 'Centro Operativo', 'Técnico de Mantenimiento', '1988-01-07', '2015-02-02'),
    ('Lautaro Giménez', '20411122339', 'Mantenimiento', 'Sucursal Sur', 'Técnico de Mantenimiento', '1999-09-09', '2023-08-07'),
    ('Carolina Méndez', '27333344778', 'Administración', 'Sede Central', 'Analista Contable', '1989-03-26', '2016-10-17'),
    ('Sebastián Ortiz', '20355533447', 'Administración', 'Sede Central', 'Analista de Sueldos', '1993-12-01', '2020-01-06'),
    ('Luciana Vega', '27391122004', 'Recursos Humanos', 'Sede Central', 'Analista de RRHH', '1996-07-14', '2021-03-15'),
    ('Marcos Navarro', '20316677889', 'Seguridad', 'Centro Operativo', 'Vigilador', '1983-04-22', '2013-09-30')
  ) AS t(name, cuil, dep, branch, pos, birth, hire) LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.employees WHERE company_id = v_company AND cuil = r.cuil);
    INSERT INTO public.departments (company_id, name) VALUES (v_company, r.dep)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_dep;
    INSERT INTO public.branches (company_id, name) VALUES (v_company, r.branch)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_branch;
    INSERT INTO public.job_positions (company_id, name) VALUES (v_company, r.pos)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_pos;
    v_number := v_number + 1;
    INSERT INTO public.employees (company_id, employee_number, full_name, email, cuil,
      department_id, branch_id, job_position_id, birth_date, hire_date)
    VALUES (v_company, v_number::TEXT, r.name,
      lower(translate(split_part(r.name, ' ', 1), 'áéíóú', 'aeiou')) || '.' ||
      lower(translate(split_part(r.name, ' ', 2), 'áéíóú', 'aeiou')) || '@test.com',
      r.cuil, v_dep, v_branch, v_pos, r.birth::DATE, r.hire::DATE);
  END LOOP;

  -- 2. Horarios: cada empleado tiene un turno base y rota de a un mes
  INSERT INTO public.work_schedules (company_id, employee_id, week_start_date, shift_type_id,
    shift_name_snapshot, starts_at_snapshot, ends_at_snapshot, created_by_user_id)
  SELECT v_company, e.id, w.week, st.id, st.name, st.starts_at, st.ends_at, v_employer
  FROM public.employees e
  CROSS JOIN generate_series(v_first_week, v_last_week, INTERVAL '7 days') AS w(week)
  JOIN public.shift_types st ON st.company_id = v_company AND st.code =
    CASE WHEN e.id % 5 = 0 THEN 'turno-regular'
         ELSE (ARRAY['turno-manana', 'turno-tarde', 'turno-manana', 'turno-noche'])
              [1 + ((e.id + EXTRACT(MONTH FROM w.week)::INT) % 4)] END
  WHERE e.company_id = v_company AND e.employment_status <> 'inactive'
  ON CONFLICT (company_id, employee_id, week_start_date) DO NOTHING;

  -- 3. Francos: dos días seguidos por semana, que cambian según el empleado
  FOR r IN
    SELECT e.id AS employee_id, w.week::DATE AS week, (e.id % 6)::INT AS first_day,
           COALESCE(ua.id, v_employer) AS submitted_by, ua.id IS NOT NULL AS own
    FROM public.employees e
    CROSS JOIN generate_series(v_first_week, v_last_week, INTERVAL '7 days') AS w(week)
    LEFT JOIN public.user_accounts ua ON ua.employee_id = e.id AND ua.role = 'employee'
    WHERE e.company_id = v_company AND e.employment_status <> 'inactive'
      AND NOT EXISTS (
        SELECT 1 FROM public.days_off_requests dr
        JOIN public.days_off_request_dates dd ON dd.request_id = dr.id
        WHERE dr.employee_id = e.id AND dd.requested_date BETWEEN w.week::DATE AND w.week::DATE + 6)
  LOOP
    WITH req AS (
      INSERT INTO public.days_off_requests (company_id, employee_id, submitted_by_user_id, request_type,
        reason, status, resolved_by_user_id, resolved_at, submitted_at)
      VALUES (v_company, r.employee_id, r.submitted_by,
        CASE WHEN r.own THEN 'grouped' ELSE 'employer_assignment' END,
        'Franco semanal',
        CASE WHEN r.week > v_today AND r.own AND random() < 0.5 THEN 'pending' ELSE 'approved' END,
        v_employer, r.week - 10, r.week - 12)
      RETURNING id
    )
    INSERT INTO public.days_off_request_dates (company_id, request_id, requested_date, notice_days, is_taken, taken_at)
    SELECT v_company, req.id, r.week + r.first_day + k, 12, (r.week + r.first_day + k) < v_today,
           CASE WHEN (r.week + r.first_day + k) < v_today THEN (r.week + r.first_day + k)::TIMESTAMPTZ END
    FROM req CROSS JOIN generate_series(0, 1) AS k;
  END LOOP;

  -- 4. Vacaciones: períodos 2025 y 2026, una vacación por empleado y algunas pendientes
  INSERT INTO public.vacation_periods (company_id, employee_id, period_code, starts_on, ends_on, entitled_days)
  SELECT v_company, e.id, y::TEXT, make_date(y, 1, 1), make_date(y, 12, 31),
         CASE WHEN y - EXTRACT(YEAR FROM e.hire_date) >= 20 THEN 35
              WHEN y - EXTRACT(YEAR FROM e.hire_date) >= 10 THEN 28
              WHEN y - EXTRACT(YEAR FROM e.hire_date) >= 5 THEN 21 ELSE 14 END
  FROM public.employees e CROSS JOIN (VALUES (2025), (2026)) AS years(y)
  WHERE e.company_id = v_company
  ON CONFLICT (company_id, employee_id, period_code) DO NOTHING;

  FOR r IN
    SELECT e.id AS employee_id, vp.id AS period_id, ROW_NUMBER() OVER (ORDER BY e.id) AS n
    FROM public.employees e
    JOIN public.vacation_periods vp ON vp.employee_id = e.id AND vp.period_code = '2026'
    WHERE e.company_id = v_company AND e.employment_status <> 'inactive'
      AND NOT EXISTS (SELECT 1 FROM public.vacation_requests vr
                       WHERE vr.employee_id = e.id AND vr.status = 'approved'
                         AND EXTRACT(YEAR FROM vr.start_date) = 2026)
  LOOP
    -- Temporada de verano (enero y febrero) y vacaciones de invierno (julio)
    INSERT INTO public.vacation_requests (company_id, employee_id, vacation_period_id, submitted_by_user_id,
      start_date, end_date, requested_days, status, resolved_by_user_id, resolved_at, submitted_at)
    VALUES (v_company, r.employee_id, r.period_id, v_employer,
      (ARRAY[DATE '2026-01-05', DATE '2026-01-19', DATE '2026-02-02', DATE '2026-07-13', DATE '2026-01-12'])[1 + (r.n % 5)::INT],
      (ARRAY[DATE '2026-01-05', DATE '2026-01-19', DATE '2026-02-02', DATE '2026-07-13', DATE '2026-01-12'])[1 + (r.n % 5)::INT] + 13,
      14, 'approved', v_employer, DATE '2025-11-20', DATE '2025-11-15');

    IF r.n % 4 = 0 THEN
      INSERT INTO public.vacation_requests (company_id, employee_id, vacation_period_id, submitted_by_user_id,
        start_date, end_date, requested_days, status, submitted_at)
      VALUES (v_company, r.employee_id, r.period_id, v_employer,
        DATE '2026-12-14' + (r.n % 3)::INT * 7, DATE '2026-12-14' + (r.n % 3)::INT * 7 + 6, 7, 'pending', now() - INTERVAL '3 days');
    ELSIF r.n % 7 = 0 THEN
      INSERT INTO public.vacation_requests (company_id, employee_id, vacation_period_id, submitted_by_user_id,
        start_date, end_date, requested_days, status, resolution_note, resolved_by_user_id, resolved_at, submitted_at)
      VALUES (v_company, r.employee_id, r.period_id, v_employer,
        DATE '2026-03-09', DATE '2026-03-15', 7, 'rejected', 'Coincide con el inventario anual', v_employer,
        DATE '2026-02-10', DATE '2026-02-05');
    END IF;
  END LOOP;

  -- 5. Fichajes de cada día trabajado: la mayoría puntuales, algunos tarde y pocas ausencias
  INSERT INTO public.attendance_records (company_id, employee_id, work_schedule_id, work_date, clock_in_at, clock_out_at, status)
  SELECT v_company, ws.employee_id, ws.id, d.day,
         (d.day + ws.starts_at_snapshot + make_interval(mins => d.delay)) AT TIME ZONE 'America/Argentina/Buenos_Aires',
         (d.day + ws.starts_at_snapshot + make_interval(mins => d.delay + 470 + d.extra)) AT TIME ZONE 'America/Argentina/Buenos_Aires',
         CASE WHEN d.delay > 10 THEN 'late' ELSE 'present' END
  FROM public.work_schedules ws
  CROSS JOIN LATERAL (
    SELECT day::DATE AS day,
           CASE WHEN random() < 0.11 THEN 11 + floor(random() * 35)::INT ELSE floor(random() * 16)::INT - 8 END AS delay,
           floor(random() * 25)::INT AS extra,
           random() AS chance
    FROM generate_series(ws.week_start_date, ws.week_start_date + 6, INTERVAL '1 day') AS day
  ) d
  WHERE ws.company_id = v_company AND ws.status = 'confirmed'
    AND d.day < v_today
    AND d.chance > 0.04
    AND NOT EXISTS (
      SELECT 1 FROM public.days_off_requests dr
      JOIN public.days_off_request_dates dd ON dd.request_id = dr.id
      WHERE dr.employee_id = ws.employee_id AND dr.status = 'approved' AND dd.requested_date = d.day)
    AND NOT EXISTS (
      SELECT 1 FROM public.vacation_requests vr
      WHERE vr.employee_id = ws.employee_id AND vr.status = 'approved' AND d.day BETWEEN vr.start_date AND vr.end_date)
  ON CONFLICT (company_id, employee_id, work_date) DO NOTHING;

  -- 6. Sueldos de los últimos 12 meses y aguinaldos de junio y diciembre
  INSERT INTO public.payroll_periods (company_id, starts_on)
  SELECT v_company, m::DATE
  FROM generate_series(date_trunc('month', v_today) - INTERVAL '12 months', date_trunc('month', v_today) - INTERVAL '1 month', INTERVAL '1 month') AS m
  ON CONFLICT (company_id, starts_on) DO NOTHING;

  INSERT INTO public.payroll_records (company_id, employee_id, payroll_period_id, payment_type, net_amount,
    payment_date, status, receipt_original_file_name, receipt_storage_key, receipt_content_type,
    receipt_size_bytes, receipt_uploaded_at, receipt_uploaded_by_user_id, created_by_user_id)
  SELECT v_company, e.id, pp.id, t.payment_type,
         round((720000 + (e.id % 9) * 85000) * power(1.025, (pp.starts_on - (v_today - 365)) / 30.0)
               * CASE WHEN t.payment_type = 'salary' THEN 1 ELSE 0.5 END, -2),
         (pp.starts_on + INTERVAL '1 month' + INTERVAL '3 days')::DATE, 'paid',
         'recibo-demo.pdf', 'demo/' || v_company || '/' || e.id || '/' || to_char(pp.starts_on, 'YYYY-MM') || '-' || t.payment_type || '.pdf',
         'application/pdf', 48000, pp.starts_on + INTERVAL '1 month' + INTERVAL '3 days', v_employer, v_employer
  FROM public.employees e
  JOIN public.payroll_periods pp ON pp.company_id = v_company
  CROSS JOIN (VALUES ('salary'), ('aguinaldo_first_installment'), ('aguinaldo_second_installment')) AS t(payment_type)
  WHERE e.company_id = v_company AND e.employment_status <> 'inactive'
    AND pp.starts_on >= date_trunc('month', v_today) - INTERVAL '12 months'
    AND pp.starts_on < date_trunc('month', v_today)
    AND pp.starts_on >= e.hire_date
    AND (t.payment_type = 'salary'
         OR (t.payment_type = 'aguinaldo_first_installment' AND EXTRACT(MONTH FROM pp.starts_on) = 6)
         OR (t.payment_type = 'aguinaldo_second_installment' AND EXTRACT(MONTH FROM pp.starts_on) = 12))
  ON CONFLICT (company_id, employee_id, payroll_period_id, payment_type) DO NOTHING;
END;
$$;

ALTER TABLE public.work_schedules ENABLE TRIGGER work_schedules_notify;
ALTER TABLE public.days_off_requests ENABLE TRIGGER days_off_requests_notify_insert;
ALTER TABLE public.days_off_requests ENABLE TRIGGER days_off_requests_notify_update;
ALTER TABLE public.vacation_requests ENABLE TRIGGER vacation_requests_notify;
ALTER TABLE public.payroll_records ENABLE TRIGGER payroll_records_notify;

COMMIT;

-- Resumen de lo cargado
SELECT
  (SELECT count(*) FROM public.employees) AS empleados,
  (SELECT count(*) FROM public.work_schedules) AS horarios,
  (SELECT count(*) FROM public.days_off_requests) AS solicitudes_de_franco,
  (SELECT count(*) FROM public.vacation_requests) AS solicitudes_de_vacaciones,
  (SELECT count(*) FROM public.attendance_records) AS fichajes,
  (SELECT count(*) FROM public.payroll_records) AS sueldos;
