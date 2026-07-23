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

// GET: perfiles de maestros (grupos, alumnos, niveles, teléfono, cotización por nivel).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("MAESTRO_VER")) return noPerm();

  const { data: maestros, error } = await sb
    .from("usuarios")
    .select("id, nombre, correo, telefono, activo")
    .eq("rol_codigo", "maestro")
    .order("nombre", { ascending: true });
  if (error) return NextResponse.json({ error: "No se pudieron cargar los maestros." }, { status: 500 });

  const { data: grupos } = await sb.from("groups").select("id, codigo, nivel, horario, cupo, maestro_id").eq("activo", true);
  const { data: inscRows } = await sb.from("enrollments").select("grupo").eq("activo", true);
  const conteo = {};
  (inscRows || []).forEach((r) => { const g = (r.grupo || "").trim(); if (g) conteo[g] = (conteo[g] || 0) + 1; });

  const { data: cotis } = await sb.from("cotizaciones_maestro").select("maestro_id, nivel, monto");

  const niveles = Array.from(new Set((grupos || []).map((g) => g.nivel).filter(Boolean))).sort();

  const rows = (maestros || []).map((m) => {
    const gs = (grupos || [])
      .filter((g) => g.maestro_id === m.id)
      .map((g) => ({ id: g.id, codigo: g.codigo, nivel: g.nivel, horario: g.horario, cupo: g.cupo, inscritos: conteo[(g.codigo || "").trim()] || 0 }))
      .sort((x, y) => (x.codigo || "").localeCompare(y.codigo || ""));
    const alumnos = gs.reduce((s, g) => s + g.inscritos, 0);
    const nivelesM = Array.from(new Set(gs.map((g) => g.nivel).filter(Boolean))).sort();
    const cot = {};
    (cotis || []).filter((c) => c.maestro_id === m.id).forEach((c) => { cot[c.nivel] = Number(c.monto); });
    return { id: m.id, nombre: m.nombre, correo: m.correo, telefono: m.telefono || "", activo: m.activo, grupos: gs, alumnos, niveles: nivelesM, cotizaciones: cot };
  });

  return NextResponse.json({
    rows,
    niveles,
    puede_editar: a.permisos.includes("MAESTRO_CREAR"),
    puede_cotizar: a.permisos.includes("MAESTRO_COTIZACION"),
  });
}

// PATCH: actualiza teléfono y/o cotización por nivel. Body { id, telefono?, cotizaciones? }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  // Confirmar que es un maestro.
  const { data: m } = await sb.from("usuarios").select("id, rol_codigo").eq("id", id).maybeSingle();
  if (!m || m.rol_codigo !== "maestro") return NextResponse.json({ error: "El usuario no es un maestro." }, { status: 400 });

  // Teléfono.
  if ("telefono" in b) {
    if (!a.permisos.includes("MAESTRO_CREAR")) return noPerm();
    const tel = b.telefono == null ? null : String(b.telefono).trim() || null;
    const { error } = await sb.from("usuarios").update({ telefono: tel }).eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo guardar el teléfono." }, { status: 400 });
  }

  // Cotización por nivel: objeto { "1 y 2": 3000, ... }.
  if (b.cotizaciones && typeof b.cotizaciones === "object") {
    if (!a.permisos.includes("MAESTRO_COTIZACION")) return noPerm();
    const filas = [];
    for (const [nivel, montoRaw] of Object.entries(b.cotizaciones)) {
      const nv = String(nivel).trim();
      if (!nv) continue;
      const monto = Number(montoRaw);
      if (isNaN(monto) || monto < 0) return NextResponse.json({ error: `Monto no válido para el nivel ${nv}.` }, { status: 400 });
      filas.push({ maestro_id: id, nivel: nv, monto, updated_at: new Date().toISOString() });
    }
    if (filas.length > 0) {
      const { error } = await sb.from("cotizaciones_maestro").upsert(filas, { onConflict: "maestro_id,nivel" });
      if (error) return NextResponse.json({ error: "No se pudo guardar la cotización." }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
