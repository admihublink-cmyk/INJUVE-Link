import { NextResponse } from "next/server";
import { leerSesion } from "./auth";

// Respuestas de error compartidas por las rutas del panel.
export const mant = () => NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
export const noAuth = () => NextResponse.json({ error: "No autenticado." }, { status: 401 });
export const noPerm = () => NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });

// Usuario autenticado + sus permisos en UN solo viaje a la base (RPC panel_actor,
// que hace el join usuarios + roles_permisos). Devuelve null si no hay sesión válida.
export async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data } = await sb.rpc("panel_actor", { uid: s.id });
  const u = Array.isArray(data) ? data[0] : data;
  if (!u || !u.activo) return null;
  return { id: u.id, rol: u.rol_codigo, permisos: u.permisos || [] };
}
