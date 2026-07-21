-- INJUVE Link · Fase 1: inscripciones + consentimientos
-- Las tablas quedan cerradas con RLS; solo el service_role (API del servidor) escribe.

create extension if not exists pgcrypto;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  periodo text not null default 'JUL-2026',
  nombre text not null,
  curp text not null,
  fecha_nacimiento date not null,
  edad int not null,
  es_menor boolean not null default false,
  sexo text not null,
  whatsapp text not null,
  correo text not null,
  municipio text not null,
  colonia text not null,
  modalidad text not null,
  tipo_alumno text not null,
  examen_ubicacion text not null,
  como_se_entero text not null,
  tutor_nombre text,
  tutor_parentesco text,
  tutor_contacto text,
  estado text not null default 'nueva'
    check (estado in ('nueva','validada','liga_enviada','pagada','asignada','baja')),
  sync_sheets boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists enrollments_curp_periodo
  on public.enrollments (curp, periodo) where estado <> 'baja';

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  aviso_version text not null,
  otorgado_por text not null default 'titular', -- titular | tutor
  ip text,
  created_at timestamptz not null default now()
);

alter table public.enrollments enable row level security;
alter table public.consents enable row level security;
-- Sin políticas: nadie con anon/authenticated puede leer ni escribir. Solo service_role.

create or replace function public.crear_inscripcion(
  p_nombre text, p_curp text, p_fecha_nacimiento date, p_sexo text,
  p_whatsapp text, p_correo text, p_municipio text, p_colonia text,
  p_modalidad text, p_tipo_alumno text, p_examen_ubicacion text, p_como_se_entero text,
  p_es_menor boolean, p_tutor_nombre text, p_tutor_parentesco text, p_tutor_contacto text,
  p_aviso_version text, p_ip text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edad int;
  v_folio text;
  v_id uuid;
  v_periodo text := 'JUL-2026';
begin
  v_edad := date_part('year', age(p_fecha_nacimiento))::int;
  if v_edad < 12 or v_edad > 99 then
    raise exception 'edad fuera de rango';
  end if;

  if exists (
    select 1 from enrollments
    where curp = p_curp and periodo = v_periodo and estado <> 'baja'
  ) then
    raise exception 'inscripcion duplicada';
  end if;

  v_folio := 'INJL-' || to_char(now(), 'YY') || '-' ||
             lpad(nextval('folio_seq')::text, 4, '0');

  insert into enrollments (
    folio, periodo, nombre, curp, fecha_nacimiento, edad, es_menor, sexo,
    whatsapp, correo, municipio, colonia, modalidad, tipo_alumno,
    examen_ubicacion, como_se_entero, tutor_nombre, tutor_parentesco, tutor_contacto
  ) values (
    v_folio, v_periodo, p_nombre, p_curp, p_fecha_nacimiento, v_edad, p_es_menor, p_sexo,
    p_whatsapp, p_correo, p_municipio, p_colonia, p_modalidad, p_tipo_alumno,
    p_examen_ubicacion, p_como_se_entero, p_tutor_nombre, p_tutor_parentesco, p_tutor_contacto
  ) returning id into v_id;

  insert into consents (enrollment_id, aviso_version, otorgado_por, ip)
  values (v_id, p_aviso_version, case when p_es_menor then 'tutor' else 'titular' end, p_ip);

  return json_build_object('folio', v_folio);
end;
$$;

create sequence if not exists public.folio_seq start 1;

revoke all on function public.crear_inscripcion from public, anon, authenticated;
