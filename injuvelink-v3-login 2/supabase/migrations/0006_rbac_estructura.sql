-- INJUVE Link · Fase 4 (v3): base de usuarios, roles y permisos (RBAC)
-- Aplicada en Supabase el 2026-07-22.
create table if not exists public.roles (
  codigo text primary key, nombre text not null, orden int not null default 0
);
create table if not exists public.permisos (
  codigo text primary key, modulo text not null, accion text not null, descripcion text
);
create table if not exists public.roles_permisos (
  rol_codigo text not null references public.roles(codigo) on delete cascade,
  permiso_codigo text not null references public.permisos(codigo) on delete cascade,
  scope text not null default 'global',
  primary key (rol_codigo, permiso_codigo)
);
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, correo text not null unique,
  rol_codigo text not null references public.roles(codigo),
  password_hash text, activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.roles enable row level security;
alter table public.permisos enable row level security;
alter table public.roles_permisos enable row level security;
alter table public.usuarios enable row level security;

create or replace function public.crear_usuario(p_nombre text, p_correo text, p_rol text, p_password text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into usuarios (nombre, correo, rol_codigo, password_hash)
  values (p_nombre, lower(p_correo), p_rol, crypt(p_password, gen_salt('bf', 10))) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.usuario_set_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin update usuarios set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = p_id; end; $$;

create or replace function public.usuario_login(p_correo text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare u record; v_perms json;
begin
  select * into u from usuarios where lower(correo) = lower(p_correo) and activo = true;
  if not found then return null; end if;
  if u.password_hash is null or u.password_hash <> crypt(p_password, u.password_hash) then return null; end if;
  select coalesce(json_agg(json_build_object('codigo', permiso_codigo, 'scope', scope)), '[]'::json)
    into v_perms from roles_permisos where rol_codigo = u.rol_codigo;
  return json_build_object('id', u.id, 'nombre', u.nombre, 'correo', u.correo, 'rol', u.rol_codigo, 'permisos', v_perms);
end; $$;

revoke all on function public.crear_usuario(text,text,text,text) from public, anon, authenticated;
revoke all on function public.usuario_set_password(uuid,text) from public, anon, authenticated;
revoke all on function public.usuario_login(text,text) from public, anon, authenticated;
grant execute on function public.crear_usuario(text,text,text,text) to service_role;
grant execute on function public.usuario_set_password(uuid,text) to service_role;
grant execute on function public.usuario_login(text,text) to service_role;
