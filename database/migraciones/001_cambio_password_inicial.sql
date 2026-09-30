-- ============================================================================
-- Migración 001 - Cambio obligatorio de la contraseña provisoria (RF-03)
-- Ejecutar en el SQL Editor de Supabase sobre la base existente.
-- ============================================================================

-- Indica si el usuario todavía tiene que reemplazar la contraseña provisoria
-- que le entregó el empleador. Los usuarios existentes quedan en false.
alter table perfiles
  add column if not exists debe_cambiar_password boolean not null default false;

-- El usuario no puede actualizar su perfil directamente (no hay política de
-- UPDATE sobre perfiles), así que la marca se limpia mediante esta función,
-- que solo afecta al perfil del usuario autenticado.
create or replace function marcar_password_cambiada()
returns void
language sql
security definer
set search_path = public
as $$
  update perfiles
     set debe_cambiar_password = false
   where id = auth.uid();
$$;

revoke all on function marcar_password_cambiada() from public;
grant execute on function marcar_password_cambiada() to authenticated;
