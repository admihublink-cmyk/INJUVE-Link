import { NextResponse } from "next/server";
import { leerSesion, supa } from "../../../lib/alumno";

const PERIODO = "SEP-2026"; // bimestre al que se reinscribe

async function calcular(sb, id) {
  const { data, error } = await sb.rpc("reinscripcion_calcular", { p_enrollment_id: id });
  if (error) return null; // no adivinar el monto si el cálculo falla
  const c = Array.isArray(data) ? data[0] : data;
  return c || null;
}

export async function GET(req) {
  const id = leerSesion(req);
  if (!id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ error: "En mantenimiento." }, { status: 503 }); }

  const c = await calcular(sb, id);
  const { data: r } = await sb
    .from("reinscripciones")
    .select("estado, referencia, monto")
    .eq("enrollment_id", id)
    .eq("periodo", PERIODO)
    .maybeSingle();

  // Si el cálculo falló y no hay una solicitud previa, no inventamos un monto.
  if (!c && !r) return NextResponse.json({ error: "No pudimos calcular tu reinscripción en este momento. Intenta más tarde." }, { status: 503 });

  return NextResponse.json({
    periodo: PERIODO,
    categoria: c?.categoria ?? null,
    burlington: c?.burlington ?? null,
    monto: r?.monto ?? c?.monto ?? null,
    solicitada: !!r,
    estado: r?.estado || null,
    referencia: r?.referencia || null,
  });
}

export async function POST(req) {
  const id = leerSesion(req);
  if (!id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ error: "En mantenimiento." }, { status: 503 }); }

  const c = await calcular(sb, id);
  if (!c) return NextResponse.json({ error: "No pudimos calcular tu reinscripción en este momento. Intenta más tarde." }, { status: 503 });
  const { error } = await sb
    .from("reinscripciones")
    .upsert(
      { enrollment_id: id, periodo: PERIODO, categoria: c.categoria, burlington: c.burlington, monto: c.monto, estado: "solicitada" },
      { onConflict: "enrollment_id,periodo", ignoreDuplicates: true }
    );
  if (error) return NextResponse.json({ error: "No pudimos registrar tu solicitud. Intenta de nuevo." }, { status: 500 });

  return NextResponse.json({ ok: true, periodo: PERIODO, monto: c.monto, categoria: c.categoria });
}
