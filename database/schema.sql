-- ============================================================================
-- HR MANAGER - Esquema de base de datos completo
-- ============================================================================
-- Cómo usar este archivo:
-- 1. Andá al panel de Supabase de tu proyecto -> SQL Editor -> New query
-- 2. Pegá TODO este archivo y ejecutalo (botón "Run")
-- 3. Listo: quedan creadas las tablas, las funciones del motor de reglas,
--    las vistas de estadísticas y las políticas de seguridad (RLS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================================

-- Organizaciones (esto es lo que hace al sistema multiempresa / multi-tenant)
create table organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_invitacion text not null unique,
  creado_en timestamptz not null default now()
);

-- Perfiles de usuario: extiende la tabla auth.users que ya crea Supabase
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  nombre_completo text not null,
  rol text not null check (rol in ('empleador', 'empleado')),
  creado_en timestamptz not null default now()
);

-- Datos laborales de cada empleado (1 a 1 con un perfil de rol 'empleado')
create table empleados (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references perfiles(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  fecha_ingreso date not null,
  tipo_turno text not null check (tipo_turno in ('fijo', 'rotativo')),
  activo boolean not null default true
);

-- Reglas de negocio configurables por organización (el "motor de reglas")
create table reglas_organizacion (
  organizacion_id uuid primary key references organizaciones(id) on delete cascade,
  francos_por_semana int not null default 2,
  requiere_aprobacion_franco boolean not null default true,
  requiere_aprobacion_vacaciones boolean not null default true,
  dias_aviso_previo_franco int not null default 2,
  dias_aviso_previo_vacaciones int not null default 15,
  actualizado_en timestamptz not null default now()
);

-- Tramos de antigüedad -> días de vacaciones (también configurable por organización)
create table regimen_vacaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  antiguedad_minima_anios int not null,
  antiguedad_maxima_anios int, -- null = sin tope superior
  dias_vacaciones int not null
);

-- Horarios asignados a cada empleado
create table horarios (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fin time not null
);

-- Fichajes (marcaciones reales de entrada/salida) - insumo del módulo de estadísticas
create table fichajes (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  fecha date not null,
  hora_entrada time,
  hora_salida time
);

-- Solicitudes de franco
create table solicitudes_franco (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  fecha date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  creado_en timestamptz not null default now()
);

-- Solicitudes de vacaciones
create table solicitudes_vacaciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  creado_en timestamptz not null default now()
);

-- Pagos de sueldo (módulo de sueldos: sin cálculo de liquidación, solo registro y recibo)
create table pagos_sueldo (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleados(id) on delete cascade,
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  periodo text not null, -- formato 'YYYY-MM', ej '2026-08'
  monto numeric(12, 2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'acreditado')),
  fecha_pago date,
  recibo_path text, -- ruta del archivo en Supabase Storage
  creado_en timestamptz not null default now(),
  unique (empleado_id, periodo)
);

-- ============================================================================
-- 2. FUNCIONES DE ALTA (registro de empleador y de empleado)
-- ============================================================================

-- Un usuario nuevo que se registra como EMPLEADOR crea una organización nueva
create or replace function registrar_empleador(p_nombre_organizacion text, p_nombre_completo text)
returns organizaciones
language plpgsql
security definer
as $$
declare
  v_org organizaciones;
  v_codigo text;
begin
  v_codigo := upper(substr(md5(random()::text), 1, 6));

  insert into organizaciones (nombre, codigo_invitacion)
  values (p_nombre_organizacion, v_codigo)
  returning * into v_org;

  insert into perfiles (id, organizacion_id, nombre_completo, rol)
  values (auth.uid(), v_org.id, p_nombre_completo, 'empleador');

  insert into reglas_organizacion (organizacion_id)
  values (v_org.id);

  -- Régimen de vacaciones por defecto, basado en la Ley de Contrato de Trabajo argentina
  insert into regimen_vacaciones (organizacion_id, antiguedad_minima_anios, antiguedad_maxima_anios, dias_vacaciones)
  values
    (v_org.id, 0, 4, 14),
    (v_org.id, 5, 9, 21),
    (v_org.id, 10, 19, 28),
    (v_org.id, 20, null, 35);

  return v_org;
end;
$$;

-- Un usuario nuevo que se registra como EMPLEADO se une a una organización existente
-- usando el código de invitación que le pasó su empleador
create or replace function registrar_empleado(
  p_codigo_invitacion text,
  p_nombre_completo text,
  p_fecha_ingreso date,
  p_tipo_turno text
)
returns empleados
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
  v_empleado empleados;
begin
  select id into v_org_id
  from organizaciones
  where codigo_invitacion = upper(p_codigo_invitacion);

  if v_org_id is null then
    raise exception 'El código de organización ingresado no es válido';
  end if;

  insert into perfiles (id, organizacion_id, nombre_completo, rol)
  values (auth.uid(), v_org_id, p_nombre_completo, 'empleado');

  insert into empleados (perfil_id, organizacion_id, fecha_ingreso, tipo_turno)
  values (auth.uid(), v_org_id, p_fecha_ingreso, p_tipo_turno)
  returning * into v_empleado;

  return v_empleado;
