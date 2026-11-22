-- Permite al administrador actualizar los datos de contacto y el plan
-- de interés al registrar el resultado de una entrevista, sin crear empresa.

DROP FUNCTION IF EXISTS public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT);

CREATE OR REPLACE FUNCTION public.admin_update_demo_request(
  p_id BIGINT,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_company_id BIGINT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_plan_code TEXT DEFAULT NULL
)
RETURNS public.demo_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.demo_requests;
  v_email TEXT;
  v_plan TEXT;
BEGIN
  IF NOT private.is_system_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede gestionar las solicitudes';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'contacted', 'converted', 'discarded') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;
  IF p_email IS NOT NULL THEN
    v_email := lower(btrim(p_email));
    IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
      RAISE EXCEPTION 'Ingresá un correo electrónico válido';
    END IF;
  END IF;
  IF p_contact_name IS NOT NULL AND char_length(btrim(p_contact_name)) > 120 THEN
    RAISE EXCEPTION 'El nombre del empleador no puede superar los 120 caracteres';
  END IF;
  IF p_company_name IS NOT NULL AND char_length(btrim(p_company_name)) > 160 THEN
    RAISE EXCEPTION 'La razón social no puede superar los 160 caracteres';
  END IF;
  IF p_plan_code IS NOT NULL THEN
    v_plan := NULLIF(btrim(p_plan_code), '');
    IF v_plan IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan) THEN
      RAISE EXCEPTION 'El plan seleccionado no existe';
    END IF;
  END IF;

  UPDATE public.demo_requests
     SET status = p_status,
         admin_notes = CASE WHEN p_admin_notes IS NULL THEN admin_notes ELSE left(p_admin_notes, 1000) END,
         company_id = COALESCE(p_company_id, company_id),
         email = CASE WHEN p_email IS NULL THEN email ELSE v_email END,
         contact_name = CASE WHEN p_contact_name IS NULL THEN contact_name ELSE NULLIF(btrim(p_contact_name), '') END,
         company_name = CASE WHEN p_company_name IS NULL THEN company_name ELSE NULLIF(btrim(p_company_name), '') END,
         plan_code = CASE WHEN p_plan_code IS NULL THEN plan_code ELSE v_plan END
   WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no existe';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_demo_request(BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
