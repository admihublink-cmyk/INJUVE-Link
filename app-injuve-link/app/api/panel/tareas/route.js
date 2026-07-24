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
const fechaOk = (f) => f == null || f === "" || /^\d{4}-\d{2}-\d{2}$/.test(f);
const limpiaFecha = (f) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null);

// Grupos que el actor puede tocar: ODP (PROGRAMA_CONFIG) ve todos; maestro solo los suyos.
async function gruposScope(sb, a) {
  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  let q = sb.from("groups").select("id, codigo, nivel, maestro_id").eq("activo", true);
  if (!esAdmin) q = q.eq("maestro_id", a.id);
  const { data } = await q.order("nivel", { ascending: true }).order("codigo", { ascending: true });
  return { esAdmin, grupos: data || [] };
}
async function grupoDueno(sb, a, group_id) {
  const { data: g } = await sb.from("groups").select("id, codigo, maestro_id").eq("id", group_id).maybeSingle();
  if (!g) return null;
  if (!a.permisos.includes("PROGRAMA_CONFIG") && g.maestro_id !== a.id) return null;
  return g;
}

// GET: grupos (según rol) + tareas/roster del grupo + entregas de una tarea. ?group=<id>&tarea=<id>
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("TAREA_CREAR") && !a.permisos.includes("TAREA_CALIFICAR")) return noPerm();

  const url = new URL(req.url);
  const group = (url.searchParams.get("group") || "").trim();
  const tarea = (url.searchParams.get("tarea") || "").trim();

  const { grupos } = await gruposScope(sb, a);
  const resp = {
    grupos: grupos.map((g) => ({ id: g.id, codigo: g.codigo, nivel: g.nivel })),
    puede_crear: a.permisos.includes("TAREA_CREAR"),
    puede_calificar: a.permisos.includes("TAREA_CALIFICAR"),
  };

  const g = grupos.find((x) => x.id === group);
  if (group && g) {
    resp.group = group;

    const { data: mod } = await sb.from("programa_modulos").select("id, nombre, orden").eq("group_id", group).order("orden", { ascending: true });
    resp.modulos = mod || [];

    const { data: tareas } = await sb.from("tareas")
      .select("id, titulo, descripcion, modulo_id, fecha_limite, created_at")
      .eq("group_id", group)
      .order("created_at", { ascending: false });
    const ids = (tareas || []).map((t) => t.id);
    const countMap = {};
    if (ids.length) {
      const { data: ents } = await sb.from("entregas_tarea").select("tarea_id").in("tarea_id", ids);
      (ents || []).forEach((e) => { countMap[e.tarea_id] = (countMap[e.tarea_id] || 0) + 1; });
    }
    resp.tareas = (tareas || []).map((t) => ({ ...t, entregas: countMap[t.id] || 0 }));

    const { data: al } = await sb.from("enrollments").select("id, nombre, folio").eq("grupo", g.codigo).eq("activo", true).order("nombre", { ascending: true });
    resp.alumnos = (al || []).map((x) => ({ enrollment_id: x.id, nombre: x.nombre, folio: x.folio }));

    if (tarea && ids.includes(tarea)) {
      const { data: ents } = await sb.from("entregas_tarea").select("enrollment_id, calificacion, comentario, entregado_at").eq("tarea_id", tarea);
      const map = {}; (ents || []).forEach((e) => { map[e.enrollment_id] = { entregada: true, calificacion: e.calificacion, comentario: e.comentario, entregado_at: e.entregado_at }; });
      resp.entregas = map; resp.tarea = tarea;
    }
  }

  return NextResponse.json(resp);
}

