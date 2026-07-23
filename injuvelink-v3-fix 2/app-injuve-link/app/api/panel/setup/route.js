import { NextResponse } from "next/server";
import { supa, COOKIE_PANEL, firmarSesion } from "../../../lib/auth";

// GET: ¿hace falta configurar el primer usuario (ODP)?
export async function GET() {
  try {
    const sb = supa();
    const { count, error } = await sb.from("usuarios").select("*", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ setup_necesario: (count || 0) === 0 });
  } catch (e) {
    return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
  }
}

// POST: crea el PRIMER usuario (ODP super admin). Solo funciona si no hay ningún usuario.
export async function POST(req) {
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const nombre = String(b.nombre || "").trim();
  const correo = String(b.correo || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (nombre.length < 3) return NextResponse.json({ error: "Escribe tu nombre completo." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
  }

  const { count } = await sb.from("usuarios").select("*", { count: "exact", head: true });
  if ((count || 0) > 0) {
    return NextResponse.json({ error: "La configuración inicial ya se realizó." }, { status: 409 });
  }

  const { data, error } = await sb.rpc("crear_usuario", {
    p_nombre: nombre, p_correo: correo, p_rol: "odp", p_password: password,
  });
  if (error) {
    console.error("panel setup:", error);
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_PANEL, firmarSesion(data, "odp"), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return res;
}
