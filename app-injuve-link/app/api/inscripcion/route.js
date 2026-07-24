import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const AVISO_VERSION = "v2.0-borrador-2026-06";

export async function POST(req) {
  try {
    return await manejar(req);
  } catch (e) {
    console.error("inscripcion crash:", e);
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

  const nombre = String(b.nombre || "").trim();
  const correo = String(b.correo || "").trim().toLowerCase();
  const whatsapp = String(b.whatsapp || "").replace(/\D/g, "");
  const fecha = b.fecha_nacimiento;
  const sexo = String(b.sexo || "").trim();
  const examen = String(b.examen_ubicacion || "").trim();
  const calle = String(b.calle || "").trim() || null;
  const colonia = String(b.colonia || "").trim() || null;
  const municipio = String(b.municipio || "").trim() || null;
  const entidad = String(b.entidad || "").trim() || null;
  const grupoSolicitado = String(b.grupo_solicitado || "").trim() || null;

  if (nombre.length < 5) return NextResponse.json({ error: "Falta el nombre completo." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  if (!/^\d{10}$/.test(whatsapp)) return NextResponse.json({ error: "WhatsApp no válido (10 dígitos)." }, { status: 400 });
  if (!fecha) return NextResponse.json({ error: "Falta la fecha de nacimiento." }, { status: 400 });
  if (!["Mujer", "Hombre", "Prefiero no decir"].includes(sexo)) {
    return NextResponse.json({ error: "Falta el campo sexo." }, { status: 400 });
  }
  if (!examen) return NextResponse.json({ error: "Falta la opción de examen de ubicación." }, { status: 400 });
  if (b.consentimiento !== true) {
    return NextResponse.json({ error: "Falta el consentimiento del aviso de privacidad." }, { status: 400 });
  }

  const nac = new Date(fecha + "T00:00:00");
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  if (Number.isNaN(edad) || edad < 15 || edad > 99) {
    return NextResponse.json({ error: "Fecha de nacimiento fuera de rango (15+ años)." }, { status: 400 });
  }
  const esMenor = edad < 18;
  if (esMenor && (!b.tutor_nombre || !b.tutor_parentesco || !b.tutor_contacto)) {
    return NextResponse.json(
      { error: "Para menores de edad se requieren los datos del padre, madre o tutor." },
      { status: 400 }
    );
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  let urlValida = false;
  try { new URL(url); urlValida = url.includes("supabase."); } catch {}
  if (!url || !serviceKey || !urlValida) {
    console.error("env mal configurada. url:", JSON.stringify(url.slice(0, 40)), "key presente:", !!serviceKey);
    return NextResponse.json(
      { error: "El sistema de inscripciones está en mantenimiento. Intenta más tarde o escríbenos por WhatsApp al 81 1903 9372." },
      { status: 503 }
    );
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

  const { data, error } = await supabase.rpc("crear_inscripcion_v3", {
    p_nombre: nombre,
    p_correo: correo,
    p_whatsapp: whatsapp,
    p_fecha_nacimiento: fecha,
    p_sexo: sexo,
    p_calle: calle,
    p_colonia: colonia,
    p_municipio: municipio,
    p_entidad: entidad,
    p_grupo_solicitado: grupoSolicitado,
    p_examen_ubicacion: examen,
    p_es_menor: esMenor,
    p_tutor_nombre: esMenor ? String(b.tutor_nombre).trim() : null,
    p_tutor_parentesco: esMenor ? b.tutor_parentesco : null,
    p_tutor_contacto: esMenor ? String(b.tutor_contacto).trim() : null,
    p_aviso_version: AVISO_VERSION,
    p_ip: ip,
  });

  if (error) {
    console.error("crear_inscripcion_v2:", error);
    if (error.message && error.message.includes("duplicada")) {
      return NextResponse.json(
        { error: "Ya existe una inscripción activa con ese correo o WhatsApp en este periodo. Si crees que es un error, escríbenos por WhatsApp al 81 1903 9372." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "No pudimos guardar tu inscripción. Intenta de nuevo o escríbenos por WhatsApp al 81 1903 9372." },
      { status: 500 }
    );
  }

  const webhook = process.env.APPS_SCRIPT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secreto: process.env.APPS_SCRIPT_SECRET || "",
          clave: data.clave, nombre, correo, whatsapp,
          fecha_nacimiento: fecha, edad, sexo, es_menor: esMenor, examen_ubicacion: examen,
        }),
      });
    } catch (e) {
      console.error("sync sheets:", e.message);
    }
  }

  return NextResponse.json({ clave: data.clave });
}
