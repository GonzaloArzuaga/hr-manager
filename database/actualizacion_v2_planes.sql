-- ==========================================================================
-- HRManager v2: características de los planes guardadas en la base
-- Ejecutar en el SQL Editor de Supabase después de actualizacion_resultado_solicitudes.sql.
-- Se puede ejecutar más de una vez. La versión anterior del frontend sigue
-- funcionando con este cambio (solo agrega columnas y parámetros opcionales).
-- ==========================================================================

-- Lista de características que muestra la página de Precios, además del límite de
-- empleados y de los módulos, que salen de max_employees y modules.
-- Formato: [{"label": "Soporte técnico básico", "included": true}, ...]
-- highlighted marca el plan que aparece como "Más popular".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'features') THEN
    ALTER TABLE public.plans ADD COLUMN features JSONB NOT NULL DEFAULT '[]'::JSONB;
    ALTER TABLE public.plans ADD COLUMN highlighted BOOLEAN NOT NULL DEFAULT FALSE;
    -- Valores iniciales: los que la página de Precios tenía escritos en el código
    UPDATE public.plans SET features = '[{"label": "Soporte técnico básico", "included": true}]'::JSONB
     WHERE code = 'operativo';
    UPDATE public.plans SET features = '[{"label": "Soporte prioritario técnico 24/7", "included": true}]'::JSONB,
           highlighted = TRUE
     WHERE code = 'profesional';
    UPDATE public.plans SET features = '[{"label": "Soporte prioritario técnico 24/7", "included": true},
                                         {"label": "Cláusula de blindaje y consultoría jurídica directa", "included": true}]'::JSONB
     WHERE code = 'a_medida';
  END IF;
END;
$$;

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_features_array;
ALTER TABLE public.plans ADD CONSTRAINT plans_features_array CHECK (jsonb_typeof(features) = 'array');

-- Edición de planes: ahora también características y plan destacado
DROP FUNCTION IF EXISTS public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT[]);
CREATE OR REPLACE FUNCTION public.admin_update_plan(
  p_code TEXT, p_name TEXT, p_description TEXT, p_monthly_price NUMERIC, p_max_employees INTEGER,
  p_modules TEXT[] DEFAULT NULL, p_features JSONB DEFAULT NULL, p_highlighted BOOLEAN DEFAULT NULL
)
RETURNS public.plans
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.plans;
  v_item JSONB;
  v_features JSONB := '[]'::JSONB;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede editar los planes';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'El plan necesita un nombre';
  END IF;
  IF p_monthly_price IS NOT NULL AND p_monthly_price < 0 THEN
    RAISE EXCEPTION 'El precio no puede ser negativo';
  END IF;
  IF p_max_employees IS NOT NULL AND p_max_employees < 1 THEN
    RAISE EXCEPTION 'El máximo de empleados tiene que ser al menos 1';
  END IF;
  IF p_modules IS NOT NULL AND NOT (p_modules <@ ARRAY['fichajes', 'sueldos', 'estadisticas']::TEXT[]) THEN
    RAISE EXCEPTION 'Hay un módulo que no existe';
  END IF;
  IF p_features IS NOT NULL THEN
    IF jsonb_typeof(p_features) <> 'array' OR jsonb_array_length(p_features) > 12 THEN
      RAISE EXCEPTION 'Las características tienen que ser una lista de hasta 12 elementos';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_features) LOOP
      IF btrim(COALESCE(v_item->>'label', '')) = '' THEN
        CONTINUE;  -- las filas vacías se descartan
      END IF;
      IF char_length(btrim(v_item->>'label')) > 120 THEN
        RAISE EXCEPTION 'Cada característica puede tener hasta 120 caracteres';
      END IF;
      v_features := v_features || jsonb_build_array(jsonb_build_object(
        'label', btrim(v_item->>'label'),
        'included', COALESCE((v_item->>'included')::BOOLEAN, TRUE)));
    END LOOP;
  END IF;
  UPDATE public.plans
     SET name = btrim(p_name), description = NULLIF(btrim(COALESCE(p_description, '')), ''),
         monthly_price = p_monthly_price, max_employees = p_max_employees,
         modules = COALESCE(p_modules, modules),
         features = CASE WHEN p_features IS NULL THEN features ELSE v_features END,
         highlighted = COALESCE(p_highlighted, highlighted)
   WHERE code = p_code
  RETURNING * INTO v_plan;
  IF v_plan.code IS NULL THEN
    RAISE EXCEPTION 'El plan no existe';
  END IF;
  RETURN v_plan;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT[], JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_plan(TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT[], JSONB, BOOLEAN) TO authenticated;
