import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";
import { PLANTILLA_B64 } from "./plantilla";

export const runtime = "nodejs";

// —— utilidades de normalización ——
const quita = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const normEnc = (s) => quita(s).toLowerCase().replace(/\s+/g, " ").trim(); // encabezados
const normNom = (s) =>
  quita(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const esAprobada = (r) => {
  const t = normEnc(r);
  return t.startsWith("00") || t.includes("aprobada") || t.includes("approved");
};

// Categoría tentativa por monto (se refina en el cotejo final).
function categoria(monto) {
  const m = Number(monto) || 0;
  if (m >= 975) return "PLUS";
  if (m >= 875) return "JOVEN";
  if (m === 600) return "PLUS";
  if (m === 500) return "JOVEN";
  if (m === 375) return "MATERIAL";
  return "OTRO";
}

// Localiza la hoja de transacciones y devuelve las filas aprobadas ya mapeadas.
function parsearTransacciones(base64) {
  const wb = XLSX.read(base64, { type: "base64", cellDates: true });
  // hoja "Transacciones" si existe; si no, la primera.
  let hoja =
    wb.SheetNames.find((n) => normEnc(n).includes("transaccion")) || wb.SheetNames[0];
  const ws = wb.Sheets[hoja];
  if (!ws) return { error: "El archivo no tiene hojas legibles." };
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  if (!filas.length) return { error: "La hoja está vacía." };

  // Buscar la fila de encabezados (contiene "id de la transaccion" o "resultado transaccion").
  let hIdx = -1;
  for (let i = 0; i < Math.min(filas.length, 12); i++) {
    const set = (filas[i] || []).map((c) => normEnc(c));
    if (set.some((c) => c.includes("id de la transaccion")) || set.some((c) => c.includes("resultado transaccion"))) {
      hIdx = i;
      break;
    }
  }
  if (hIdx === -1) return { error: "No se encontró el encabezado de transacciones (revisa que sea el archivo de Banorte)." };

  const heads = (filas[hIdx] || []).map((c) => normEnc(c));
  const col = (frag) => heads.findIndex((h) => h.includes(frag));
  const idx = {
    id: col("id de la transaccion"),
    ref: heads.findIndex((h) => h === "referencia"),
    ref2: col("referencia 2"),
    monto: col("monto de la transaccion"),
    email: heads.findIndex((h) => h === "email"),
    res: col("resultado transaccion"),
    fecha: col("fecha transaccion"),
    tipo: col("tipo de transaccion"),
  };
  if (idx.id === -1 || idx.res === -1) return { error: "Faltan columnas clave (Id de la Transacción / Resultado)." };

  const val = (r, i) => (i >= 0 && r[i] != null ? r[i] : "");
  const out = [];
  for (let i = hIdx + 1; i < filas.length; i++) {
    const r = filas[i] || [];
    const idT = String(val(r, idx.id)).trim();
    const res = String(val(r, idx.res)).trim();
    if (!idT) continue;
    if (!esAprobada(res)) continue; // solo aprobadas
    let fecha = val(r, idx.fecha);
    if (fecha instanceof Date && !isNaN(fecha)) fecha = fecha.toISOString();
    else fecha = fecha ? String(fecha) : null;
    out.push({
      id_transaccion: idT,
      referencia: String(val(r, idx.ref)).trim() || null,
      referencia2: String(val(r, idx.ref2)).trim() || null,
      monto: Number(val(r, idx.monto)) || 0,
      email: String(val(r, idx.email)).trim().toLowerCase() || null,
      fecha_transaccion: fecha,
      resultado: res,
      forma_pago: String(val(r, idx.tipo)).trim() || null,
    });
  }
  return { filas: out };
}

// Cruza las transacciones aprobadas contra el padrón de inscritos.
async function cruzar(sb, aprobadas) {
  const { data: enr } = await sb
    .from("enrollments")
    .select("id, folio, nombre, correo, activo")
    .neq("estado", "baja");
  const porCorreo = new Map();
  const porNombre = new Map();
  for (const e of enr || []) {
    if (e.correo) porCorreo.set(String(e.correo).toLowerCase(), e);
    const nn = normNom(e.nombre);
    if (nn && !porNombre.has(nn)) porNombre.set(nn, e);
  }
  const { data: procRows } = await sb.from("transacciones").select("id_transaccion");
  const procesadas = new Set((procRows || []).map((p) => p.id_transaccion));

  const items = aprobadas.map((t) => {
    let e = null,
      metodo = "ninguno";
    if (t.email && porCorreo.has(t.email)) {
      e = porCorreo.get(t.email);
      metodo = "correo";
    } else if (t.referencia2) {
      const nn = normNom(t.referencia2);
      if (nn && porNombre.has(nn)) {
        e = porNombre.get(nn);
        metodo = "nombre";
      }
    }
    return {
      ...t,
      categoria: categoria(t.monto),
      enrollment_id: e ? e.id : null,
      folio: e ? e.folio : null,
      nombre: e ? e.nombre : t.referencia2,
      match_metodo: metodo,
      ya_procesada: procesadas.has(t.id_transaccion),
      alumno_activo: e ? !!e.activo : false,
    };
  });
  return items;
}

// —— Cotejo final: genera el .xlsx (7 hojas) inyectando datos en la plantilla ——
function parsearCrudo(base64) {
  const wb = XLSX.read(base64, { type: "base64", cellDates: true });
  let hoja = wb.SheetNames.find((n) => normEnc(n).includes("transaccion")) || wb.SheetNames[0];
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, raw: true, defval: "" });
  let hi = filas.findIndex((r) =>
    (r || []).some((c) => normEnc(c).includes("id de la transaccion") || normEnc(c).includes("resultado transaccion"))
  );
  if (hi < 0) return null;
  const heads = (filas[hi] || []).map((c) => normEnc(c));
  const col = (f) => heads.findIndex((h) => h.includes(f));
  const ix = {
    id: col("id de la transaccion"),
    ref: heads.findIndex((h) => h === "referencia"),
    ref2: col("referencia 2"),
    monto: col("monto de la transaccion"),
    res: col("resultado transaccion"),
    fecha: col("fecha transaccion"),
  };
  const dataRows = filas.slice(hi + 1).filter((r) => String((r || [])[ix.id] || "").trim());
  return { headerRow: filas[hi], dataRows, ix };
}

