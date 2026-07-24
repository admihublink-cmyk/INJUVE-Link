import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";
import { driveConectado, driveConfigurado } from "../../../lib/drive";

async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data: u } = await sb.from("usuarios").select("id, rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return null;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return { permisos: (perms || []).map((p) => p.permiso_codigo) };
}

// GET: métricas del dashboard + lista de grupos (conteos en vivo).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 }); }

  const a = await actor(sb, req);
  if (!a) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!a.permisos.includes("DASHBOARD_VER")) return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });

  const contar = async (fn) => {
    try { const { count } = await fn(); return count || 0; } catch { return 0; }
  };

  const alumnos = await contar(() => sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true));
  const grupos = await contar(() => sb.from("groups").select("*", { count: "exact", head: true }).eq("activo", true));
  const maestros = await contar(() => sb.from("usuarios").select("*", { count: "exact", head: true }).eq("rol_codigo", "maestro").eq("activo", true));
  const casos = await contar(() => sb.from("casos_atencion").select("*", { count: "exact", head: true }).neq("estado", "resuelto"));

  // Lista de grupos activos + inscritos por grupo.
  const { data: gruposData } = await sb
    .from("groups")
    .select("id, codigo, nivel, maestro, horario, cupo, liga_meet, dias, hora_inicio, duracion_horas")
    .eq("activo", true)
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });

  const { data: inscRows } = await sb.from("enrollments").select("grupo").eq("activo", true);
  const conteo = {};
  let en_grupo = 0;
  (inscRows || []).forEach((r) => {
    const g = (r.grupo || "").trim();
    if (g) { conteo[g] = (conteo[g] || 0) + 1; en_grupo += 1; }
  });

  // Horario por clase de cada grupo (tabla grupo_horario).
  const { data: slots } = await sb.from("grupo_horario").select("group_id, dia, hora_inicio, duracion_horas, orden").order("orden", { ascending: true });
  const slotsByGroup = {};
  (slots || []).forEach((s) => { (slotsByGroup[s.group_id] = slotsByGroup[s.group_id] || []).push({ dia: s.dia, hora_inicio: s.hora_inicio, duracion_horas: s.duracion_horas }); });

  const grupos_lista = (gruposData || []).map((g) => ({ ...g, inscritos: conteo[(g.codigo || "").trim()] || 0, horario_slots: slotsByGroup[g.id] || [] }));

  // Agenda de próximas clases (7 días) desde el horario por clase. Hoy en hora de Nuevo León (UTC-6).
  const hoyMx = new Date(Date.now() - 6 * 3600 * 1000);
  const base = Date.UTC(hoyMx.getUTCFullYear(), hoyMx.getUTCMonth(), hoyMx.getUTCDate());
  const proximas = [];
  (gruposData || []).forEach((g) => {
    (slotsByGroup[g.id] || []).forEach((s) => {
      for (let o = 0; o < 7; o++) {
        const dt = new Date(base + o * 86400000);
        const iso = dt.getUTCDay() === 0 ? 7 : dt.getUTCDay();
        if (iso === s.dia) {
          proximas.push({ codigo: g.codigo, nivel: g.nivel, maestro: g.maestro, liga_meet: g.liga_meet, fecha: dt.toISOString().slice(0, 10), hora: s.hora_inicio });
          break;
        }
      }
    });
  });
  proximas.sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));

  const drive_conectado = await driveConectado(sb);
  let drive_email = null;
  if (drive_conectado) {
    const { data: dc } = await sb.from("app_config").select("valor").eq("clave", "google_drive_email").maybeSingle();
    drive_email = dc?.valor || null;
  }

  return NextResponse.json({
    alumnos,
    grupos,
    maestros,
    casos,
    en_grupo,
    sin_grupo: Math.max(alumnos - en_grupo, 0),
    grupos_lista,
    proximas: proximas.slice(0, 20),
    drive_conectado,
    drive_configurado: driveConfigurado(),
    drive_email,
    puede_drive: a.permisos.includes("PROGRAMA_CONFIG"),
  });
}