// POST: crea una tarea. Body { group_id, titulo, descripcion?, modulo_id?, fecha_limite? }.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("TAREA_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const group_id = String(b.group_id || "");
  const titulo = String(b.titulo || "").trim();
  if (!group_id) return NextResponse.json({ error: "Falta el grupo." }, { status: 400 });
  if (titulo.length < 2) return NextResponse.json({ error: "Escribe el título de la tarea." }, { status: 400 });
  if (!fechaOk(b.fecha_limite)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  const g = await grupoDueno(sb, a, group_id);
  if (!g) return noPerm();

  let modulo_id = b.modulo_id ? String(b.modulo_id) : null;
  if (modulo_id) {
    const { data: m } = await sb.from("programa_modulos").select("id, group_id").eq("id", modulo_id).maybeSingle();
    if (!m || m.group_id !== group_id) modulo_id = null;
  }

  const { error } = await sb.from("tareas").insert({
    group_id, titulo,
    descripcion: String(b.descripcion || "").trim() || null,
    modulo_id,
    fecha_limite: limpiaFecha(b.fecha_limite),
  });
  if (error) return NextResponse.json({ error: "No se pudo crear la tarea." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// PATCH: edita una tarea (body { id, ... }) o guarda entregas (body { tarea_id, group_id, registros }).
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }

  // ---- Guardar entregas de una tarea ----
  if (Array.isArray(b.registros)) {
    if (!a.permisos.includes("TAREA_CALIFICAR")) return noPerm();
    const tarea_id = String(b.tarea_id || "");
    const group_id = String(b.group_id || "");
    if (!tarea_id || !group_id) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    const g = await grupoDueno(sb, a, group_id);
    if (!g) return noPerm();
    const { data: t } = await sb.from("tareas").select("id, group_id").eq("id", tarea_id).maybeSingle();
    if (!t || t.group_id !== group_id) return NextResponse.json({ error: "La tarea no pertenece al grupo." }, { status: 400 });

    // Preserva el entregado_at existente.
    const { data: prev } = await sb.from("entregas_tarea").select("enrollment_id, entregado_at").eq("tarea_id", tarea_id);
    const prevAt = {}; (prev || []).forEach((e) => { prevAt[e.enrollment_id] = e.entregado_at; });

    const rows = [];
    for (const r of b.registros) {
      if (!r || !r.enrollment_id || !r.entregada) continue;
      let cal = null;
      const raw = r.calificacion;
      if (raw !== "" && raw != null) {
        cal = Number(raw);
        if (isNaN(cal) || cal < 0 || cal > 100) return NextResponse.json({ error: "Las calificaciones van de 0 a 100." }, { status: 400 });
      }
      rows.push({
        tarea_id, enrollment_id: String(r.enrollment_id),
        calificacion: cal, comentario: String(r.comentario || "").trim() || null,
        entregado_at: prevAt[r.enrollment_id] || new Date().toISOString(),
      });
    }

    await sb.from("entregas_tarea").delete().eq("tarea_id", tarea_id);
    if (rows.length) {
      const { error } = await sb.from("entregas_tarea").insert(rows);
      if (error) return NextResponse.json({ error: "No se pudieron guardar las entregas." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, entregadas: rows.length });
  }

  // ---- Editar la tarea ----
  if (!a.permisos.includes("TAREA_CREAR")) return noPerm();
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const { data: t } = await sb.from("tareas").select("id, group_id").eq("id", id).maybeSingle();
  if (!t) return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  const g = await grupoDueno(sb, a, t.group_id);
  if (!g) return noPerm();

  const patch = {};
  if ("titulo" in b) {
    const tt = String(b.titulo).trim();
    if (tt.length < 2) return NextResponse.json({ error: "Título no válido." }, { status: 400 });
    patch.titulo = tt;
  }
  if ("descripcion" in b) patch.descripcion = String(b.descripcion || "").trim() || null;
  if ("fecha_limite" in b) {
    if (!fechaOk(b.fecha_limite)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });
    patch.fecha_limite = limpiaFecha(b.fecha_limite);
  }
  if ("modulo_id" in b) {
    let mid = b.modulo_id ? String(b.modulo_id) : null;
    if (mid) {
      const { data: m } = await sb.from("programa_modulos").select("id, group_id").eq("id", mid).maybeSingle();
      if (!m || m.group_id !== t.group_id) mid = null;
    }
    patch.modulo_id = mid;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("tareas").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la tarea." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE: borra una tarea (y sus entregas). Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("TAREA_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const { data: t } = await sb.from("tareas").select("id, group_id").eq("id", id).maybeSingle();
  if (!t) return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  const g = await grupoDueno(sb, a, t.group_id);
  if (!g) return noPerm();

  await sb.from("entregas_tarea").delete().eq("tarea_id", id);
  const { error } = await sb.from("tareas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar la tarea." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
