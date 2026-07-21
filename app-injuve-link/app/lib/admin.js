import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const COOKIE = "injuve_admin";

export function tokenEsperado() {
  const pass = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.ADMIN_SECRET || pass;
  return crypto.createHmac("sha256", secret).update("admin-ok|" + pass).digest("hex");
}

export function passwordCorrecta(intento) {
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) return false;
  const a = Buffer.from(String(intento));
  const b = Buffer.from(pass);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function autorizado(req) {
  const cookie = req.cookies.get(COOKIE)?.value || "";
  const esperado = tokenEsperado();
  if (!cookie || cookie.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(esperado));
}

export function supa() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!url || !key) throw new Error("Faltan variables de entorno de Supabase.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function noAutorizado() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
