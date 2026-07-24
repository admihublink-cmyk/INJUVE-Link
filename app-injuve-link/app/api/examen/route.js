import { NextResponse } from "next/server";
import { supa } from "../../lib/auth";

// GET: preguntas activas para presentar el examen (sin la respuesta correcta).
export async function GET() {
  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ preguntas: [] }); }
  const { data } = await sb
    .from("examen_preguntas")
    .select("id, pregunta, opciones, orden")
    .eq("activa", true)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  return NextResponse.json({ preguntas: data || [] });
}

// POST: recibe respuestas, califica, asigna nivel y grupos elegibles. Guarda el resultado.
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const respuestas = b.respuestas && typeof b.respuestas === "object" ? b.respuestas : {};
  const nombre = String(b.nombre || "").trim() || null;
  const correo = String(b.correo || "").trim().toLowerCase() || null;

  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ error: "En mantenimiento." }, { status: 503 }); }

  const { data: preg } = await sb
    .from("examen_preguntas")
    .select("id, correcta")
    .eq("activa", true);
  const preguntas = preg || [];
  if (!preguntas.length) return NextResponse.json({ error: "El examen aún no está disponible." }, { status: 400 });

  let correctas = 0;
  for (const p of preguntas) {
    if (Number(respuestas[p.id]) === Number(p.correcta)) correctas++;
  }
  const total = preguntas.length;
  const puntaje = Math.round((correctas / total) * 100);

  // Nivel según las bandas (la de mayor "desde" que no supere el puntaje).
  const { data: niveles } = await sb
    .from("examen_niveles")
    .select("desde, nivel")
    .order("desde", { ascending: true });
  let nivel = (niveles && niveles.length) ? niveles[0].nivel : "1 y 2";
  for (const n of niveles || []) if (puntaje >= Number(n.desde)) nivel = n.nivel;

  // Grupos ofertados elegibles para ese nivel.
  const { data: grupos } = await sb
    .from("grupos_ofertados")
    .select("codigo, nivel, horario, dias")
    .eq("publicado", true)
    .eq("nivel", nivel)
    .order("orden", { ascending: true });

  await sb.from("examen_resultados").insert({
    nombre, correo, total, correctas, puntaje, nivel,
  });

  return NextResponse.json({ puntaje, correctas, total, nivel, grupos: grupos || [] });
}
