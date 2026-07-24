import { NextResponse } from "next/server";
import { leerSesion, supa } from "../../../lib/alumno";

const PERIODO = "SEP-2026"; // bimestre al que se reinscribe

async function calcular(sb, id) {
  const { data } = await sb.rpc("reinscripcion_calcular", { p_enrollment_id: id });
  const c = Array.isArray(data) ? data[0] : data;
  return c || { categoria: "JOVEN", burlington: false, monto: 875 };
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

  return NextResponse.json({
    periodo: PERIODO,
    categoria: c.categoria,
    burlington: c.burlington,
    monto: r?.monto ?? c.monto,
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
  const { error } = await sb
    .from("reinscripciones")
    .upsert(
      { enrollment_id: id, periodo: PERIODO, categoria: c.categoria, burlington: c.burlington, monto: c.monto, estado: "solicitada" },
      { onConflict: "enrollment_id,periodo", ignoreDuplicates: true }
    );
  if (error) return NextResponse.json({ error: "No pudimos registrar tu solicitud. Intenta de nuevo." }, { status: 500 });

  return NextResponse.json({ ok: true, periodo: PERIODO, monto: c.monto, categoria: c.categoria });
}
