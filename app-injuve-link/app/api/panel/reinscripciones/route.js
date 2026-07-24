import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

export const runtime = "nodejs";

// Grupo del alumno → sufijo de referencia (G04 → G4, sin grupo → GX).
function grupoRef(g) {
  const s = String(g || "").trim().toUpperCase();
  const m = s.match(/G0*(\d+)/);
  if (m) return "G" + m[1];
  return s || "GX";
}
const mayus = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_VER")) return noPerm();

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "SEP-2026").trim();

  const { data, error } = await sb.rpc("reinscripciones_pendientes", { p_periodo: periodo });
  if (error) return NextResponse.json({ error: "No se pudo cargar el buzón." }, { status: 500 });

  const rows = data || [];
  const resumen = {
    total: rows.length,
    solicitadas: rows.filter((r) => r.solicitada).length,
    generadas: rows.filter((r) => r.estado === "liga_generada").length,
    pagadas: rows.filter((r) => r.estado === "pagada").length,
    monto_total: rows.reduce((s, r) => s + (Number(r.monto) || 0), 0),
  };
  return NextResponse.json({
    rows, resumen, periodo,
    puede_generar: a.permisos.includes("INSC_CREAR"),
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
  const periodo = String(b.periodo || "SEP-2026").trim();
  const ids = Array.isArray(b.ids) ? b.ids : null;

  const { data, error } = await sb.rpc("reinscripciones_pendientes", { p_periodo: periodo });
  if (error) return NextResponse.json({ error: "No se pudo cargar la lista." }, { status: 500 });
  let lista = (data || []);
  if (ids && ids.length) lista = lista.filter((r) => ids.includes(r.enrollment_id));
  // Solo se genera liga para quienes AÚN no la tienen: nunca re-numeramos a quien ya tiene
  // liga o pagó (eso rompería la conciliación con Banorte y perdería el pago registrado).
  lista = lista.filter((r) => r.estado !== "liga_generada" && r.estado !== "pagada");
  if (!lista.length) return NextResponse.json({ error: "No hay alumnos pendientes de liga. Los seleccionados ya tienen su liga generada o pagada." }, { status: 400 });

  // Base de numeración = mayor sufijo numérico ya usado en el periodo + 1 (arranca en 2001).
  // Usar el máximo (no el conteo) evita colisiones al generar en varios lotes.
  const { data: existentes } = await sb
    .from("reinscripciones")
    .select("referencia")
    .eq("periodo", periodo)
    .not("referencia", "is", null);
  let maxSeq = 2000;
  (existentes || []).forEach((x) => {
    const m = String(x.referencia || "").match(/(\d+)\s*$/);
    if (m) { const n = parseInt(m[1], 10); if (!isNaN(n) && n > maxSeq) maxSeq = n; }
  });
  const base = maxSeq + 1;

  const filas = [];
  const csv = ["Email,Monto,Referencia,Referencia2"];
  lista.forEach((r, i) => {
    const referencia = `INJLK-${grupoRef(r.grupo)}-${base + i}`;
    filas.push({
      enrollment_id: r.enrollment_id, periodo,
      categoria: r.categoria, burlington: r.burlington, monto: r.monto,
      referencia, estado: "liga_generada",
    });
    csv.push([r.correo || "", Number(r.monto) || 0, referencia, mayus(r.nombre)].join(","));
  });

  const { error: eUp } = await sb
    .from("reinscripciones")
    .upsert(filas, { onConflict: "enrollment_id,periodo" });
  if (eUp) return NextResponse.json({ error: "No se pudieron guardar las referencias." }, { status: 500 });

  return NextResponse.json({
    ok: true,
    generadas: filas.length,
    csv: csv.join("\n"),
    nombre: `LOTE_REINSCRIPCION_${periodo}.csv`,
  });
}

export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const enrollment_id = String(b.enrollment_id || "");
  const periodo = String(b.periodo || "").trim();
  const estado = String(b.estado || "").trim();
  if (!enrollment_id || !periodo || !["solicitada", "liga_generada", "pagada"].includes(estado)) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }
  const { error } = await sb
    .from("reinscripciones")
    .update({ estado })
    .eq("enrollment_id", enrollment_id)
    .eq("periodo", periodo);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
