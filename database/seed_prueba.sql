-- ============================================================================
-- HR Manager - Datos de prueba
-- Ejecutar DESPUÉS de schema_supabase.sql, en el SQL Editor de Supabase.
-- Antes, crear dos usuarios en Authentication > Users > Add user,
-- marcando "Auto Confirm User":
--   empleador@test.com   (la contraseña que quieran)
--   empleado@test.com    (será su contraseña provisoria)
--   admin@test.com       (opcional: administrador del sistema)
-- ============================================================================

DO $$
DECLARE
  v_company BIGINT;
  v_employer BIGINT;
  v_auth UUID;
  v_emp public.employees;
  v_dep BIGINT; v_branch BIGINT; v_pos BIGINT;
  v_week DATE := date_trunc('week', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::date;
  v_morning BIGINT; v_regular BIGINT; v_afternoon BIGINT;
  r RECORD;
BEGIN
  -- Empresa, reglas por defecto, régimen de vacaciones y cuenta del empleador
  v_company := public.admin_create_company('Empresa Test SRL', 'empleador@test.com', 'Valeria Rossi');
  SELECT id INTO v_employer FROM public.user_accounts WHERE company_id = v_company AND role = 'employer';

  INSERT INTO public.shift_types (company_id, code, name, starts_at, ends_at) VALUES
    (v_company, 'turno-manana', 'Turno Mañana', '06:00', '14:00'),
    (v_company, 'turno-regular', 'Jornada Regular', '09:00', '17:00'),
    (v_company, 'turno-tarde', 'Turno Tarde', '14:00', '22:00'),
    (v_company, 'turno-noche', 'Turno Noche', '22:00', '06:00');
  SELECT id INTO v_morning FROM public.shift_types WHERE company_id = v_company AND code = 'turno-manana';
  SELECT id INTO v_regular FROM public.shift_types WHERE company_id = v_company AND code = 'turno-regular';
  SELECT id INTO v_afternoon FROM public.shift_types WHERE company_id = v_company AND code = 'turno-tarde';

  -- Empleado con cuenta y contraseña provisoria: en su primer ingreso debe cambiarla
  SELECT id INTO v_auth FROM auth.users WHERE lower(email) = 'empleado@test.com';
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Primero creá el usuario empleado@test.com en Authentication > Users';
  END IF;
  v_emp := public.admin_create_employee(v_company, v_auth, 'Roberto Morales', 'empleado@test.com',
    '20338291042', 'Logística', 'Sucursal Norte', 'Despachante', '1988-05-14', '2018-01-12');

  -- Otros empleados de ejemplo, sin cuenta de acceso
  FOR r IN SELECT * FROM (VALUES
    ('Sofía Valenzuela', 's.valenzuela@test.com', '27362018894', 'Operaciones', 'Centro Operativo', 'Supervisora de Planta', '1991-10-22'::date, '2019-04-04'::date),
    ('Martín Aranda', 'm.aranda@test.com', '20294017738', 'Logística', 'Sucursal Norte', 'Operador de Autoelevador', '1982-03-03'::date, '2015-10-15'::date),
    ('Lucía Paz', 'l.paz@test.com', '27401928441', 'Administración', 'Sede Central', 'Analista Contable', '1996-08-19'::date, '2023-03-01'::date)
  ) AS t(name, email, cuil, dep, branch, pos, birth, hire) LOOP
    INSERT INTO public.departments (company_id, name) VALUES (v_company, r.dep)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_dep;
    INSERT INTO public.branches (company_id, name) VALUES (v_company, r.branch)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_branch;
    INSERT INTO public.job_positions (company_id, name) VALUES (v_company, r.pos)
      ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_pos;
    INSERT INTO public.employees (company_id, employee_number, full_name, email, cuil,
      department_id, branch_id, job_position_id, birth_date, hire_date)
    VALUES (v_company,
      (SELECT (MAX(employee_number::BIGINT) + 1)::TEXT FROM public.employees WHERE company_id = v_company),
      r.name, r.email, r.cuil, v_dep, v_branch, v_pos, r.birth, r.hire);
  END LOOP;

  -- Horarios de la semana actual y la siguiente
  INSERT INTO public.work_schedules (company_id, employee_id, week_start_date, shift_type_id,
    shift_name_snapshot, starts_at_snapshot, ends_at_snapshot, created_by_user_id)
  SELECT v_company, e.id, w.week, st.id, st.name, st.starts_at, st.ends_at, v_employer
  FROM public.employees e
  CROSS JOIN (VALUES (v_week), (v_week + 7)) AS w(week)
  JOIN public.shift_types st ON st.id = CASE e.employee_number
    WHEN '1' THEN v_regular WHEN '2' THEN v_afternoon ELSE v_morning END
  WHERE e.company_id = v_company;
END;
$$;

-- Administrador del sistema (opcional): si existe el usuario admin@test.com en
-- Authentication > Users, se lo registra como administrador. Entra por /login
-- y administra las empresas desde /admin.
INSERT INTO public.system_admins (auth_user_id, display_name)
SELECT id, 'Administrador del sistema' FROM auth.users WHERE lower(email) = 'admin@test.com'
ON CONFLICT (auth_user_id) DO NOTHING;
