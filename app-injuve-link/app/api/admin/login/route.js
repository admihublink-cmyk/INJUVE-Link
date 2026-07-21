import { NextResponse } from "next/server";
import { COOKIE, passwordCorrecta, tokenEsperado } from "../../../lib/admin";

export async function POST(req) {
  try {
    const { password } = await req.json();
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "El panel no está configurado (falta ADMIN_PASSWORD)." }, { status: 503 });
    }
    if (!passwordCorrecta(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, tokenEsperado(), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Error: " + (e.message || "desconocido") }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
