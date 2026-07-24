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
  const { data } = await sb
    .from("groups")
    .select("codigo, nivel, horario, dias")
    .eq("activo", true)
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });
  return NextResponse.json({ grupos: data || [] });
}
