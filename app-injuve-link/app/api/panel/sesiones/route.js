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

const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
const fmt = (d) => d.toISOString().slice(0, 10);
function rangoPeriodo(periodo) {
  const m = String(periodo || "").toUpperCase().match(/^([A-Z]{3})-?(\d{4})$/);
  if (!m) return null;
  const mes = MESES[m[1]];
  const anio = parseInt(m[2], 10);
  if (!mes || !anio) return null;
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 0)); // último día del mes
  return { anio, mes, inicio, fin };
}

// GET: sesiones del maestro (o del que consulta) en un periodo. ?periodo=JUL-2026
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("SESION_VER")) return noPerm();

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "JUL-2026").trim();
  const rango = rangoPeriodo(periodo);
  const puedeGenerar = a.permisos.includes("PROGRAMA_CONFIG");

  let q = sb.from("sesiones_clase")
    .select("id, group_id, maestro_id, fecha, hora, duracion_horas, estado, impartida_at, link_meet, tema")
    .eq("maestro_id", a.id)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });
  if (rango) q = q.gte("fecha", fmt(rango.inicio)).lte("fecha", fmt(rango.fin));
  const { data: ses, error } = await q;
  if (error) return NextResponse.json({ error: "No se pudieron cargar las clases." }, { status: 500 });

  const { data: groups } = await sb.from("groups").select("id, codigo, nivel, liga_meet");
  const gMap = {}; (groups || []).forEach((g) => { gMap[g.id] = g; });

  const rows = (ses || []).map((s) => ({
    ...s,
    grupo: gMap[s.group_id]?.codigo || "—",
    nivel: gMap[s.group_id]?.nivel || "—",
    link_meet: s.link_meet || gMap[s.group_id]?.liga_meet || null,
  }));

  // Total de sesiones del periodo (para administración).
  let total_periodo = null;
  if (puedeGenerar && rango) {
    const { count } = await sb.from("sesiones_clase").select("*", { count: "exact", head: true }).gte("fecha", fmt(rango.inicio)).lte("fecha", fmt(rango.fin));
    total_periodo = count || 0;
  }

  const { data: gper } = await sb.from("groups").select("periodo");
  const periodos = Array.from(new Set([...(gper || []).map((p) => p.periodo).filter(Boolean), periodo]));

  return NextResponse.json({ rows, periodo, periodos, puede_generar: puedeGenerar, total_periodo });
}

// POST: genera las sesiones del periodo desde el horario semanal de cada grupo (solo admin).
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PROGRAMA_CONFIG")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const periodo = String(b.periodo || "JUL-2026").trim();
  const rango = rangoPeriodo(periodo);
  if (!rango) return NextResponse.json({ error: "Periodo no válido (usa formato JUL-2026)." }, { status: 400 });
  const { anio, mes, fin } = rango;

  const { data: grupos } = await sb.from("groups")
    .select("id, maestro_id, dias, hora_inicio, duracion_horas, liga_meet")
    .eq("activo", true)
    .not("dias", "is", null)
    .not("maestro_id", "is", null);

  const { data: existentes } = await sb.from("sesiones_clase")
    .select("group_id, fecha")
    .gte("fecha", fmt(rango.inicio)).lte("fecha", fmt(rango.fin));
  const yaSet = new Set((existentes || []).map((s) => s.group_id + "|" + s.fecha));

  const nuevos = [];
  for (const g of (grupos || [])) {
    if (!g.duracion_horas) continue;
    const dias = String(g.dias).split(",").map((x) => x.trim()).filter(Boolean);
    if (!dias.length) continue;
    for (let d = 1; d <= fin.getUTCDate(); d++) {
      const fecha = new Date(Date.UTC(anio, mes - 1, d));
      const iso = fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay();
      if (!dias.includes(String(iso))) continue;
      const fstr = fmt(fecha);
      if (yaSet.has(g.id + "|" + fstr)) continue;
      nuevos.push({
        group_id: g.id, maestro_id: g.maestro_id, fecha: fstr,
        hora: g.hora_inicio, duracion_horas: g.duracion_horas,
        estado: "programada", link_meet: g.liga_meet || null,
      });
    }
  }

  if (nuevos.length > 0) {
    const { error } = await sb.from("sesiones_clase").insert(nuevos);
    if (error) return NextResponse.json({ error: "No se pudieron generar las sesiones." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, creados: nuevos.length });
}

// PATCH: tomar asistencia (impartida) o deshacer (programada). Body { id, estado }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("ASIST_REGISTRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { data: ses } = await sb.from("sesiones_clase").select("id, maestro_id").eq("id", id).maybeSingle();
  if (!ses) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
  // El maestro solo puede sobre sus propias clases (admin con PROGRAMA_CONFIG puede sobre cualquiera).
  if (ses.maestro_id !== a.id && !a.permisos.includes("PROGRAMA_CONFIG")) return noPerm();

  const estado = String(b.estado || "").trim();
  if (!["impartida", "programada"].includes(estado)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });

  const patch = { estado, impartida_at: estado === "impartida" ? new Date().toISOString() : null };
  const { error } = await sb.from("sesiones_clase").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo registrar la asistencia." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
