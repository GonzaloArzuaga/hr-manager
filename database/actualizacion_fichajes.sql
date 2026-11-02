-- ============================================================================
-- HR Manager - Actualización: fichajes del empleador
-- Para un proyecto que ya tiene corrido schema_supabase.sql. No borra datos.
-- Se puede correr más de una vez sin problema.
-- ============================================================================

-- 1. Corrección: actualización automática de updated_at
--    La versión anterior del schema no creaba estos disparadores.
CREATE OR REPLACE TRIGGER companies_set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER employees_set_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER user_accounts_set_updated_at BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER shift_types_set_updated_at BEFORE UPDATE ON public.shift_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER business_rules_set_updated_at BEFORE UPDATE ON public.business_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER work_schedules_set_updated_at BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER attendance_records_set_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER days_off_requests_set_updated_at BEFORE UPDATE ON public.days_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER vacation_requests_set_updated_at BEFORE UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER payroll_records_set_updated_at BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Registro y corrección de fichajes por parte del empleador
-- El empleador registra o corrige la entrada y la salida de un empleado.
-- Las horas llegan en hora local de Argentina. Si la salida es anterior a la
-- entrada, el formulario ya la manda con la fecha del día siguiente (turno
-- noche). La llegada tarde se calcula con 10 minutos de tolerancia, igual que
-- en el fichaje del propio empleado.
CREATE OR REPLACE FUNCTION public.register_attendance(
  p_employee_id BIGINT,
  p_clock_in TIMESTAMP,
  p_clock_out TIMESTAMP DEFAULT NULL
)
RETURNS public.attendance_records
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc public.user_accounts := private.current_account();
  v_emp public.employees;
  v_sched public.work_schedules;
  v_now TIMESTAMP := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires');
  v_date DATE;
  v_rec public.attendance_records;
BEGIN
  IF v_acc.id IS NULL OR v_acc.role <> 'employer' THEN
    RAISE EXCEPTION 'Solo el empleador puede registrar fichajes';
  END IF;

  SELECT * INTO v_emp FROM public.employees
   WHERE id = p_employee_id AND company_id = v_acc.company_id;
  IF v_emp.id IS NULL THEN
    RAISE EXCEPTION 'El empleado no pertenece a tu organización';
  END IF;
  IF v_emp.employment_status = 'inactive' THEN
    RAISE EXCEPTION 'No se pueden registrar fichajes de un empleado dado de baja';
  END IF;

  IF p_clock_in IS NULL THEN
    RAISE EXCEPTION 'Indicá la fecha y la hora de entrada';
  END IF;
  IF p_clock_in > v_now THEN
    RAISE EXCEPTION 'La entrada no puede ser posterior a este momento';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out <= p_clock_in THEN
    RAISE EXCEPTION 'La salida tiene que ser posterior a la entrada';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out > v_now THEN
    RAISE EXCEPTION 'La salida no puede ser posterior a este momento';
  END IF;
  IF p_clock_out IS NOT NULL AND p_clock_out - p_clock_in > INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Entre la entrada y la salida no puede haber más de 24 horas';
  END IF;

  v_date := p_clock_in::DATE;
  SELECT * INTO v_sched FROM public.work_schedules
   WHERE company_id = v_acc.company_id
     AND employee_id = p_employee_id
     AND week_start_date = date_trunc('week', v_date)::DATE
     AND status = 'confirmed';

  INSERT INTO public.attendance_records
    (company_id, employee_id, work_schedule_id, work_date, clock_in_at, clock_out_at, status)
  VALUES (
    v_acc.company_id, p_employee_id, v_sched.id, v_date,
    p_clock_in AT TIME ZONE 'America/Argentina/Buenos_Aires',
    p_clock_out AT TIME ZONE 'America/Argentina/Buenos_Aires',
    CASE WHEN v_sched.id IS NOT NULL
          AND p_clock_in::TIME > v_sched.starts_at_snapshot + INTERVAL '10 minutes'
         THEN 'late' ELSE 'present' END
  )
  ON CONFLICT (company_id, employee_id, work_date) DO UPDATE
     SET work_schedule_id = EXCLUDED.work_schedule_id,
         clock_in_at = EXCLUDED.clock_in_at,
         clock_out_at = EXCLUDED.clock_out_at,
         status = EXCLUDED.status
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_attendance(BIGINT, TIMESTAMP, TIMESTAMP) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_attendance(BIGINT, TIMESTAMP, TIMESTAMP) TO authenticated;
