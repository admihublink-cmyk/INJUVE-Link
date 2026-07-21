import { NextResponse } from "next/server";
import { autorizado, noAutorizado, supa } from "../../../lib/admin";

const ESTADOS = ["nueva", "validada", "liga_enviada", "pagada", "asignada", "baja"];

export async function POST(req) {
  if (!autorizado(req)) return noAutorizado();
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  try {
    const sb = supa();
    const { tipo } = b;

    if (tipo === "estado") {
      if (!ESTADOS.includes(b.estado)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
      const { error } = await sb.from("enrollments").update({ estado: b.estado }).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (tipo === "acceso") {
      const { error } = await sb.from("enrollments").update({ activo: !!b.activo }).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (tipo === "asignar_grupo") {
      const { error } = await sb.from("enrollments")
        .update({ grupo: b.grupo || null, estado: b.grupo ? "asignada" : undefined }).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (tipo === "burlington") {
      const patch = {
        burlington_usuario: b.usuario || null,
        burlington_password: b.password || null,
      };
      if (b.activada) patch.licencia_burlington_activada = b.activada;
      if (b.vence) patch.licencia_burlington_vence = b.vence;
      const { error } = await sb.from("enrollments").update(patch).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (tipo === "notas") {
      const { error } = await sb.from("enrollments").update({ notas_admin: b.notas || null }).eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (tipo === "crear_grupo") {
      if (!b.codigo) return NextResponse.json({ error: "Falta el código del grupo." }, { status: 400 });
      const { error } = await sb.from("groups").insert({
        codigo: b.codigo, maestro: b.maestro || null, nivel: b.nivel || null,
        horario: b.horario || null, liga_meet: b.liga_meet || null,
        cupo: Number(b.cupo) || 25,
      });
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Ya existe un grupo con ese código." }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ ok: true });
    }

    if (tipo === "borrar_inscripcion") {
      const { error } = await sb.from("enrollments").delete().eq("id", b.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Error: " + (e.message || "desconocido") }, { status: 500 });
  }
}
