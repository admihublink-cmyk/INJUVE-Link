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

// GET: grupos + módulos del programa del grupo seleccionado. ?group=<id>
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PROGRAMA_VER")) return noPerm();

  const url = new URL(req.url);
  const group = (url.searchParams.get("group") || "").trim();

  const { data: grupos } = await sb.from("groups")
    .select("id, codigo, nivel")
    .eq("activo", true)
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });

  let modulos = [];
  if (group) {
    const { data: m } = await sb.from("programa_modulos")
      .select("id, group_id, nombre, orden, temas, fecha_inicio, fecha_fin")
      .eq("group_id", group)
      .order("orden", { ascending: true });
    modulos = m || [];
  }

  return NextResponse.json({
    grupos: grupos || [],
    modulos,
    group: group || null,
    puede_config: a.permisos.includes("PROGRAMA_CONFIG"),
  });
}

// POST: crea un módulo del programa. Body { group_id, nombre, orden?, temas?, fecha_inicio?, fecha_fin? }.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PROGRAMA_CONFIG")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const group_id = String(b.group_id || "");
  const nombre = String(b.nombre || "").trim();
  if (!group_id) return NextResponse.json({ error: "Falta el grupo." }, { status: 400 });
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe el nombre del módulo." }, { status: 400 });
  if (!fechaOk(b.fecha_inicio) || !fechaOk(b.fecha_fin)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });

  const orden = b.orden != null && b.orden !== "" ? parseInt(b.orden, 10) : 0;
  const { error } = await sb.from("programa_modulos").insert({
    group_id, nombre,
    orden: isNaN(orden) ? 0 : orden,
    temas: String(b.temas || "").trim() || null,
    fecha_inicio: limpiaFecha(b.fecha_inicio),
    fecha_fin: limpiaFecha(b.fecha_fin),
  });
  if (error) return NextResponse.json({ error: "No se pudo crear el módulo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// PATCH: edita un módulo. Body { id, ... }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PROGRAMA_CONFIG")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const patch = {};
  if ("nombre" in b) {
    const n = String(b.nombre).trim();
    if (n.length < 2) return NextResponse.json({ error: "Nombre no válido." }, { status: 400 });
    patch.nombre = n;
  }
  if ("orden" in b) { const o = parseInt(b.orden, 10); patch.orden = isNaN(o) ? 0 : o; }
  if ("temas" in b) patch.temas = String(b.temas || "").trim() || null;
  if ("fecha_inicio" in b) { if (!fechaOk(b.fecha_inicio)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 }); patch.fecha_inicio = limpiaFecha(b.fecha_inicio); }
  if ("fecha_fin" in b) { if (!fechaOk(b.fecha_fin)) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 }); patch.fecha_fin = limpiaFecha(b.fecha_fin); }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("programa_modulos").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE: borra un módulo. Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PROGRAMA_CONFIG")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { error } = await sb.from("programa_modulos").delete().eq("id", id);
  if (error) {
    const fk = /foreign key|violates|referenced/i.test(error.message || "");
    return NextResponse.json({ error: fk ? "No se puede borrar: el módulo tiene calificaciones o tareas asociadas." : "No se pudo borrar." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
