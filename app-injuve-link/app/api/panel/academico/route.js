import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data: u } = await sb.from("usuarios").select("id, rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return null;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return { id: u.id, rol: u.rol_codigo, permisos: (perms || []).map((p) => p.permiso_codigo) };
}

const mant = () => NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
const noAuth = () => NextResponse.json({ error: "No autenticado." }, { status: 401 });
const noPerm = () => NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });

// Grupos que el actor puede tocar: ODP (PROGRAMA_CONFIG) ve todos; maestro solo los suyos.
async function gruposScope(sb, a) {
  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  let q = sb.from("groups").select("id, codigo, nivel, maestro_id").eq("activo", true);
  if (!esAdmin) q = q.eq("maestro_id", a.id);
  const { data } = await q.order("nivel", { ascending: true }).order("codigo", { ascending: true });
  return { esAdmin, grupos: data || [] };
}

// GET: grupos (según rol) + roster/sesiones/módulos del grupo + registros existentes.
// ?group=<id>&sesion=<id>&modulo=<id>
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("ASIST_VER") && !a.permisos.includes("CALIF_VER")) return noPerm();

  const url = new URL(req.url);
  const group = (url.searchParams.get("group") || "").trim();
  const sesion = (url.searchParams.get("sesion") || "").trim();
  const modulo = (url.searchParams.get("modulo") || "").trim();

  const { esAdmin, grupos } = await gruposScope(sb, a);
  const resp = {
    grupos: grupos.map((g) => ({ id: g.id, codigo: g.codigo, nivel: g.nivel })),
    puede_asist: a.permisos.includes("ASIST_REGISTRAR"),
    puede_calif: a.permisos.includes("CALIF_REGISTRAR"),
  };

  const g = grupos.find((x) => x.id === group);
  if (group && g) {
    resp.group = group;

    const { data: al } = await sb.from("enrollments")
      .select("id, nombre, folio")
      .eq("grupo", g.codigo).eq("activo", true)
      .order("nombre", { ascending: true });
    resp.alumnos = (al || []).map((x) => ({ enrollment_id: x.id, nombre: x.nombre, folio: x.folio }));

    const { data: ses } = await sb.from("sesiones_clase")
      .select("id, fecha, hora, estado")
      .eq("group_id", group)
      .order("fecha", { ascending: true });
    resp.sesiones = ses || [];

    const { data: mod } = await sb.from("programa_modulos")
      .select("id, nombre, orden")
      .eq("group_id", group)
      .order("orden", { ascending: true });
    resp.modulos = mod || [];

    if (sesion) {
      const { data: asi } = await sb.from("asistencia").select("enrollment_id, presente").eq("sesion_id", sesion);
      const map = {}; (asi || []).forEach((r) => { map[r.enrollment_id] = r.presente; });
      resp.asistencia = map; resp.sesion = sesion;
    }
    if (modulo) {
      const { data: cal } = await sb.from("calificaciones").select("enrollment_id, calificacion, comentario").eq("modulo_id", modulo);
      const map = {}; (cal || []).forEach((r) => { map[r.enrollment_id] = { calificacion: r.calificacion, comentario: r.comentario }; });
      resp.calificaciones = map; resp.modulo = modulo;
    }
  }

  return NextResponse.json(resp);
}

// Verifica que el actor sea dueño del grupo (o admin). Devuelve el grupo o null.
async function grupoDueno(sb, a, group_id) {
  const { data: g } = await sb.from("groups").select("id, codigo, maestro_id").eq("id", group_id).maybeSingle();
  if (!g) return null;
  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  if (!esAdmin && g.maestro_id !== a.id) return null;
  return g;
}

// POST: guarda la asistencia de una sesión. Body { group_id, sesion_id, registros:[{enrollment_id, presente}] }.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("ASIST_REGISTRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const group_id = String(b.group_id || "");
  const sesion_id = String(b.sesion_id || "");
  if (!group_id || !sesion_id) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  const g = await grupoDueno(sb, a, group_id);
  if (!g) return noPerm();

  // La sesión debe pertenecer al grupo.
  const { data: ses } = await sb.from("sesiones_clase").select("id, group_id").eq("id", sesion_id).maybeSingle();
  if (!ses || ses.group_id !== group_id) return NextResponse.json({ error: "La sesión no pertenece al grupo." }, { status: 400 });

  const registros = Array.isArray(b.registros) ? b.registros : [];
  const rows = registros
    .filter((r) => r && r.enrollment_id)
    .map((r) => ({ sesion_id, enrollment_id: String(r.enrollment_id), presente: !!r.presente }));

  await sb.from("asistencia").delete().eq("sesion_id", sesion_id);
  if (rows.length) {
    const { error } = await sb.from("asistencia").insert(rows);
    if (error) return NextResponse.json({ error: "No se pudo guardar la asistencia." }, { status: 400 });
  }
  const presentes = rows.filter((r) => r.presente).length;
  return NextResponse.json({ ok: true, presentes, total: rows.length });
}

// PATCH: guarda calificaciones de un módulo. Body { group_id, modulo_id, registros:[{enrollment_id, calificacion, comentario}] }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("CALIF_REGISTRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const group_id = String(b.group_id || "");
  const modulo_id = String(b.modulo_id || "");
  if (!group_id || !modulo_id) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  const g = await grupoDueno(sb, a, group_id);
  if (!g) return noPerm();

  // El módulo debe pertenecer al grupo.
  const { data: mod } = await sb.from("programa_modulos").select("id, group_id").eq("id", modulo_id).maybeSingle();
  if (!mod || mod.group_id !== group_id) return NextResponse.json({ error: "El módulo no pertenece al grupo." }, { status: 400 });

  const registros = Array.isArray(b.registros) ? b.registros : [];
  const ids = registros.map((r) => r && r.enrollment_id).filter(Boolean).map(String);

  const rows = [];
  for (const r of registros) {
    if (!r || !r.enrollment_id) continue;
    const raw = r.calificacion;
    if (raw === "" || raw == null) continue;
    const val = Number(raw);
    if (isNaN(val) || val < 0 || val > 100) return NextResponse.json({ error: "Las calificaciones van de 0 a 100." }, { status: 400 });
    rows.push({ enrollment_id: String(r.enrollment_id), modulo_id, calificacion: val, comentario: String(r.comentario || "").trim() || null });
  }

  if (ids.length) await sb.from("calificaciones").delete().eq("modulo_id", modulo_id).in("enrollment_id", ids);
  if (rows.length) {
    const { error } = await sb.from("calificaciones").insert(rows);
    if (error) return NextResponse.json({ error: "No se pudieron guardar las calificaciones." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, guardadas: rows.length });
}
