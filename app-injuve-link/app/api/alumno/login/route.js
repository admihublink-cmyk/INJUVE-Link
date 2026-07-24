import { NextResponse } from "next/server";
import { COOKIE_AL, firmarSesion, supa } from "../../../lib/alumno";

const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

// Login del alumno v2: correo + contraseña (la matrícula/folio ya no se usa para entrar).
export async function POST(req) {
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const correo = String(b.correo || "").trim().toLowerCase();
  const password = String(b.password || "");

  if (!correoOk(correo)) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Escribe tu contraseña." }, { status: 400 });
  }

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json(
      { error: "El portal está en mantenimiento. Escríbenos por WhatsApp al 81 1903 9372." },
      { status: 503 }
    );
  }

  const { data, error } = await sb.rpc("alumno_login", { p_correo: correo, p_password: password });
  if (error) {
    console.error("alumno login:", error);
    return NextResponse.json({ error: "No pudimos validar tu acceso. Intenta de nuevo en un momento." }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos. Si es tu primer acceso, usa la contraseña que te enviamos." },
      { status: 401 }
    );
  }
  if (!row.activo) {
    return NextResponse.json(
      { error: "Tu acceso todavía no está activo. Te avisaremos por WhatsApp en cuanto tu grupo esté listo." },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true, cambiar_password: !row.password_cambiada });
  res.cookies.set(COOKIE_AL, firmarSesion(row.id), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_AL, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
