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
const ligaOk = (l) => /^https?:\/\//i.test(l);

// Vincula el nombre de maestro a la cuenta de usuario (maestro_id) si coincide.
async function buscarMaestroId(sb, nombre) {
  if (!nombre) return null;
  const { data } = await sb.from("usuarios").select("id").eq("rol_codigo", "maestro").eq("activo", true).ilike("nombre", nombre).limit(1);
  return data && data[0] ? data[0].id : null;
}

// GET: lista de grupos (activos e inactivos) con inscritos.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_VER")) return noPerm();

  const { data: grupos, error } = await sb
    .from("groups")
    .select("id, codigo, periodo, nivel, maestro, maestro_id, horario, cupo, liga_meet, activo")
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });
  if (error) return NextResponse.json({ error: "No se pudieron cargar los grupos." }, { status: 500 });

  // Inscritos por grupo (alumnos activos).
  const { data: inscRows } = await sb.from("enrollments").select("grupo").eq("activo", true);
  const conteo = {};
  (inscRows || []).forEach((r) => { const g = (r.grupo || "").trim(); if (g) conteo[g] = (conteo[g] || 0) + 1; });

  const rows = (grupos || []).map((g) => ({ ...g, inscritos: conteo[(g.codigo || "").trim()] || 0 }));

  const { data: maestrosUsers } = await sb.from("usuarios").select("nombre").eq("rol_codigo", "maestro").eq("activo", true).order("nombre");
  const { data: periodos } = await sb.from("groups").select("periodo");

  return NextResponse.json({
    rows,
    maestros: (maestrosUsers || []).map((m) => m.nombre),
    periodos: Array.from(new Set((periodos || []).map((p) => p.periodo))),
    puede_editar: a.permisos.includes("GRUPO_CREAR"),
    puede_maestro: a.permisos.includes("GRUPO_ASIGNAR_MAESTRO"),
    puede_activar: a.permisos.includes("GRUPO_ACTIVAR"),
    puede_crear: a.permisos.includes("GRUPO_CREAR"),
    puede_borrar: a.permisos.includes("GRUPO_BORRAR"),
  });
}

// POST: crea un grupo nuevo.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const codigo = String(b.codigo || "").trim();
  const periodo = String(b.periodo || "JUL-2026").trim();
  const nivel = String(b.nivel || "").trim();
  const maestro = String(b.maestro || "").trim();
  const horario = String(b.horario || "").trim();
  const cupo = parseInt(b.cupo, 10);
  const liga_meet = String(b.liga_meet || "").trim();
  if (codigo.length < 1) return NextResponse.json({ error: "El código es obligatorio." }, { status: 400 });
  if (isNaN(cupo) || cupo < 0) return NextResponse.json({ error: "El cupo debe ser un número válido." }, { status: 400 });
  if (liga_meet && !ligaOk(liga_meet)) return NextResponse.json({ error: "La liga debe empezar con http:// o https://" }, { status: 400 });

  const maestro_id = await buscarMaestroId(sb, maestro);
  const { data, error } = await sb.from("groups").insert({
    codigo, periodo, nivel: nivel || null, maestro: maestro || null, maestro_id,
    horario: horario || null, cupo, liga_meet: liga_meet || null, activo: true,
  }).select("id").maybeSingle();
  if (error) {
    const dup = /duplicate|unique/i.test(error.message || "");
    return NextResponse.json({ error: dup ? "Ya existe un grupo con ese código." : "No se pudo crear el grupo." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}

// PATCH: edita datos, asigna maestro o activa/desactiva. Body { id, ... }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const perms = a.permisos;
  const patch = {};

  if ("maestro" in b) {
    if (!perms.includes("GRUPO_ASIGNAR_MAESTRO")) return noPerm();
    const m = b.maestro == null ? "" : String(b.maestro).trim();
    patch.maestro = m || null;
    patch.maestro_id = await buscarMaestroId(sb, m);
  }
  if ("activo" in b) {
    if (!perms.includes("GRUPO_ACTIVAR")) return noPerm();
    patch.activo = !!b.activo;
  }
  // Datos de configuración (nivel, horario, cupo, liga_meet) -> GRUPO_CREAR.
  const cfg = ["nivel", "horario", "cupo", "liga_meet"].some((k) => k in b);
  if (cfg) {
    if (!perms.includes("GRUPO_CREAR")) return noPerm();
    if ("nivel" in b) patch.nivel = b.nivel == null ? null : String(b.nivel).trim() || null;
    if ("horario" in b) patch.horario = b.horario == null ? null : String(b.horario).trim() || null;
    if ("cupo" in b) {
      const n = parseInt(b.cupo, 10);
      if (isNaN(n) || n < 0) return NextResponse.json({ error: "El cupo debe ser un número válido." }, { status: 400 });
      patch.cupo = n;
    }
    if ("liga_meet" in b) {
      const l = b.liga_meet == null ? "" : String(b.liga_meet).trim();
      if (l && !ligaOk(l)) return NextResponse.json({ error: "La liga debe empezar con http:// o https://" }, { status: 400 });
      patch.liga_meet = l || null;
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("groups").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el grupo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE: borra un grupo si no tiene alumnos ni dependencias. Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_BORRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { data: g } = await sb.from("groups").select("codigo").eq("id", id).maybeSingle();
  if (g) {
    const { count } = await sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true).eq("grupo", g.codigo);
    if ((count || 0) > 0) {
      return NextResponse.json({ error: `No se puede borrar: el grupo tiene ${count} alumno(s) asignado(s). Reasígnalos o desactiva el grupo.` }, { status: 400 });
    }
  }

  const { error } = await sb.from("groups").delete().eq("id", id);
  if (error) {
    const fk = /foreign key|violates|referenced/i.test(error.message || "");
    return NextResponse.json({ error: fk ? "No se puede borrar: el grupo tiene registros asociados. Desactívalo en su lugar." : "No se pudo borrar." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