// Categoría por monto (reglas confirmadas: JOVEN 500/875, PLUS 600/975, material 375).
function categoriza(monto) {
  const m = Number(monto) || 0;
  if (m === 875) return { tipo: "JOVEN", insc: 500, mat: 375 };
  if (m === 500) return { tipo: "JOVEN", insc: 500, mat: 0 };
  if (m === 975) return { tipo: "PLUS", insc: 600, mat: 375 };
  if (m === 600) return { tipo: "PLUS", insc: 600, mat: 0 };
  if (m === 375) return { tipo: "JOVEN", insc: 0, mat: 375 };
  const tipo = m >= 900 ? "PLUS" : "JOVEN";
  const insc = tipo === "PLUS" ? 600 : 500;
  const mat = Math.max(0, Math.min(375, m - insc));
  const esperado = insc + 375;
  return { tipo, insc, mat, demas: Math.max(0, m - esperado), demenos: Math.max(0, esperado - m) };
}

async function generarCotejoFinal(base64, opts) {
  const { generacion = "6ª" } = opts || {};
  const parsed = parsearCrudo(base64);
  if (!parsed) throw new Error("No se encontró la hoja de transacciones en el archivo.");
  const { headerRow, dataRows, ix } = parsed;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(PLANTILLA_B64, "base64"));

  const f = wb.getWorksheet("FICHA GENERAL");
  f.getCell("B3").value = `${generacion} Generación · Inglés en Línea · Burlington English`;
  const fechas = dataRows.map((r) => r[ix.fecha]).filter((x) => x instanceof Date && !isNaN(x));
  const dd = (d) =>
    `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  if (fechas.length) {
    const mn = new Date(Math.min(...fechas)), mx = new Date(Math.max(...fechas));
    f.getCell("C5").value = `${dd(mn)} al ${dd(mx)}`;
  }

  const jov = [], plus = [], inj = [], bur = [];
  const esApr = (r) => { const t = normEnc(r); return t.startsWith("00") || t.includes("aprobada"); };
  for (const r of dataRows) {
    if (!esApr(String(r[ix.res] || ""))) continue;
    const monto = Number(r[ix.monto]) || 0;
    const nombre = String(r[ix.ref2] || "").trim();
    const folio = String(r[ix.ref] || "").trim();
    const fecha = r[ix.fecha] instanceof Date ? r[ix.fecha] : null;
    const c = categoriza(monto);
    const fila = { nombre, folio, fecha, monto, ...c };
    (c.tipo === "PLUS" ? plus : jov).push(fila);
    if (c.insc > 0) inj.push({ insc: c.insc, folio, nombre, fecha, tipo: c.tipo });
    if (c.mat > 0) bur.push({ folio, nombre, fecha, tipo: c.tipo });
  }

  const rel = (hoja, filas) => {
    const ws = wb.getWorksheet(hoja);
    filas.forEach((it, i) => {
      const row = ws.getRow(6 + i);
      row.getCell(1).value = i + 1; row.getCell(2).value = it.nombre; row.getCell(3).value = "INGLÉS";
      row.getCell(4).value = it.fecha; row.getCell(5).value = "LIGA DE PAGO"; row.getCell(6).value = it.monto;
      row.getCell(7).value = it.insc || null; row.getCell(8).value = it.mat || null;
      row.getCell(9).value = it.demas || null; row.getCell(10).value = it.demenos || null;
    });
  };
  rel("RELACIÓN DE PAGOS JOVEN", jov);
  rel("RELACIÓN DE PAGOS PLUS", plus);

  const injWs = wb.getWorksheet("INJUVE");
  inj.forEach((it, i) => {
    const row = injWs.getRow(4 + i);
    row.getCell(2).value = i + 1; row.getCell(3).value = it.insc; row.getCell(4).value = it.folio;
    row.getCell(5).value = it.nombre; row.getCell(6).value = it.fecha; row.getCell(7).value = it.tipo; row.getCell(8).value = "LIGA DE PAGO";
  });
  const burWs = wb.getWorksheet("BURLIGTON");
  bur.forEach((it, i) => {
    const row = burWs.getRow(4 + i);
    row.getCell(2).value = i + 1; row.getCell(3).value = 375; row.getCell(4).value = it.folio;
    row.getCell(5).value = it.nombre; row.getCell(6).value = it.fecha; row.getCell(7).value = it.tipo; row.getCell(8).value = "LIGA DE PAGO";
  });

  f.getCell("C6").value = jov.length + plus.length;
  f.getCell("D9").value = [...jov, ...plus].reduce((s, x) => s + (Number(x.monto) || 0), 0);

  const tx = wb.getWorksheet("Transacciones");
  const nCols = headerRow.length;
  const escribe = (idx, arr) => {
    const row = tx.getRow(idx);
    for (let c = 0; c < nCols; c++) {
      let v = arr[c]; if (v === "") v = null;
      row.getCell(c + 1).value = v instanceof Date ? v : v ?? null;
    }
  };
  escribe(1, headerRow);
  dataRows.forEach((r, i) => escribe(2 + i, r));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf).toString("base64");
}

export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_VER")) return noPerm();

  const cont = async (fn) => {
    let c = sb.from("enrollments").select("*", { count: "exact", head: true }).neq("estado", "baja");
    c = fn(c);
    const { count } = await c;
    return count || 0;
  };
  const [registrados, pagados, sinPago] = await Promise.all([
    cont((c) => c),
    cont((c) => c.eq("activo", true)),
    cont((c) => c.eq("activo", false)),
  ]);
  const { count: txProc } = await sb.from("transacciones").select("*", { count: "exact", head: true });
  const { data: ult } = await sb
    .from("transacciones")
    .select("periodo, procesada_at")
    .order("procesada_at", { ascending: false })
    .limit(1);

  return NextResponse.json({
    registrados,
    pagados,
    sin_pago: sinPago,
    transacciones_procesadas: txProc || 0,
    ultima: ult && ult[0] ? ult[0] : null,
    puede_procesar: a.permisos.includes("INSC_CREAR"),
  });
}

export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const accion = String(b.accion || "preview");
  const periodo = String(b.periodo || "JUL-2026").trim();
  const base64 = String(b.archivo_base64 || "");
  if (!base64) return NextResponse.json({ error: "Falta el archivo de transacciones." }, { status: 400 });

  let parsed;
  try { parsed = parsearTransacciones(base64); } catch (e) {
    return NextResponse.json({ error: "No se pudo leer el archivo: " + (e.message || "formato no válido") }, { status: 400 });
  }
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.filas.length) return NextResponse.json({ error: "No se encontraron transacciones aprobadas (00-APROBADA) en el archivo." }, { status: 400 });

  const items = await cruzar(sb, parsed.filas);

  const nuevos = items.filter((i) => !i.ya_procesada && i.enrollment_id && !i.alumno_activo);
  const nuevosYaActivos = items.filter((i) => !i.ya_procesada && i.enrollment_id && i.alumno_activo);
  const sinMatch = items.filter((i) => !i.ya_procesada && !i.enrollment_id);
  const yaProcesadas = items.filter((i) => i.ya_procesada);

  const resumen = {
    aprobadas_total: items.length,
    ya_procesadas: yaProcesadas.length,
    nuevas: nuevos.length + nuevosYaActivos.length + sinMatch.length,
    a_activar: nuevos.length,
    ya_activos: nuevosYaActivos.length,
    sin_match: sinMatch.length,
  };

  const limpiar = (arr) =>
    arr.map((i) => ({
      id_transaccion: i.id_transaccion,
      nombre: i.nombre,
      correo: i.email,
      folio: i.folio,
      monto: i.monto,
      fecha: i.fecha_transaccion,
      match: i.match_metodo,
      categoria: i.categoria,
    }));

  if (accion === "preview") {
    return NextResponse.json({
      periodo,
      resumen,
      nuevos: limpiar(nuevos),
      ya_activos: limpiar(nuevosYaActivos),
      sin_match: limpiar(sinMatch),
    });
  }

  if (accion === "confirmar") {
    // Modo historial: registra un cotejo de un periodo pasado sin activar accesos del periodo actual.
    const soloHistorial = !!b.solo_historial;
    // Insertar TODAS las aprobadas no procesadas (idempotente por id_transaccion).
    const aInsertar = items.filter((i) => !i.ya_procesada);
    const filasTx = aInsertar.map((i) => ({
      id_transaccion: i.id_transaccion,
      periodo,
      referencia: i.referencia,
      referencia2: i.referencia2,
      monto: i.monto,
      email: i.email,
      fecha_transaccion: i.fecha_transaccion,
      resultado: i.resultado,
      forma_pago: i.forma_pago,
      categoria: i.categoria,
      enrollment_id: i.enrollment_id,
      match_metodo: i.match_metodo,
      activo_creado: !!(i.enrollment_id && !i.alumno_activo),
    }));
    if (filasTx.length) {
      const { error: eIns } = await sb
        .from("transacciones")
        .upsert(filasTx, { onConflict: "id_transaccion", ignoreDuplicates: true });
      if (eIns) return NextResponse.json({ error: "No se pudieron guardar las transacciones." }, { status: 500 });
    }
    // Activar acceso solo de los que hacen match y aún están inactivos (salvo modo historial).
    const ids = [...new Set(nuevos.map((i) => i.enrollment_id))];
    let activados = 0;
    if (!soloHistorial && ids.length) {
      const { data: n, error: eAct } = await sb.rpc("cotejo_activar", { p_ids: ids });
      if (eAct) return NextResponse.json({ error: "Se guardaron las transacciones pero no se pudo activar el acceso." }, { status: 500 });
      activados = n || 0;
    }
    return NextResponse.json({
      ok: true,
      periodo,
      solo_historial: soloHistorial,
      procesadas_nuevas: filasTx.length,
      activados,
      sin_match: sinMatch.length,
    });
  }

  if (accion === "cotejo_final") {
    try {
      const generacion = String(b.generacion || "6ª").trim();
      const archivo = await generarCotejoFinal(base64, { generacion });
      return NextResponse.json({ ok: true, archivo_base64: archivo, nombre: `COTEJO_${periodo}.xlsx` });
    } catch (e) {
      return NextResponse.json({ error: "No se pudo generar el cotejo: " + (e.message || "error") }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
}
