-- =====================================================================
-- HR Manager · credenciales de demostración, una por rol
-- =====================================================================
--
-- Deja armada una organización de demostración con los cuatro tipos de
-- usuario, para mostrar el sistema sin tocar los datos que ya tengas.
--
-- ---------------------------------------------------------------------
-- ANTES DE EJECUTAR ESTE GUION
-- ---------------------------------------------------------------------
-- Supabase administra las contraseñas en su propio esquema, así que las
-- cuentas de acceso se crean desde el panel y no desde acá.
--
-- Entrá a Authentication > Users > Add user y creá estas cuatro, marcando
-- "Auto Confirm User" en todas. La contraseña es la misma para las cuatro:
--
--     HrManager.2026
--
--     admin.demo@hrmanager.test
--     empresa.demo@hrmanager.test
--     encargada.demo@hrmanager.test
--     empleado.demo@hrmanager.test
--
-- Después pegá este guion en el SQL Editor y ejecutalo. Se puede ejecutar
-- más de una vez: si la organización ya existe, no la duplica.
--
-- ---------------------------------------------------------------------
-- CON QUÉ SE INGRESA DESPUÉS
-- ---------------------------------------------------------------------
-- El ingreso es por CUIL. Los correos de arriba no sirven para entrar: son
-- solo el identificador interno de Supabase y el destino de la recuperación
-- de contraseña.
--
--   Administrador del sistema   20301112220    HrManager.2026
--   Empresa (ingresa con CUIT)  30712345671    HrManager.2026
--   Encargada de sucursal       27284559016    HrManager.2026
--   Empleado                    20356781237    HrManager.2026
--
-- Las cuatro identificaciones tienen dígito verificador válido.
-- =====================================================================

DO $demo$
DECLARE
  v_company BIGINT;
  v_auth_admin UUID;
  v_auth_empresa UUID;
  v_auth_encargada UUID;
  v_auth_empleado UUID;
  v_plan TEXT;
  v_falta TEXT := '';
