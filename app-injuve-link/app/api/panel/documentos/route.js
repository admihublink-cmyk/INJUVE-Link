import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";
import { uploadFile, deleteFile } from "../../../lib/drive";
import { periodosDisponibles } from "../../../lib/periodos";

// actor() y respuestas (mant/noAuth/noPerm) viven en lib/panelAuth.js.
const MAX_B64 = 4600000; // ~3.4 MB de archivo

// —— Definición del checklist ——
const BASICOS = [
  { tipo: "ine", label: "INE (identificación)" },
  { tipo: "curriculum", label: "Currículum (CV)" },
  { tipo: "cuenta", label: "Comprobante de cuenta bancaria (CLABE)" },
  { tipo: "rfc", label: "Constancia de Situación Fiscal (RFC)" },
  { tipo: "titulo", label: "Título o certificado" },
  { tipo: "curp", label: "CURP" },
  { tipo: "domicilio", label: "Comprobante de domicilio" },
];
const HONORARIOS = [
  { tipo: "evidencias", label: "Evidencias (links de videos en Drive)", es_link: true },
  { tipo: "ficha", label: "Ficha de honorarios" },
  { tipo: "cotizacion", label: "Cotización" },
  { tipo: "asistencia", label: "Lista de asistencia" },
  { tipo: "factura", label: "Factura (PDF)", gated: true },
  { tipo: "xml", label: "XML de la factura", gated: true },
];
const PREREQS = ["evidencias", "ficha", "cotizacion", "asistencia"];
const BASICO_TIPOS = BASICOS.map((b) => b.tipo);
const HON_TIPOS = HONORARIOS.map((h) => h.tipo);
const MES_ABBR = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const puedeValidar = (a) => a.permisos.includes("MAESTRO_DOC_VALIDAR") || a.permisos.includes("PAGOM_VALIDAR");
const puedeSubirBasico = (a) => a.permisos.includes("MAESTRO_DOC_SUBIR");
const puedeSubirHon = (a) => a.permisos.includes("PAGOM_DOC_SUBIR");

function defaultPeriodo() {
  const d = new Date();
  return MES_ABBR[d.getUTCMonth()] + "-" + d.getUTCFullYear();
}
// periodosDisponibles ahora vive en lib/periodos.js (una sola fuente).

function mergeSlots(defs, rows) {
  const byTipo = {};
  (rows || []).forEach((r) => { byTipo[r.tipo] = r; });
  return defs.map((d) => {
    const r = byTipo[d.tipo];
    return {
      tipo: d.tipo, label: d.label, es_link: !!d.es_link, gated: !!d.gated,
      estado: r ? r.estado : "pendiente", // pendiente | subido | aprobado | rechazado
      id: r ? r.id : null,
      nombre: r ? r.nombre : null,
      link: r ? r.drive_link : null,
      enlace: r ? r.enlace : null,
      nota: r ? r.nota_revision : null,
      actualizado: r ? r.updated_at : null,
    };
  });
}

async function detalleMaestro(sb, maestroId, periodo, opts) {
  const { data: m } = await sb.from("usuarios").select("id, nombre, correo").eq("id", maestroId).maybeSingle();
  const { data: rows } = await sb.from("documentos").select("*").eq("maestro_id", maestroId);
  const basRows = (rows || []).filter((r) => r.categoria === "basico");
  const honRows = (rows || []).filter((r) => r.categoria === "honorarios" && r.periodo === periodo);
  const basicos = mergeSlots(BASICOS, basRows);
  const honorarios = mergeSlots(HONORARIOS, honRows);
  const prereqsOk = PREREQS.every((t) => (honorarios.find((h) => h.tipo === t) || {}).estado === "aprobado");
  honorarios.forEach((h) => { if (h.gated) h.locked = !prereqsOk; });
  const listoPago = honorarios.every((h) => h.estado === "aprobado");
  return {
    vista: "detalle", es_admin: !!opts.esValidador, es_validador: !!opts.esValidador, puede_validar: !!opts.esValidador,
    maestro: { id: m ? m.id : maestroId, nombre: m ? m.nombre : "—", correo: m ? m.correo : null },
    periodo, periodos: opts.periodos || [], maestros: opts.maestros || [],
    basicos, honorarios, prereqs_ok: prereqsOk, listo_pago: listoPago,
  };
}

