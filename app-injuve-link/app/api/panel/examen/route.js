import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

// Editor del examen de ubicación: preguntas + bandas de nivel + resultados.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_VER")) return noPerm();

  const { data: preguntas } = await sb
    .from("examen_preguntas")
    .select("id, orden, pregunta, opciones, correcta, activa")
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  const { data: niveles } = await sb
    .from("examen_niveles")
    .select("id, desde, nivel, orden")
    .order("desde", { ascending: true });
  const { count: nResultados } = await sb
    .from("examen_resultados")
    .select("*", { count: "exact", head: true });
  const { data: recientes } = await sb
    .from("examen_resultados")
    .select("nombre, correo, puntaje, nivel, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  return NextResponse.json({
    preguntas: preguntas || [],
    niveles: niveles || [],
    resultados_total: nResultados || 0,
    recientes: recientes || [],
    puede_editar: a.permisos.includes("INSC_CREAR"),
  });
}

function limpiaPregunta(b) {
  const opciones = Array.isArray(b.opciones) ? b.opciones.map((o) => String(o)) : [];
  return {
    pregunta: b.pregunta != null ? String(b.pregunta).trim() : undefined,
    opciones: b.opciones !== undefined ? opciones : undefined,
    correcta: b.correcta !== undefined ? (parseInt(b.correcta, 10) || 0) : undefined,
    orden: b.orden !== undefined ? (parseInt(b.orden, 10) || 0) : undefined,
    activa: b.activa !== undefined ? !!b.activa : undefined,
  };
}
const soloDef = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }

  // Guardar bandas de nivel (reemplaza todas).
  if (Array.isArray(b.niveles)) {
    const filas = b.niveles
      .filter((n) => String(n.nivel || "").trim())
      .map((n, i) => ({ desde: Number(n.desde) || 0, nivel: String(n.nivel).trim(), orden: i }));
    // No permitir borrar TODAS las bandas: dejaría el examen sin criterio de nivel.
    if (!filas.length) return NextResponse.json({ error: "Debe quedar al menos una banda de nivel." }, { status: 400 });
    await sb.from("examen_niveles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await sb.from("examen_niveles").insert(filas);
    if (error) return NextResponse.json({ error: "No se pudieron guardar los niveles." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Crear pregunta.
  const fila = soloDef(limpiaPregunta(b));
  if (!fila.pregunta || !fila.opciones || fila.opciones.length < 2) {
    return NextResponse.json({ error: "La pregunta necesita texto y al menos 2 opciones." }, { status: 400 });
  }
  if (fila.activa === undefined) fila.activa = true;
  const { data, error } = await sb.from("examen_preguntas").insert(fila).select("id").single();
  if (error) return NextResponse.json({ error: "No se pudo crear la pregunta." }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const patch = soloDef(limpiaPregunta(b));
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  const { error } = await sb.from("examen_preguntas").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_CREAR")) return noPerm();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const { error } = await sb.from("examen_preguntas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
