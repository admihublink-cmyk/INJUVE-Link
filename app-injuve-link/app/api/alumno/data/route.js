import { NextResponse } from "next/server";
import { leerSesion, supa } from "../../../lib/alumno";

export async function GET(req) {
  const id = leerSesion(req);
  if (!id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ error: "El portal está en mantenimiento." }, { status: 503 });
  }

  const { data: al, error } = await sb
    .from("enrollments")
    .select("folio, nombre, correo, whatsapp, edad, sexo, examen_ubicacion, estado, activo, grupo, es_menor")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("alumno data:", error);
    return NextResponse.json({ error: "No pudimos cargar tu información." }, { status: 500 });
  }
  if (!al) return NextResponse.json({ error: "No encontramos tu información." }, { status: 404 });
  if (!al.activo || al.estado === "baja") {
    return NextResponse.json({ error: "Tu acceso no está activo. Escríbenos por WhatsApp al 81 1903 9372." }, { status: 403 });
  }

  let grupo = null;
  if (al.grupo) {
    const { data: g } = await sb
      .from("groups")
      .select("codigo, maestro, nivel, horario, liga_meet")
      .eq("codigo", al.grupo)
      .maybeSingle();
    grupo = g || null;
  }

  return NextResponse.json({ alumno: al, grupo });
}
