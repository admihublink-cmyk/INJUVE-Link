-- INJUVE Link · v4: formulario mínimo, clave de alumno única, solo en línea

-- 1) Aflojar columnas que ya no se piden en el formulario
alter table public.enrollments
  alter column curp drop not null,
  alter column sexo drop not null,
  alter column municipio drop not null,
  alter column colonia drop not null,
  alter column tipo_alumno drop not null,
  alter column como_se_entero drop not null,
  alter column modalidad set default 'En línea';

-- La clave de alumno es el folio (INJL-26-0001): índice único por correo/whatsapp por periodo
create unique index if not exists enrollments_correo_periodo
  on public.enrollments (correo, periodo) where estado <> 'baja';
create unique index if not exists enrollments_whatsapp_periodo
  on public.enrollments (whatsapp, periodo) where estado <> 'baja';

-- 2) Campos de gestión del alumno (los usará el panel admin en Fase 2)
alter table public.enrollments
  add column if not exists activo boolean not null default true,
  add column if not exists grupo text,
  add column if not exists licencia_burlington_activada date,
  add column if not exists licencia_burlington_vence date;

-- 3) RPC v2: inscripción mínima
-- (si existe una versión previa sin p_sexo, eliminarla para evitar ambigüedad)
drop function if exists public.crear_inscripcion_v2(
  text, text, text, date, text, boolean, text, text, text, text, text
);

create or replace function public.crear_inscripcion_v2(
  p_nombre text, p_correo text, p_whatsapp text, p_fecha_nacimiento date,
  p_sexo text, p_examen_ubicacion text, p_es_menor boolean,
  p_tutor_nombre text, p_tutor_parentesco text, p_tutor_contacto text,
  p_aviso_version text, p_ip text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edad int;
  v_clave text;
  v_id uuid;
  v_periodo text := 'JUL-2026';
begin
  v_edad := date_part('year', age(p_fecha_nacimiento))::int;
  if v_edad < 15 or v_edad > 99 then
    raise exception 'edad fuera de rango';
  end if;

  if exists (
    select 1 from enrollments
    where (correo = p_correo or whatsapp = p_whatsapp)
      and periodo = v_periodo and estado <> 'baja'
  ) then
    raise exception 'inscripcion duplicada';
  end if;

  v_clave := 'INJL-' || to_char(now(), 'YY') || '-' ||
             lpad(nextval('folio_seq')::text, 4, '0');

  insert into enrollments (
    folio, periodo, nombre, fecha_nacimiento, edad, es_menor,
    whatsapp, correo, modalidad, examen_ubicacion, sexo,
    tutor_nombre, tutor_parentesco, tutor_contacto
  ) values (
    v_clave, v_periodo, p_nombre, p_fecha_nacimiento, v_edad, p_es_menor,
    p_whatsapp, p_correo, 'En línea', p_examen_ubicacion, p_sexo,
    p_tutor_nombre, p_tutor_parentesco, p_tutor_contacto
  ) returning id into v_id;

  insert into consents (enrollment_id, aviso_version, otorgado_por, ip)
  values (v_id, p_aviso_version, case when p_es_menor then 'tutor' else 'titular' end, p_ip);

  return json_build_object('clave', v_clave);
end;
$$;

revoke all on function public.crear_inscripcion_v2(
  text, text, text, date, text, text, boolean, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.crear_inscripcion_v2(
  text, text, text, date, text, text, boolean, text, text, text, text, text
) to service_role;

-- 4) Reinscripción ahora es por clave de alumno
alter table public.reenrollment_requests
  add column if not exists clave_alumno text,
  alter column curp drop not null;

create unique index if not exists reenrollment_clave_periodo
  on public.reenrollment_requests (clave_alumno, periodo)
  where estado in ('solicitada','liga_enviada','pagada');
