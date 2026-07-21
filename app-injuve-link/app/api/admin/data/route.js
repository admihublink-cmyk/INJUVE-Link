import { NextResponse } from "next/server";
import { autorizado, noAutorizado, supa } from "../../../lib/admin";

export async function GET(req) {
  if (!autorizado(req)) return noAutorizado();
  try {
    const sb = supa();
    const [inscEnq, gruEnq] = await Promise.all([
      sb.from("enrollments")
        .select("id, folio, nombre, correo, whatsapp, edad, sexo, examen_ubicacion, estado, activo, grupo, es_menor, tutor_nombre, tutor_contacto, burlington_usuario, licencia_burlington_activada, licencia_burlington_vence, notas_admin, created_at")
        .order("created_at", { ascending: false }),
      sb.from("groups").select("*").order("codigo"),
    ]);
    if (inscEnq.error) throw inscEnq.error;
    if (gruEnq.error) throw gruEnq.error;
    return NextResponse.json({ inscripciones: inscEnq.data, grupos: gruEnq.data });
  } catch (e) {
    return NextResponse.json({ error: "Error: " + (e.message || "desconocido") }, { status: 500 });
  }
}
