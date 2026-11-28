-- =====================================================================
-- HR Manager · actualización v6: el ingreso es solo por CUIL
-- =====================================================================
--
-- Requiere las actualizaciones v4 y v5 aplicadas.
--
-- Hasta ahora se podía ingresar con el CUIL, el CUIT o el correo. Pasa a
-- admitirse únicamente la identificación tributaria de once dígitos: el CUIL
-- de la persona o el CUIT de la organización.
--
-- Eso deja un hueco: el administrador del sistema no es un empleado y no
-- tenía ninguna identificación cargada. Esta actualización le agrega el
-- campo.
--
-- ATENCIÓN AL ORDEN. Si desplegás la función de ingreso antes de cargarle el
-- CUIL al administrador, se queda sin poder entrar. Ejecutá este guion, fijate
-- el aviso del final, cargá el CUIL y recién después desplegá la función.
--
-- Se puede ejecutar más de una vez sin efectos adversos.
-- =====================================================================

BEGIN;

ALTER TABLE public.system_admins
  ADD COLUMN IF NOT EXISTS cuil VARCHAR(11);

ALTER TABLE public.system_admins
  DROP CONSTRAINT IF EXISTS system_admins_cuil_check;
ALTER TABLE public.system_admins
  ADD CONSTRAINT system_admins_cuil_check
  CHECK (cuil IS NULL OR cuil ~ '^[0-9]{11}$');

CREATE UNIQUE INDEX IF NOT EXISTS system_admins_cuil_uq
  ON public.system_admins (cuil) WHERE cuil IS NOT NULL;

-- El administrador puede cargar o corregir su propia identificación.
CREATE OR REPLACE FUNCTION public.admin_set_own_cuil(p_cuil TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_cuil TEXT;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede modificar su CUIL';
  END IF;
  v_cuil := NULLIF(regexp_replace(COALESCE(p_cuil, ''), '[^0-9]', '', 'g'), '');
  IF v_cuil IS NULL OR v_cuil !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'El CUIL debe tener 11 dígitos';
  END IF;
  UPDATE public.system_admins SET cuil = v_cuil WHERE auth_user_id = auth.uid();
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_set_own_cuil(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_own_cuil(TEXT) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------
-- Aviso: quién quedaría sin poder ingresar
-- ---------------------------------------------------------------------
DO $aviso$
DECLARE
  v_admins INTEGER;
  v_empresas INTEGER;
  v_empleados INTEGER;
  r RECORD;
BEGIN
  SELECT count(*) INTO v_admins FROM public.system_admins WHERE cuil IS NULL;
  SELECT count(*) INTO v_empresas
    FROM public.companies c
   WHERE c.tax_id IS NULL
     AND EXISTS (SELECT 1 FROM public.user_accounts u
                  WHERE u.company_id = c.id AND u.role = 'company' AND u.is_active);
  SELECT count(*) INTO v_empleados
    FROM public.user_accounts u
    JOIN public.employees e ON e.id = u.employee_id
   WHERE u.is_active AND (e.cuil IS NULL OR e.cuil !~ '^[0-9]{11}$');

  RAISE NOTICE '--------------------------------------------------------';
  IF v_admins = 0 AND v_empresas = 0 AND v_empleados = 0 THEN
    RAISE NOTICE 'Todas las cuentas activas tienen su identificación cargada.';
    RAISE NOTICE 'Ya podés desplegar la función de ingreso.';
  ELSE
    RAISE NOTICE 'ATENCIÓN: hay cuentas sin identificación. Si desplegás la';
    RAISE NOTICE 'función de ingreso así, no van a poder entrar.';
    RAISE NOTICE '';
    IF v_admins > 0 THEN
      RAISE NOTICE '  % administrador(es) del sistema sin CUIL. Cargalo con:', v_admins;
      FOR r IN SELECT u.email FROM public.system_admins a
                 JOIN auth.users u ON u.id = a.auth_user_id
                WHERE a.cuil IS NULL
      LOOP
        RAISE NOTICE '    UPDATE public.system_admins SET cuil = ''20123456789''';
        RAISE NOTICE '     WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = %);', quote_literal(r.email);
      END LOOP;
    END IF;
    IF v_empresas > 0 THEN
      RAISE NOTICE '  % empresa(s) sin CUIT. Cargalo con:', v_empresas;
      FOR r IN SELECT c.id, c.legal_name FROM public.companies c
                WHERE c.tax_id IS NULL
                  AND EXISTS (SELECT 1 FROM public.user_accounts u
                               WHERE u.company_id = c.id AND u.role = 'company' AND u.is_active)
      LOOP
        RAISE NOTICE '    UPDATE public.companies SET tax_id = ''30712345671'' WHERE id = %; -- %', r.id, r.legal_name;
      END LOOP;
    END IF;
    IF v_empleados > 0 THEN
      RAISE NOTICE '  % cuenta(s) de empleado con un CUIL inválido en su ficha.', v_empleados;
    END IF;
  END IF;
  RAISE NOTICE '--------------------------------------------------------';
END
$aviso$;

COMMIT;
