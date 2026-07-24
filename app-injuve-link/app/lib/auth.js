import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Sesión del panel del personal (ODP, Administración, Coordinador, Maestro, Agente).
export const COOKIE_PANEL = "injuve_panel";

export function supa() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!url || !key) throw new Error("Faltan variables de entorno de Supabase.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function secreto() {
  // Falla cerrado: si no hay secreto configurado NO usamos un valor por defecto público
  // (permitiría falsificar cookies). Mismo orden de resolución de siempre.
  const s = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Falta el secreto de sesión (define AUTH_SECRET o ADMIN_SECRET).");
  return s;
}

// La cookie guarda el id del usuario y su rol, firmados con HMAC.
export function firmarSesion(id, rol) {
  const payload = `${id}|${rol}`;
  const mac = crypto.createHmac("sha256", secreto()).update("panel|" + payload).digest("hex");
  return `${id}.${rol}.${mac}`;
}

export function leerSesion(req) {
  const raw = req.cookies.get(COOKIE_PANEL)?.value || "";
  const i = raw.indexOf(".");
  const j = raw.lastIndexOf(".");
  if (i <= 0 || j <= i) return null;
  const id = raw.slice(0, i);
  const rol = raw.slice(i + 1, j);
  const mac = raw.slice(j + 1);
  const esperado = crypto.createHmac("sha256", secreto()).update("panel|" + `${id}|${rol}`).digest("hex");
  if (!mac || mac.length !== esperado.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;
  } catch {
    return null;
  }
  return { id, rol };
}
