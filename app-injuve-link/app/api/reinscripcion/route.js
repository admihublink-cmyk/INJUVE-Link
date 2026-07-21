import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const CLAVE_RE = /^INJL-\d{2}-\d{4}$/;

export async function POST(req) {
  try {
    return await manejar(req);
  } catch (e) {
    console.error("reinscripcion crash:", e);
    return NextResponse.json(
      { error: "Error interno del servidor (" + (e.message || "desconocido") + "). Escríbenos por WhatsApp al 81 1903 9372." },
      { status: 500 }
    );
  }
}

async function manejar(req) {
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

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  let urlValida = false;
  try { new URL(url); urlValida = url.includes("supabase."); } catch {}
  if (!url || !serviceKey || !urlValida) {
    return NextResponse.json(
      { error: "El sistema está en mantenimiento. Escríbenos por WhatsApp al 81 1903 9372." },
      { status: 503 }
    );
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { error } = await supabase.from("reenrollment_requests").insert({
    clave_alumno: clave,
    whatsapp,
    estado: "solicitada",
  });

  if (error) {
    console.error("reinscripcion:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya tenemos una solicitud de reinscripción activa con esa clave. Te contactaremos pronto." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp al 81 1903 9372." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
