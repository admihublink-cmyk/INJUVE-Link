import { NextResponse } from "next/server";
import { leerSesion, supa } from "../../../lib/alumno";

const GENERICA = "InjuveLink2026";

// El alumno fija su propia contraseña (obligatorio en el primer acceso, o cambio voluntario).
export async function POST(req) {
  const id = leerSesion(req);
  if (!id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const password = String(b.password || "");
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  if (password === GENERICA) {
    return NextResponse.json({ error: "Elige una contraseña distinta a la que te enviamos." }, { status: 400 });
  }

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ error: "El portal está en mantenimiento." }, { status: 503 });
  }

  const { error } = await sb.rpc("alumno_set_password", { p_id: id, p_password: password });
  if (error) {
    console.error("alumno set password:", error);
    return NextResponse.json({ error: "No pudimos guardar tu contraseña. Intenta de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
