-- INJUVE Link · Fase 3: portal del alumno
-- Login del alumno por clave (folio) + WhatsApp; las clases son por Google Meet.

-- Las clases en vivo son por Google Meet: liga por grupo.
alter table public.groups
  add column if not exists liga_meet text;

-- Si el grupo ya tenía una liga (antes 'liga_zoom'), la conservamos en liga_meet.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name = 'liga_zoom'
  ) then
    update public.groups
      set liga_meet = coalesce(liga_meet, liga_zoom)
      where liga_zoom is not null;
  end if;
end $$;

-- El login del alumno busca por folio (clave) + whatsapp. folio ya es unique;
-- este índice acelera la búsqueda combinada.
create index if not exists enrollments_folio_whatsapp_idx
  on public.enrollments (folio, whatsapp);

-- Nota: 'enrollments' y 'groups' siguen con RLS cerrado; solo service_role
-- (las rutas /api/alumno/* del servidor) leen estos datos tras validar la sesión.
