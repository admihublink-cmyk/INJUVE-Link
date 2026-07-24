import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";
import { exchangeCode, guardarRefreshToken, ensureFolder, drivePerfil } from "../../../lib/drive";

async function esAdmin(sb, req) {
  const s = leerSesion(req);
  if (!s) return false;
  const { data: u } = await sb.from("usuarios").select("rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return false;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return (perms || []).some((p) => p.permiso_codigo === "PROGRAMA_CONFIG");
}

// GET: recibe el código de Google, guarda el refresh token y crea la carpeta.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return NextResponse.redirect(new URL("/panel?drive=mant", req.url)); }
  if (!(await esAdmin(sb, req))) return NextResponse.redirect(new URL("/panel?drive=noauth", req.url));

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/panel?drive=err", req.url));
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/panel?drive=err", req.url));

  const tok = await exchangeCode(code);
  if (!tok || !tok.refresh_token) return NextResponse.redirect(new URL("/panel?drive=err", req.url));

  await guardarRefreshToken(sb, tok.refresh_token);
  if (tok.access_token) {
    try { await ensureFolder(sb, tok.access_token); } catch {}
    try {
      const perfil = await drivePerfil(tok.access_token);
      if (perfil?.emailAddress) await sb.from("app_config").upsert({ clave: "google_drive_email", valor: perfil.emailAddress, updated_at: new Date().toISOString() });
    } catch {}
  }
  return NextResponse.redirect(new URL("/panel?drive=ok", req.url));
}