BEGIN
  -- ---------------- comprobación previa ----------------
  SELECT id INTO v_auth_admin     FROM auth.users WHERE lower(email) = 'admin.demo@hrmanager.test';
  SELECT id INTO v_auth_empresa   FROM auth.users WHERE lower(email) = 'empresa.demo@hrmanager.test';
  SELECT id INTO v_auth_encargada FROM auth.users WHERE lower(email) = 'encargada.demo@hrmanager.test';
  SELECT id INTO v_auth_empleado  FROM auth.users WHERE lower(email) = 'empleado.demo@hrmanager.test';

  IF v_auth_admin     IS NULL THEN v_falta := v_falta || ' admin.demo@hrmanager.test'; END IF;
  IF v_auth_empresa   IS NULL THEN v_falta := v_falta || ' empresa.demo@hrmanager.test'; END IF;
  IF v_auth_encargada IS NULL THEN v_falta := v_falta || ' encargada.demo@hrmanager.test'; END IF;
  IF v_auth_empleado  IS NULL THEN v_falta := v_falta || ' empleado.demo@hrmanager.test'; END IF;

  IF v_falta <> '' THEN
    RAISE EXCEPTION 'Faltan crear estas cuentas en Authentication > Users:%. Creálas con la contraseña HrManager.2026 y Auto Confirm User, y volvé a ejecutar.', v_falta;
  END IF;

  -- ---------------- administrador del sistema ----------------
  INSERT INTO public.system_admins (auth_user_id, display_name)
  VALUES (v_auth_admin, 'Administrador de demostración')
  ON CONFLICT (auth_user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

  UPDATE public.system_admins SET cuil = '20301112220' WHERE auth_user_id = v_auth_admin;

  -- ---------------- organización ----------------
  SELECT id INTO v_company FROM public.companies WHERE tax_id = '30712345671';

  IF v_company IS NULL THEN
    v_company := public.admin_create_company(
      'Demo HR Manager SA', 'empresa.demo@hrmanager.test',
      'Demo HR Manager SA', '30712345671');
  END IF;

  -- El plan más completo que haya cargado, para que no falte ningún módulo
  SELECT code INTO v_plan FROM public.plans
   ORDER BY COALESCE(max_employees, 2147483647) DESC, sort_order DESC LIMIT 1;
  IF v_plan IS NOT NULL THEN
    UPDATE public.companies SET plan_code = v_plan, is_active = TRUE WHERE id = v_company;
  END IF;

  -- La cuenta Empresa entra directo, sin el cambio de contraseña del primer ingreso
  UPDATE public.user_accounts
     SET must_change_password = FALSE, is_active = TRUE
   WHERE company_id = v_company AND role = 'company';

  -- ---------------- estructura ----------------
  INSERT INTO public.departments (company_id, name) VALUES
    (v_company, 'Administración'), (v_company, 'Ventas')
  ON CONFLICT (company_id, name) DO NOTHING;

  INSERT INTO public.branches (company_id, name) VALUES
    (v_company, 'Centro'), (v_company, 'Norte')
  ON CONFLICT (company_id, name) DO NOTHING;

  INSERT INTO public.job_positions (company_id, name, is_manager) VALUES
    (v_company, 'Encargado de sucursal', TRUE),
    (v_company, 'Vendedor', FALSE)
  ON CONFLICT (company_id, name) DO UPDATE SET is_manager = EXCLUDED.is_manager;

  INSERT INTO public.shift_types (company_id, code, name, starts_at, ends_at) VALUES
    (v_company, 'demo-manana', 'Turno Mañana', '08:00', '16:00'),
    (v_company, 'demo-tarde',  'Turno Tarde',  '14:00', '22:00')
  ON CONFLICT (company_id, code) DO NOTHING;

  -- ---------------- encargada ----------------
  -- El rol sale del puesto: al ocupar un puesto marcado como de encargado,
  -- la cuenta nace con rol manager.
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE company_id = v_company AND cuil = '27284559016') THEN
    PERFORM public.admin_create_employee(
      v_company, v_auth_encargada, 'Carla Giménez', 'encargada.demo@hrmanager.test',
      '27284559016', 'Ventas', 'Centro', 'Encargado de sucursal',
      '1988-04-12'::DATE, '2018-03-01'::DATE);
  END IF;

  -- ---------------- empleado ----------------
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE company_id = v_company AND cuil = '20356781237') THEN
    PERFORM public.admin_create_employee(
      v_company, v_auth_empleado, 'Martín Sosa', 'empleado.demo@hrmanager.test',
      '20356781237', 'Ventas', 'Centro', 'Vendedor',
      '1991-09-23'::DATE, '2019-06-10'::DATE);
  END IF;

  -- Las dos cuentas entran directo, sin el cambio de contraseña del primer ingreso
  UPDATE public.user_accounts
     SET must_change_password = FALSE, is_active = TRUE
   WHERE company_id = v_company
     AND employee_id IN (SELECT id FROM public.employees
                          WHERE company_id = v_company
                            AND cuil IN ('27284559016', '20356781237'));

  RAISE NOTICE '';
  RAISE NOTICE '================= credenciales de demostración =================';
  RAISE NOTICE '  Se ingresa con el CUIL, sin puntos ni guiones.';
  RAISE NOTICE '';
  RAISE NOTICE '  Administrador del sistema   20301112220   HrManager.2026';
  RAISE NOTICE '  Empresa (CUIT)              30712345671   HrManager.2026';
  RAISE NOTICE '  Encargada, sucursal Centro  27284559016   HrManager.2026';
  RAISE NOTICE '  Empleado, sucursal Centro   20356781237   HrManager.2026';
  RAISE NOTICE '';
  RAISE NOTICE '  Organización: Demo HR Manager SA (id %)', v_company;
  RAISE NOTICE '================================================================';
END
$demo$;

-- Comprobación: así tiene que quedar.
SELECT
  CASE
    WHEN a.cuil IS NOT NULL THEN 'Administrador del sistema'
    WHEN u.role = 'company' THEN 'Empresa'
    WHEN u.role = 'manager' THEN 'Encargado'
    ELSE 'Empleado'
  END AS rol,
  COALESCE(a.cuil, c.tax_id, e.cuil) AS ingresa_con,
  COALESCE(u.display_name, a.display_name, e.full_name) AS nombre,
  b.name AS sucursal,
  u.must_change_password AS pide_cambiar_clave
FROM public.system_admins a
FULL JOIN public.user_accounts u ON FALSE
LEFT JOIN public.employees e ON e.id = u.employee_id
LEFT JOIN public.companies c ON c.id = u.company_id AND u.role = 'company'
LEFT JOIN public.branches b ON b.id = e.branch_id
WHERE a.cuil = '20301112220'
   OR u.company_id = (SELECT id FROM public.companies WHERE tax_id = '30712345671')
ORDER BY 1;
