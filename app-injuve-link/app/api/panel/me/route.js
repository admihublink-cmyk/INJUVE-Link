import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

// Devuelve el usuario en sesión con su rol y permisos (o autenticado:false).
export async function GET(req) {
  const s = leerSesion(req);
  if (!s) return NextResponse.json({ autenticado: false });

  let sb;
  try {
    sb = supa();
  } catch {
    return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
  }

  const { data: u, error } = await sb
    .from("usuarios")
    .select("id, nombre, correo, rol_codigo, activo")
    .eq("id", s.id)
    .maybeSingle();
  if (error || !u || !u.activo) return NextResponse.json({ autenticado: false });

  const { data: perms } = await sb
    .from("roles_permisos")
    .select("permiso_codigo")
    .eq("rol_codigo", u.rol_codigo);

  return NextResponse.json({
    autenticado: true,
    usuario: { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol_codigo },
    permisos: (perms || []).map((p) => p.permiso_codigo),
  });
}
