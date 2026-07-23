import { NextResponse } from "next/server";
import { supa, COOKIE_PANEL, firmarSesion } from "../../../lib/auth";

export async function POST(req) {
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const correo = String(b.correo || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!correo || !password) {
    return NextResponse.json({ error: "Escribe tu correo y contraseña." }, { status: 400 });
  }

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
  }

  const { data, error } = await sb.rpc("usuario_login", { p_correo: correo, p_password: password });
  if (error) {
    console.error("panel login:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, nombre: data.nombre, rol: data.rol, permisos: data.permisos });
  res.cookies.set(COOKIE_PANEL, firmarSesion(data.id, data.rol), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_PANEL, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
