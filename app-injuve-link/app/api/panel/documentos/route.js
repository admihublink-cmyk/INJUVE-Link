import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";
import { uploadFile, deleteFile } from "../../../lib/drive";

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
const MAX_B64 = 4600000; // ~3.4 MB de archivo

// GET: documentos (maestro = los suyos; admin = todos).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("EVIDENCIA_SUBIR")) return noPerm();

  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  let q = sb.from("documentos").select("id, maestro_id, periodo, nombre, drive_link, created_at").order("created_at", { ascending: false });
  if (!esAdmin) q = q.eq("maestro_id", a.id);
  const { data: docs } = await q;

  const { data: maestros } = await sb.from("usuarios").select("id, nombre").eq("rol_codigo", "maestro").eq("activo", true).order("nombre");
  const mMap = {}; (maestros || []).forEach((m) => { mMap[m.id] = m.nombre; });
  const rows = (docs || []).map((d) => ({ ...d, maestro: mMap[d.maestro_id] || "—" }));

  const periodos = Array.from(new Set([...(docs || []).map((d) => d.periodo).filter(Boolean), "JUL-2026", "AGO-2026", "SEP-2026"]));

  return NextResponse.json({
    rows,
    es_admin: esAdmin,
    puede_subir: a.permisos.includes("EVIDENCIA_SUBIR"),
    maestros: esAdmin ? (maestros || []).map((m) => ({ id: m.id, nombre: m.nombre })) : [],
    periodos,
  });
}

// POST: sube un documento a Drive y lo registra. Body { nombre, mime, data(base64), periodo, maestro_id? }.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("EVIDENCIA_SUBIR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const nombre = String(b.nombre || "").trim();
  const data = String(b.data || "");
  if (!nombre) return NextResponse.json({ error: "Falta el nombre del archivo." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  if (data.length > MAX_B64) return NextResponse.json({ error: "El archivo es muy grande (máx. ~3 MB)." }, { status: 400 });

  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  const maestro_id = esAdmin ? (b.maestro_id ? String(b.maestro_id) : null) : a.id;

  const up = await uploadFile(sb, { name: nombre, mimeType: b.mime || "application/octet-stream", dataB64: data });
  if (up.error) return NextResponse.json({ error: up.error }, { status: 400 });

  const { error } = await sb.from("documentos").insert({
    maestro_id, subido_por: a.id,
    periodo: String(b.periodo || "").trim() || null,
    nombre, drive_id: up.id, drive_link: up.link,
  });
  if (error) {
    await deleteFile(sb, up.id);
    return NextResponse.json({ error: "No se pudo registrar el documento." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, link: up.link });
}

// DELETE: borra un documento (de Drive y de la base). Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("EVIDENCIA_SUBIR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { data: doc } = await sb.from("documentos").select("id, maestro_id, subido_por, drive_id").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  const esAdmin = a.permisos.includes("PROGRAMA_CONFIG");
  if (!esAdmin && doc.maestro_id !== a.id && doc.subido_por !== a.id) return noPerm();

  await deleteFile(sb, doc.drive_id);
  const { error } = await sb.from("documentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