// GET: grid por maestro (validador) o detalle (maestro o ?maestro=)
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  const esValidador = puedeValidar(a);
  const esMaestro = a.rol === "maestro";
  if (!esValidador && !esMaestro && !puedeSubirBasico(a) && !puedeSubirHon(a)) return noPerm();

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "").trim() || defaultPeriodo();
  const verMaestro = (url.searchParams.get("maestro") || "").trim();
  const periodos = await periodosDisponibles(sb, periodo);

  // Maestro: solo su propio detalle
  if (!esValidador) {
    return NextResponse.json(await detalleMaestro(sb, a.id, periodo, { esValidador: false, periodos }));
  }

  const { data: maestrosRaw } = await sb.from("usuarios").select("id, nombre").eq("rol_codigo", "maestro").eq("activo", true).order("nombre");
  const maestros = (maestrosRaw || []).map((m) => ({ id: m.id, nombre: m.nombre }));

  if (verMaestro) {
    return NextResponse.json(await detalleMaestro(sb, verMaestro, periodo, { esValidador: true, periodos, maestros }));
  }

  // GRID: progreso por maestro
  const { data: docs } = await sb.from("documentos").select("maestro_id, categoria, tipo, estado, periodo");
  const grid = maestros.map((m) => {
    const mine = (docs || []).filter((d) => d.maestro_id === m.id);
    const bas = mine.filter((d) => d.categoria === "basico");
    const basApro = BASICO_TIPOS.filter((t) => bas.some((d) => d.tipo === t && d.estado === "aprobado")).length;
    const basSub = BASICO_TIPOS.filter((t) => bas.some((d) => d.tipo === t)).length;
    const hon = mine.filter((d) => d.categoria === "honorarios" && d.periodo === periodo);
    const honApro = HON_TIPOS.filter((t) => hon.some((d) => d.tipo === t && d.estado === "aprobado")).length;
    const honSub = HON_TIPOS.filter((t) => hon.some((d) => d.tipo === t)).length;
    const facturaOk = hon.some((d) => d.tipo === "factura" && d.estado === "aprobado");
    const porRevisar = mine.filter((d) => d.estado === "subido").length;
    const listoPago = HON_TIPOS.every((t) => hon.some((d) => d.tipo === t && d.estado === "aprobado"));
    return {
      id: m.id, nombre: m.nombre,
      basicos_aprobados: basApro, basicos_subidos: basSub, basicos_total: BASICO_TIPOS.length,
      honorarios_aprobados: honApro, honorarios_subidos: honSub, honorarios_total: HON_TIPOS.length,
      por_revisar: porRevisar, factura_ok: facturaOk, listo_pago: listoPago,
    };
  });
  return NextResponse.json({ vista: "grid", es_admin: true, es_validador: true, puede_validar: true, periodo, periodos, maestros: grid });
}

