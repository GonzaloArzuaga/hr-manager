-- ==========================================================================
-- Versión 2.2
--  El empleador no puede registrar fichajes (formulario o planilla) en un día
--  en que el empleado tiene vacaciones o franco aprobados.
-- Se puede ejecutar más de una vez.
-- ==========================================================================

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

  -- Con vacaciones o franco aprobados ese día el empleado no fue a trabajar
  IF EXISTS (
       SELECT 1 FROM public.vacation_requests v
        WHERE v.employee_id = p_employee_id
          AND v.status = 'approved'
          AND v_date BETWEEN v.start_date AND v.end_date) THEN
    RAISE EXCEPTION 'El empleado está de vacaciones el %: no se le puede registrar un fichaje', to_char(v_date, 'DD/MM/YYYY');
  END IF;
  IF EXISTS (
       SELECT 1
         FROM public.days_off_request_dates d
         JOIN public.days_off_requests r ON r.id = d.request_id
        WHERE r.employee_id = p_employee_id
          AND r.status = 'approved'
          AND d.requested_date = v_date) THEN
    RAISE EXCEPTION 'El empleado tiene franco el %: no se le puede registrar un fichaje', to_char(v_date, 'DD/MM/YYYY');
  END IF;

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

NOTIFY pgrst, 'reload schema';
