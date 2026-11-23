-- ============================================================================
-- HR Manager - Datos de demostración de la jerarquía Empresa / Encargado
-- ============================================================================
-- Ejecutar en el SQL Editor DESPUÉS de actualizacion_v3_jerarquia.sql y de
-- tener cargados seed_prueba.sql y, si se quiere ver volumen, datos_demo_anual.sql.
--
-- Qué hace sobre "Empresa Test SRL":
--   * habilita el puesto "Encargado de sucursal" como puesto de Encargado;
--   * reparte a los empleados entre dos sucursales, para que el recorte por
--     sucursal se note;
--   * convierte en Encargado a la única cuenta de empleado que existe
--     (empleado@test.com), que pasa a gestionar su sucursal.
--
-- No crea usuarios de Supabase Auth: eso no se puede hacer desde SQL. Usa las
-- cuentas que ya creaste en Authentication > Users.
--
-- Al terminar quedan, para probar:
--   empleador@test.com -> cuenta Empresa     (ve y configura todo)
--   empleado@test.com  -> cuenta Encargado   (ve solo su sucursal)
--
-- Para probar también un empleado común, dalo de alta desde la aplicación:
-- entrá como Encargado y usá "Dar de alta un Nuevo Empleado". Vas a ver que la
-- sucursal viene fija y que los puestos de Encargado no aparecen en la lista.
--
-- Se puede volver a ejecutar sin duplicar nada.
-- ============================================================================

DO $$
DECLARE
  v_company BIGINT;
  v_pos_manager BIGINT;
  v_branch_a BIGINT;
  v_branch_b BIGINT;
  v_dep BIGINT;
  v_manager_employee BIGINT;
  v_manager_email TEXT;
  v_total INTEGER;
  v_en_a INTEGER;
  v_en_b INTEGER;
  r RECORD;
  i INTEGER := 0;
BEGIN
  SELECT id INTO v_company FROM public.companies
   WHERE legal_name = 'Empresa Test SRL' ORDER BY id LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'No se encontró "Empresa Test SRL". Ejecutá antes seed_prueba.sql';
  END IF;

  -- 1. Dos sucursales para repartir el personal
  INSERT INTO public.branches (company_id, name, address)
  VALUES (v_company, 'Sucursal Centro', 'Av. Siempreviva 742')
  ON CONFLICT (company_id, name) DO UPDATE SET is_active = TRUE
  RETURNING id INTO v_branch_a;

  INSERT INTO public.branches (company_id, name, address)
  VALUES (v_company, 'Sucursal Norte', 'Ruta 11 km 320')
  ON CONFLICT (company_id, name) DO UPDATE SET is_active = TRUE
  RETURNING id INTO v_branch_b;

  -- 2. El puesto que habilita como Encargado
  INSERT INTO public.job_positions (company_id, name, is_manager)
  VALUES (v_company, 'Encargado de sucursal', TRUE)
  ON CONFLICT (company_id, name) DO UPDATE SET is_manager = TRUE, is_active = TRUE
  RETURNING id INTO v_pos_manager;

  SELECT id INTO v_dep FROM public.departments
   WHERE company_id = v_company ORDER BY id LIMIT 1;

  -- 3. Reparto parejo de los empleados entre las dos sucursales
  FOR r IN
    SELECT id FROM public.employees WHERE company_id = v_company ORDER BY id
  LOOP
    UPDATE public.employees
       SET branch_id = CASE WHEN i % 2 = 0 THEN v_branch_a ELSE v_branch_b END
     WHERE id = r.id;
    i := i + 1;
  END LOOP;

  -- 4. La cuenta de empleado existente pasa a ser Encargado de su sucursal.
  --    El disparador employees_sync_account_role le cambia el rol solo.
  SELECT ua.employee_id, ua.email INTO v_manager_employee, v_manager_email
    FROM public.user_accounts ua
   WHERE ua.company_id = v_company AND ua.employee_id IS NOT NULL
   ORDER BY ua.id LIMIT 1;

  IF v_manager_employee IS NULL THEN
    RAISE NOTICE 'No hay ninguna cuenta de empleado para convertir en Encargado.';
  ELSE
    UPDATE public.employees
       SET job_position_id = v_pos_manager,
           branch_id = v_branch_a
     WHERE id = v_manager_employee;
  END IF;

  SELECT count(*) INTO v_total FROM public.employees WHERE company_id = v_company;
  SELECT count(*) INTO v_en_a FROM public.employees
   WHERE company_id = v_company AND branch_id = v_branch_a;
  SELECT count(*) INTO v_en_b FROM public.employees
   WHERE company_id = v_company AND branch_id = v_branch_b;

  RAISE NOTICE '--------------------------------------------------------------';
  RAISE NOTICE 'Empresa Test SRL: % empleados', v_total;
  RAISE NOTICE '  Sucursal Centro: % empleados', v_en_a;
  RAISE NOTICE '  Sucursal Norte:  % empleados', v_en_b;
  RAISE NOTICE '';
  RAISE NOTICE 'Entrá como Empresa   -> empleador@test.com  (ve los % empleados)', v_total;
  RAISE NOTICE 'Entrá como Encargado -> %  (ve los % de Sucursal Centro)',
    COALESCE(v_manager_email, 'sin cuenta'), v_en_a;
  RAISE NOTICE '--------------------------------------------------------------';
END;
$$;

-- Resumen de cómo quedaron las cuentas
SELECT ua.email,
       CASE ua.role WHEN 'company' THEN 'Empresa'
                    WHEN 'manager' THEN 'Encargado'
                    ELSE 'Empleado' END AS tipo_de_usuario,
       COALESCE(b.name, '—') AS sucursal,
       COALESCE(jp.name, '—') AS puesto
  FROM public.user_accounts ua
  LEFT JOIN public.employees e ON e.id = ua.employee_id
  LEFT JOIN public.branches b ON b.id = e.branch_id
  LEFT JOIN public.job_positions jp ON jp.id = e.job_position_id
  JOIN public.companies c ON c.id = ua.company_id
 WHERE c.legal_name = 'Empresa Test SRL'
 ORDER BY ua.role, ua.email;

-- Cuántos empleados ve cada sucursal
SELECT b.name AS sucursal, count(e.id) AS empleados
  FROM public.branches b
  LEFT JOIN public.employees e ON e.branch_id = b.id
  JOIN public.companies c ON c.id = b.company_id
 WHERE c.legal_name = 'Empresa Test SRL'
 GROUP BY b.name
 ORDER BY b.name;
