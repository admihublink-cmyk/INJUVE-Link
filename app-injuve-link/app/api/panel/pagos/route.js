import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";
import { periodosDisponibles } from "../../../lib/periodos";

const TARIFA_HORA = 200; // $ por hora de clase impartida

// actor() y respuestas (mant/noAuth/noPerm) viven en lib/panelAuth.js.

const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
const fmt = (d) => d.toISOString().slice(0, 10);
function rangoPeriodo(periodo) {
  const m = String(periodo || "").toUpperCase().match(/^([A-Z]{3})-?(\d{4})$/);
  if (!m) return null;
  const mes = MESES[m[1]];
  const anio = parseInt(m[2], 10);
  if (!mes || !anio) return null;
  return { inicio: new Date(Date.UTC(anio, mes - 1, 1)), fin: new Date(Date.UTC(anio, mes, 0)) };
}

// GET: pago por maestro calculado desde la asistencia (sesiones impartidas). ?periodo=JUL-2026
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PAGOM_VER")) return noPerm();

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "JUL-2026").trim();
  const rango = rangoPeriodo(periodo);

  // Sesiones impartidas del periodo (con detalle para el reporte por maestro).
  let sq = sb.from("sesiones_clase").select("maestro_id, fecha, group_id, duracion_horas, estado").eq("estado", "impartida");
  if (rango) sq = sq.gte("fecha", fmt(rango.inicio)).lte("fecha", fmt(rango.fin));
  const { data: ses } = await sq;

  const { data: groupsRef } = await sb.from("groups").select("id, codigo, nivel");
  const gRef = {}; (groupsRef || []).forEach((g) => { gRef[g.id] = g; });

  const agg = {};
  (ses || []).forEach((s) => {
    if (!s.maestro_id) return;
    const h = Number(s.duracion_horas) || 0;
    if (!agg[s.maestro_id]) agg[s.maestro_id] = { clases: 0, horas: 0, detalle: [] };
    agg[s.maestro_id].clases += 1;
    agg[s.maestro_id].horas += h;
    agg[s.maestro_id].detalle.push({ fecha: s.fecha, grupo: gRef[s.group_id]?.codigo || "—", nivel: gRef[s.group_id]?.nivel || "—", horas: h, monto: h * TARIFA_HORA });
  });

  const { data: maestros } = await sb.from("usuarios").select("id, nombre").eq("rol_codigo", "maestro");
  const mMap = {}; (maestros || []).forEach((m) => { mMap[m.id] = m.nombre; });

  // Estado de pago por maestro (fila resumen del periodo: group_id null).
  const { data: pagos } = await sb.from("pagos_maestro").select("maestro_id, estado").eq("periodo", periodo).is("group_id", null);
  const pMap = {}; (pagos || []).forEach((p) => { pMap[p.maestro_id] = p.estado; });

  // Estado de documentos de honorarios por maestro (para saber si está listo para pago).
  const HON_TIPOS = ["evidencias", "ficha", "cotizacion", "asistencia", "factura", "xml"];
  const { data: docsHon } = await sb.from("documentos").select("maestro_id, tipo, estado").eq("categoria", "honorarios").eq("periodo", periodo);
  const docsByM = {};
  (docsHon || []).forEach((d) => { (docsByM[d.maestro_id] = docsByM[d.maestro_id] || []).push(d); });
  const docsEstado = (mid) => {
    const mine = docsByM[mid] || [];
    const aprob = (t) => mine.some((d) => d.tipo === t && d.estado === "aprobado");
    return {
      aprobados: HON_TIPOS.filter(aprob).length,
      total: HON_TIPOS.length,
      prereqs_ok: ["evidencias", "ficha", "cotizacion", "asistencia"].every(aprob),
      factura_subida: mine.some((d) => d.tipo === "factura"),
      factura_ok: aprob("factura"),
      listo_pago: HON_TIPOS.every(aprob),
    };
  };

  const rows = Object.entries(agg).map(([mid, v]) => ({
    maestro_id: mid,
    maestro: mMap[mid] || "—",
    clases: v.clases,
    horas: v.horas,
    monto: v.horas * TARIFA_HORA,
    estado: pMap[mid] || "pendiente",
    docs: docsEstado(mid),
    detalle: v.detalle.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")),
  })).sort((x, y) => (x.maestro || "").localeCompare(y.maestro || ""));

  const total = rows.reduce((s, r) => s + r.monto, 0);
  const pagado = rows.filter((r) => r.estado === "pagado").reduce((s, r) => s + r.monto, 0);

  const periodos = await periodosDisponibles(sb, periodo);

  return NextResponse.json({
    rows, periodo, periodos,
    total, pagado, pendiente: total - pagado,
    tarifa_hora: TARIFA_HORA,
    puede_procesar: a.permisos.includes("PAGOM_PROCESAR"),
  });
}

// PATCH: marca el pago de un maestro (pagado/pendiente) para el periodo. Body { maestro_id, periodo, estado, monto }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PAGOM_PROCESAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const maestro_id = String(b.maestro_id || "");
  const periodo = String(b.periodo || "").trim();
  const estado = String(b.estado || "").trim();
  const monto = Number(b.monto) || 0;
  if (!maestro_id || !periodo) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  if (!["pendiente", "pagado"].includes(estado)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });

  const { data: ex } = await sb.from("pagos_maestro").select("id").eq("maestro_id", maestro_id).eq("periodo", periodo).is("group_id", null).limit(1);
  if (ex && ex[0]) {
    const { error } = await sb.from("pagos_maestro").update({ estado, monto, updated_at: new Date().toISOString() }).eq("id", ex[0].id);
    if (error) return NextResponse.json({ error: "No se pudo actualizar el pago." }, { status: 400 });
  } else {
    const { error } = await sb.from("pagos_maestro").insert({ maestro_id, periodo, group_id: null, nivel: null, monto, estado });
    if (error) return NextResponse.json({ error: "No se pudo guardar el pago." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