end;
$$;

-- ============================================================================
-- 3. MOTOR DE REGLAS DE NEGOCIO
-- ============================================================================
-- Estas funciones son el corazón del proyecto: validan cada solicitud contra
-- la configuración propia de CADA organización (tabla reglas_organizacion y
-- regimen_vacaciones), en lugar de tener las reglas fijas en el código.

-- Calcula cuántos días de vacaciones le corresponden a un empleado según su antigüedad
create or replace function calcular_dias_vacaciones(p_empleado_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_organizacion_id uuid;
  v_fecha_ingreso date;
  v_antiguedad_anios int;
  v_dias int;
begin
  select organizacion_id, fecha_ingreso into v_organizacion_id, v_fecha_ingreso
  from empleados where id = p_empleado_id;

  v_antiguedad_anios := extract(year from age(current_date, v_fecha_ingreso));

  select dias_vacaciones into v_dias
  from regimen_vacaciones
  where organizacion_id = v_organizacion_id
    and antiguedad_minima_anios <= v_antiguedad_anios
    and (antiguedad_maxima_anios is null or antiguedad_maxima_anios >= v_antiguedad_anios)
  order by antiguedad_minima_anios desc
  limit 1;

  return coalesce(v_dias, 0);
end;
$$;

-- Valida y crea una solicitud de franco respetando los días de aviso configurados
create or replace function solicitar_franco(p_empleado_id uuid, p_fecha date)
returns solicitudes_franco
language plpgsql
security definer
as $$
declare
  v_organizacion_id uuid;
  v_reglas reglas_organizacion;
  v_nueva solicitudes_franco;
begin
  select organizacion_id into v_organizacion_id from empleados where id = p_empleado_id;
  select * into v_reglas from reglas_organizacion where organizacion_id = v_organizacion_id;

  if (p_fecha - current_date) < v_reglas.dias_aviso_previo_franco then
    raise exception 'Debe solicitar el franco con al menos % día(s) de anticipación', v_reglas.dias_aviso_previo_franco;
  end if;

  insert into solicitudes_franco (empleado_id, organizacion_id, fecha, estado)
  values (
    p_empleado_id, v_organizacion_id, p_fecha,
    case when v_reglas.requiere_aprobacion_franco then 'pendiente' else 'aprobado' end
  )
  returning * into v_nueva;

  return v_nueva;
end;
$$;

-- Valida y crea una solicitud de vacaciones respetando días disponibles y aviso previo
create or replace function solicitar_vacaciones(p_empleado_id uuid, p_fecha_inicio date, p_fecha_fin date)
returns solicitudes_vacaciones
language plpgsql
security definer
as $$
declare
  v_organizacion_id uuid;
  v_reglas reglas_organizacion;
  v_dias_solicitados int;
  v_dias_disponibles int;
  v_dias_ya_tomados int;
  v_nueva solicitudes_vacaciones;
begin
  select organizacion_id into v_organizacion_id from empleados where id = p_empleado_id;
  select * into v_reglas from reglas_organizacion where organizacion_id = v_organizacion_id;

  if (p_fecha_inicio - current_date) < v_reglas.dias_aviso_previo_vacaciones then
    raise exception 'Debe solicitar las vacaciones con al menos % día(s) de anticipación', v_reglas.dias_aviso_previo_vacaciones;
  end if;

  v_dias_solicitados := (p_fecha_fin - p_fecha_inicio) + 1;
  v_dias_disponibles := calcular_dias_vacaciones(p_empleado_id);

  select coalesce(sum((fecha_fin - fecha_inicio) + 1), 0) into v_dias_ya_tomados
  from solicitudes_vacaciones
  where empleado_id = p_empleado_id
    and estado in ('aprobado', 'pendiente')
    and extract(year from fecha_inicio) = extract(year from p_fecha_inicio);

  if (v_dias_ya_tomados + v_dias_solicitados) > v_dias_disponibles then
    raise exception 'La solicitud excede los días de vacaciones disponibles (% disponibles, % ya solicitados/tomados este año)',
      v_dias_disponibles, v_dias_ya_tomados;
  end if;

  insert into solicitudes_vacaciones (empleado_id, organizacion_id, fecha_inicio, fecha_fin, estado)
  values (
    p_empleado_id, v_organizacion_id, p_fecha_inicio, p_fecha_fin,
    case when v_reglas.requiere_aprobacion_vacaciones then 'pendiente' else 'aprobado' end
  )
  returning * into v_nueva;

  return v_nueva;
end;
$$;

-- ============================================================================
-- 4. VISTAS DEL MÓDULO DE ESTADÍSTICAS
-- ============================================================================

-- Demanda de personal por día de la semana (según horarios asignados)
create or replace view vista_demanda_por_dia as
select organizacion_id, dia_semana, count(*) as cantidad_turnos
from horarios
group by organizacion_id, dia_semana;

-- Demanda de personal por franja horaria
create or replace view vista_demanda_por_horario as
select organizacion_id, extract(hour from hora_inicio)::int as hora, count(*) as cantidad_turnos
from horarios
group by organizacion_id, extract(hour from hora_inicio);

-- Meses del año con más solicitudes de vacaciones
create or replace view vista_vacaciones_mas_solicitadas as
select organizacion_id, extract(month from fecha_inicio)::int as mes, count(*) as cantidad_solicitudes
from solicitudes_vacaciones
where estado in ('pendiente', 'aprobado')
group by organizacion_id, extract(month from fecha_inicio);

-- ============================================================================
-- 5. FUNCIONES AUXILIARES PARA SEGURIDAD (RLS)
-- ============================================================================

create or replace function mi_organizacion_id()
returns uuid
language sql
security definer
stable
as $$
  select organizacion_id from perfiles where id = auth.uid();
$$;

create or replace function mi_rol()
returns text
language sql
security definer
stable
as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function mi_empleado_id()
returns uuid
language sql
security definer
stable
as $$
  select id from empleados where perfil_id = auth.uid();
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY: cada organización solo ve sus propios datos,
--    y cada empleado solo ve lo suyo (esto es lo que hace seguro el
--    esquema multi-tenant)
-- ============================================================================

alter table organizaciones enable row level security;
alter table perfiles enable row level security;
alter table empleados enable row level security;
alter table reglas_organizacion enable row level security;
alter table regimen_vacaciones enable row level security;
alter table horarios enable row level security;
alter table fichajes enable row level security;
alter table solicitudes_franco enable row level security;
alter table solicitudes_vacaciones enable row level security;
alter table pagos_sueldo enable row level security;

create policy "ver mi organizacion" on organizaciones
  for select using (id = mi_organizacion_id());

create policy "ver perfiles de mi organizacion" on perfiles
  for select using (organizacion_id = mi_organizacion_id());

create policy "empleador ve todos los empleados" on empleados
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado se ve a si mismo" on empleados
  for select using (perfil_id = auth.uid());
create policy "empleador administra empleados" on empleados
  for update using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "leer reglas de mi organizacion" on reglas_organizacion
  for select using (organizacion_id = mi_organizacion_id());
create policy "empleador actualiza reglas" on reglas_organizacion
  for update using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "leer regimen vacaciones" on regimen_vacaciones
  for select using (organizacion_id = mi_organizacion_id());
create policy "empleador administra regimen" on regimen_vacaciones
  for all using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "empleador ve todos los horarios" on horarios
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado ve sus horarios" on horarios
  for select using (empleado_id = mi_empleado_id());
create policy "empleador administra horarios" on horarios
  for all using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "empleador ve todos los fichajes" on fichajes
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado ve sus fichajes" on fichajes
  for select using (empleado_id = mi_empleado_id());
create policy "empleado registra su fichaje" on fichajes
  for insert with check (empleado_id = mi_empleado_id());

create policy "empleador ve todas las solicitudes de franco" on solicitudes_franco
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado ve sus solicitudes de franco" on solicitudes_franco
  for select using (empleado_id = mi_empleado_id());
create policy "empleador actualiza solicitudes de franco" on solicitudes_franco
  for update using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "empleador ve todas las solicitudes de vacaciones" on solicitudes_vacaciones
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado ve sus solicitudes de vacaciones" on solicitudes_vacaciones
  for select using (empleado_id = mi_empleado_id());
create policy "empleador actualiza solicitudes de vacaciones" on solicitudes_vacaciones
  for update using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

create policy "empleador ve todos los pagos" on pagos_sueldo
  for select using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');
create policy "empleado ve su propio pago" on pagos_sueldo
  for select using (empleado_id = mi_empleado_id());
create policy "empleador administra pagos" on pagos_sueldo
  for all using (organizacion_id = mi_organizacion_id() and mi_rol() = 'empleador');

-- ============================================================================
-- 7. ALMACENAMIENTO DE RECIBOS DE SUELDO (Supabase Storage)
-- ============================================================================
-- Los archivos se guardan con la ruta: {organizacion_id}/{empleado_id}/{periodo}.pdf

insert into storage.buckets (id, name, public)
values ('recibos-sueldo', 'recibos-sueldo', false)
on conflict (id) do nothing;

create policy "empleador sube recibos de su organizacion"
on storage.objects for insert
with check (
  bucket_id = 'recibos-sueldo'
  and (storage.foldername(name))[1] = mi_organizacion_id()::text
  and mi_rol() = 'empleador'
);

create policy "empleador lee recibos de su organizacion"
on storage.objects for select
using (
  bucket_id = 'recibos-sueldo'
  and (storage.foldername(name))[1] = mi_organizacion_id()::text
  and mi_rol() = 'empleador'
);

create policy "empleado lee su propio recibo"
on storage.objects for select
using (
  bucket_id = 'recibos-sueldo'
  and (storage.foldername(name))[2] = mi_empleado_id()::text
);

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
