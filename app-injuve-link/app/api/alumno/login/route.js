import { NextResponse } from "next/server";
import { COOKIE_AL, firmarSesion, supa } from "../../../lib/alumno";

const CLAVE_RE = /^INJL-\d{2}-\d{4}$/;

export async function POST(req) {
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const clave = String(b.clave || "").toUpperCase().trim();
  const whatsapp = String(b.whatsapp || "").replace(/\D/g, "");

  if (!CLAVE_RE.test(clave)) {
    return NextResponse.json({ error: "Clave de alumno no válida (ejemplo: INJL-26-0123)." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(whatsapp)) {
    return NextResponse.json({ error: "WhatsApp no válido (10 dígitos)." }, { status: 400 });
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

  const { data, error } = await sb
    .from("enrollments")
    .select("id, activo, estado")
    .eq("folio", clave)
    .eq("whatsapp", whatsapp)
    .neq("estado", "baja")
    .maybeSingle();

  if (error) {
    console.error("alumno login:", error);
    return NextResponse.json({ error: "No pudimos validar tu acceso. Intenta de nuevo en un momento." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "No encontramos una inscripción con esa clave y WhatsApp. Revisa que sean los mismos de tu inscripción." },
      { status: 401 }
    );
  }
  if (!data.activo) {
    return NextResponse.json(
      { error: "Tu acceso todavía no está activo. Te avisaremos por WhatsApp en cuanto tu grupo esté listo." },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_AL, firmarSesion(data.id), {
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
