-- INJUVE Link · Reinscripción de alumnos + control de acceso a plataforma

create table if not exists public.reenrollment_requests (
  id uuid primary key default gen_random_uuid(),
  curp text not null,
  whatsapp text not null,
  periodo text not null default 'JUL-2026',
  estado text not null default 'solicitada'
    check (estado in ('solicitada','liga_enviada','pagada','confirmada','rechazada')),
  confirmada_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola solicitud activa por CURP y periodo
create unique index if not exists reenrollment_curp_periodo
  on public.reenrollment_requests (curp, periodo)
  where estado in ('solicitada','liga_enviada','pagada');

-- Estado de acceso a la plataforma por alumno (lo controla el panel admin)
create table if not exists public.platform_access (
  id uuid primary key default gen_random_uuid(),
  curp text not null unique,
  activo boolean not null default true,
  motivo text,
  actualizado_por text,
  updated_at timestamptz not null default now()
);

alter table public.reenrollment_requests enable row level security;
alter table public.platform_access enable row level security;
-- Sin políticas: solo service_role (API del servidor y panel admin en Fase 2).
