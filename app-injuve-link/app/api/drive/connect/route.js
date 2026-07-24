import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";
import { consentUrl, driveConfigurado } from "../../../lib/drive";

async function esAdmin(sb, req) {
  const s = leerSesion(req);
  if (!s) return false;
  const { data: u } = await sb.from("usuarios").select("rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return false;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return (perms || []).some((p) => p.permiso_codigo === "PROGRAMA_CONFIG");
}

// GET: inicia el consentimiento OAuth de Google Drive (solo admin/ODP).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return NextResponse.redirect(new URL("/panel?drive=mant", req.url)); }
  if (!(await esAdmin(sb, req))) return NextResponse.redirect(new URL("/panel?drive=noauth", req.url));
  if (!driveConfigurado()) return NextResponse.redirect(new URL("/panel?drive=noenv", req.url));
  return NextResponse.redirect(consentUrl("panel"));
}