// POST: subir/actualizar un documento (archivo base64 o link). Body { categoria, tipo, periodo?, nombre, mime, data | enlace, maestro_id? }
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }

  const categoria = String(b.categoria || "");
  const tipo = String(b.tipo || "");
  const def = (categoria === "basico" ? BASICOS : categoria === "honorarios" ? HONORARIOS : []).find((d) => d.tipo === tipo);
  if (!def) return NextResponse.json({ error: "Tipo de documento no válido." }, { status: 400 });

  const esValidador = puedeValidar(a);
  const permOK = categoria === "basico" ? (puedeSubirBasico(a) || esValidador) : (puedeSubirHon(a) || esValidador);
  if (!permOK) return noPerm();

  let maestro_id = a.rol === "maestro" ? a.id : null;
  if (esValidador && b.maestro_id) maestro_id = String(b.maestro_id);
  if (!maestro_id) return NextResponse.json({ error: "Falta indicar el maestro." }, { status: 400 });

  const periodo = categoria === "honorarios" ? (String(b.periodo || "").trim() || null) : null;
  if (categoria === "honorarios" && !periodo) return NextResponse.json({ error: "Falta el periodo." }, { status: 400 });

  // Gating: factura y XML requieren los 4 prerequisitos APROBADOS
  if (categoria === "honorarios" && (tipo === "factura" || tipo === "xml")) {
    const { data: pr } = await sb.from("documentos").select("tipo, estado").eq("maestro_id", maestro_id).eq("categoria", "honorarios").eq("periodo", periodo).in("tipo", PREREQS);
    const ok = PREREQS.every((t) => (pr || []).some((r) => r.tipo === t && r.estado === "aprobado"));
    if (!ok) return NextResponse.json({ error: "Primero deben APROBARSE evidencias, ficha de honorarios, cotización y lista de asistencia." }, { status: 409 });
  }

  let drive_id = null, drive_link = null, enlace = null, nombre = String(b.nombre || def.label).slice(0, 200);
  if (def.es_link) {
    enlace = String(b.enlace || "").trim();
    if (!enlace) return NextResponse.json({ error: "Pega el o los links de las evidencias." }, { status: 400 });
    nombre = "Evidencias";
  } else {
    const dataB64 = String(b.data || "");
    if (!dataB64) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    if (dataB64.length > MAX_B64) return NextResponse.json({ error: "El archivo es muy grande (máx. ~3 MB)." }, { status: 400 });
    const nm = `${String(maestro_id).slice(0, 8)}-${categoria}-${tipo}${periodo ? "-" + periodo : ""}-${nombre}`;
    const up = await uploadFile(sb, { name: nm, mimeType: b.mime || "application/octet-stream", dataB64 });
    if (up.error) return NextResponse.json({ error: up.error }, { status: 400 });
    drive_id = up.id; drive_link = up.link;
  }

  // Buscar slot existente para reemplazarlo (conserva el id)
  let q = sb.from("documentos").select("id, drive_id").eq("maestro_id", maestro_id).eq("categoria", categoria).eq("tipo", tipo);
  q = periodo === null ? q.is("periodo", null) : q.eq("periodo", periodo);
  const { data: prev } = await q.maybeSingle();

  const fila = {
    maestro_id, categoria, tipo, periodo, es_link: !!def.es_link, enlace, nombre, drive_id, drive_link,
    estado: "subido", subido_por: a.id, revisado_por: null, revisado_at: null, nota_revision: null, updated_at: new Date().toISOString(),
  };

  if (prev) {
    if (prev.drive_id && prev.drive_id !== drive_id) { try { await deleteFile(sb, prev.drive_id); } catch {} }
    const { error } = await sb.from("documentos").update(fila).eq("id", prev.id);
    if (error) { if (drive_id) { try { await deleteFile(sb, drive_id); } catch {} } return NextResponse.json({ error: "No se pudo guardar el documento." }, { status: 400 }); }
  } else {
    const { error } = await sb.from("documentos").insert(fila);
    if (error) { if (drive_id) { try { await deleteFile(sb, drive_id); } catch {} } return NextResponse.json({ error: "No se pudo registrar el documento." }, { status: 400 }); }
  }
  return NextResponse.json({ ok: true });
}

// PATCH: aprobar / rechazar. Body { id, accion:"aprobar"|"rechazar", nota? }
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  const accion = String(b.accion || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  if (!["aprobar", "rechazar"].includes(accion)) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

  const { data: doc } = await sb.from("documentos").select("id, categoria").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  const permOK = doc.categoria === "basico" ? a.permisos.includes("MAESTRO_DOC_VALIDAR") : a.permisos.includes("PAGOM_VALIDAR");
  if (!permOK) return noPerm();

  const patch = {
    estado: accion === "aprobar" ? "aprobado" : "rechazado",
    revisado_por: a.id, revisado_at: new Date().toISOString(),
    nota_revision: accion === "rechazar" ? (String(b.nota || "").trim() || null) : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("documentos").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE: quitar un documento. Body { id }
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { data: doc } = await sb.from("documentos").select("id, maestro_id, subido_por, drive_id, estado").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  const esValidador = puedeValidar(a);
  const esDueno = doc.maestro_id === a.id || doc.subido_por === a.id;
  if (!esValidador && !esDueno) return noPerm();
  if (!esValidador && doc.estado === "aprobado") return NextResponse.json({ error: "Ya fue aprobado; pide a administración que lo cambie." }, { status: 409 });

  if (doc.drive_id) { try { await deleteFile(sb, doc.drive_id); } catch {} }
  const { error } = await sb.from("documentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
