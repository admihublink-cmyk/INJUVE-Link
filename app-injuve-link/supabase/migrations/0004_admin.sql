-- INJUVE Link · Fase 2: panel de administración

-- Catálogo de grupos
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  periodo text not null default 'JUL-2026',
  maestro text,
  nivel text,
  horario text,
  liga_zoom text,
  cupo int not null default 25,
  created_at timestamptz not null default now()
);

-- Credenciales Burlington por alumno
alter table public.enrollments
  add column if not exists burlington_usuario text,
  add column if not exists burlington_password text,
  add column if not exists notas_admin text;

alter table public.groups enable row level security;
-- Sin políticas: solo service_role (las rutas /api/admin usan service_role).
