import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";

// Público: grupos ofertados para que el formulario de inscripción los muestre.
// Solo información no sensible (código, nivel, horario/días).
export async function GET() {
  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ grupos: [] });
  }
  // Se muestran los grupos que el superadmin publicó para este periodo.
  const { data } = await sb
    .from("grupos_ofertados")
    .select("codigo, nivel, horario, dias")
    .eq("publicado", true)
    .order("orden", { ascending: true })
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });
  return NextResponse.json({ grupos: data || [] });
}
