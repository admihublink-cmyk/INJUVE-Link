import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data: u } = await sb.from("usuarios").select("id, rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return null;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return { permisos: (perms || []).map((p) => p.permiso_codigo) };
}

// GET: métricas del dashboard (conteos en vivo).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 }); }

  const a = await actor(sb, req);
  if (!a) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!a.permisos.includes("DASHBOARD_VER")) return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });

  const contar = async (fn) => {
    try { const { count } = await fn(); return count || 0; } catch { return 0; }
  };

  const alumnos = await contar(() => sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true));
  const en_grupo = await contar(() => sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true).not("grupo", "is", null));
  const sin_grupo = await contar(() => sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true).is("grupo", null));
  const grupos = await contar(() => sb.from("groups").select("*", { count: "exact", head: true }).eq("activo", true));
  const maestros = await contar(() => sb.from("usuarios").select("*", { count: "exact", head: true }).eq("rol_codigo", "maestro").eq("activo", true));
  const casos = await contar(() => sb.from("casos_atencion").select("*", { count: "exact", head: true }).neq("estado", "resuelto"));

  return NextResponse.json({ alumnos, en_grupo, sin_grupo, grupos, maestros, casos });
}
