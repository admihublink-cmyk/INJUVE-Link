import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

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
    // Activar acceso solo de los que hacen match y aún están inactivos.
    const ids = [...new Set(nuevos.map((i) => i.enrollment_id))];
    let activados = 0;
    if (ids.length) {
      const { data: n, error: eAct } = await sb.rpc("cotejo_activar", { p_ids: ids });
      if (eAct) return NextResponse.json({ error: "Se guardaron las transacciones pero no se pudo activar el acceso." }, { status: 500 });
      activados = n || 0;
    }
    return NextResponse.json({
      ok: true,
      periodo,
      procesadas_nuevas: filasTx.length,
      activados,
      sin_match: sinMatch.length,
    });
  }

  return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
}
