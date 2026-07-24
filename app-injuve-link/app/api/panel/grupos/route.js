import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

// actor() y respuestas (mant/noAuth/noPerm) viven en lib/panelAuth.js.
const ligaOk = (l) => /^https?:\/\//i.test(l);

// Normaliza días a CSV ISO "1..7" (1=Lun). Acepta array o string.
function normDias(v) {
  if (v == null) return null;
  if (Array.isArray(v)) v = v.join(",");
  const s = String(v).split(",").map((x) => x.trim()).filter((x) => /^[1-7]$/.test(x));
  return s.length ? Array.from(new Set(s)).sort().join(",") : null;
}
function normHora(v) {
  if (!v) return null;
  const s = String(v).trim();
  return /^\d{1,2}:\d{2}/.test(s) ? s : null;
}
// Horario por clase: array de {dia 1-7, hora, dur}. Devuelve slots limpios.
function normSlots(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const s of v) {
    if (!s) continue;
    const dia = parseInt(s.dia, 10);
    const hora = normHora(s.hora != null ? s.hora : s.hora_inicio);
    let dur = Number(s.dur != null ? s.dur : s.duracion_horas);
    if (!(dia >= 1 && dia <= 7) || !hora) continue;
    if (isNaN(dur) || dur <= 0) dur = 2;
    out.push({ dia, hora_inicio: hora, duracion_horas: dur });
  }
  return out;
}
const diasDeSlots = (slots) => Array.from(new Set(slots.map((s) => s.dia))).sort((x, y) => x - y).join(",");

// Vincula el nombre de maestro a la cuenta de usuario (maestro_id) si coincide.
async function buscarMaestroId(sb, nombre) {
  if (!nombre) return null;
  const { data } = await sb.from("usuarios").select("id").eq("rol_codigo", "maestro").eq("activo", true).ilike("nombre", nombre).limit(1);
  return data && data[0] ? data[0].id : null;
}

// GET: lista de grupos (activos e inactivos) con inscritos.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_VER")) return noPerm();

  const { data: grupos, error } = await sb
    .from("groups")
    .select("id, codigo, periodo, nivel, maestro, maestro_id, horario, cupo, liga_meet, activo, dias, hora_inicio, duracion_horas")
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });
  if (error) return NextResponse.json({ error: "No se pudieron cargar los grupos." }, { status: 500 });

  // Inscritos por grupo (alumnos activos).
  const { data: inscRows } = await sb.from("enrollments").select("grupo").eq("activo", true);
  const conteo = {};
  (inscRows || []).forEach((r) => { const g = (r.grupo || "").trim(); if (g) conteo[g] = (conteo[g] || 0) + 1; });

  const { data: slots } = await sb.from("grupo_horario").select("group_id, dia, hora_inicio, duracion_horas, orden").order("orden", { ascending: true });
  const slotMap = {};
  (slots || []).forEach((s) => { (slotMap[s.group_id] = slotMap[s.group_id] || []).push({ dia: s.dia, hora_inicio: s.hora_inicio, duracion_horas: s.duracion_horas }); });

  const rows = (grupos || []).map((g) => ({ ...g, inscritos: conteo[(g.codigo || "").trim()] || 0, horario_slots: slotMap[g.id] || [] }));

  const { data: maestrosUsers } = await sb.from("usuarios").select("nombre").eq("rol_codigo", "maestro").eq("activo", true).order("nombre");
  const { data: periodos } = await sb.from("groups").select("periodo");

  return NextResponse.json({
    rows,
    maestros: (maestrosUsers || []).map((m) => m.nombre),
    periodos: Array.from(new Set((periodos || []).map((p) => p.periodo))),
    puede_editar: a.permisos.includes("GRUPO_CREAR"),
    puede_maestro: a.permisos.includes("GRUPO_ASIGNAR_MAESTRO"),
    puede_activar: a.permisos.includes("GRUPO_ACTIVAR"),
    puede_crear: a.permisos.includes("GRUPO_CREAR"),
    puede_borrar: a.permisos.includes("GRUPO_BORRAR"),
  });
}

// POST: crea un grupo nuevo.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const codigo = String(b.codigo || "").trim();
  const periodo = String(b.periodo || "JUL-2026").trim();
  const nivel = String(b.nivel || "").trim();
  const maestro = String(b.maestro || "").trim();
  const horario = String(b.horario || "").trim();
  const cupo = parseInt(b.cupo, 10);
  const liga_meet = String(b.liga_meet || "").trim();
  const slots = normSlots(b.horario_slots);
  const dias = slots.length ? diasDeSlots(slots) : normDias(b.dias);
  const hora_inicio = slots.length ? slots[0].hora_inicio : normHora(b.hora_inicio);
  const duracion_horas = slots.length ? slots[0].duracion_horas
    : (b.duracion_horas != null && b.duracion_horas !== "" && !isNaN(Number(b.duracion_horas)) ? Number(b.duracion_horas) : null);
  if (codigo.length < 1) return NextResponse.json({ error: "El código es obligatorio." }, { status: 400 });
  if (isNaN(cupo) || cupo < 0) return NextResponse.json({ error: "El cupo debe ser un número válido." }, { status: 400 });
  if (liga_meet && !ligaOk(liga_meet)) return NextResponse.json({ error: "La liga debe empezar con http:// o https://" }, { status: 400 });

  const maestro_id = await buscarMaestroId(sb, maestro);
  const { data, error } = await sb.from("groups").insert({
    codigo, periodo, nivel: nivel || null, maestro: maestro || null, maestro_id,
    horario: horario || null, cupo, liga_meet: liga_meet || null, activo: true,
    dias, hora_inicio, duracion_horas,
  }).select("id").maybeSingle();
  if (error) {
    const dup = /duplicate|unique/i.test(error.message || "");
    return NextResponse.json({ error: dup ? "Ya existe un grupo con ese código." : "No se pudo crear el grupo." }, { status: 400 });
  }
  if (data?.id && slots.length) {
    await sb.from("grupo_horario").insert(slots.map((s, i) => ({ group_id: data.id, dia: s.dia, hora_inicio: s.hora_inicio, duracion_horas: s.duracion_horas, orden: i + 1 })));
  }
  return NextResponse.json({ ok: true, id: data?.id });
}

// PATCH: edita datos, asigna maestro o activa/desactiva. Body { id, ... }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const perms = a.permisos;
  const patch = {};

  if ("maestro" in b) {
    if (!perms.includes("GRUPO_ASIGNAR_MAESTRO")) return noPerm();
    const m = b.maestro == null ? "" : String(b.maestro).trim();
    patch.maestro = m || null;
    patch.maestro_id = await buscarMaestroId(sb, m);
  }
  if ("activo" in b) {
    if (!perms.includes("GRUPO_ACTIVAR")) return noPerm();
    patch.activo = !!b.activo;
  }
  // Datos de configuración (nivel, horario, cupo, liga_meet) -> GRUPO_CREAR.
  const cfg = ["nivel", "horario", "cupo", "liga_meet", "dias", "hora_inicio", "duracion_horas", "horario_slots"].some((k) => k in b);
  if (cfg) {
    if (!perms.includes("GRUPO_CREAR")) return noPerm();
    if ("nivel" in b) patch.nivel = b.nivel == null ? null : String(b.nivel).trim() || null;
    if ("horario" in b) patch.horario = b.horario == null ? null : String(b.horario).trim() || null;
    if ("cupo" in b) {
      const n = parseInt(b.cupo, 10);
      if (isNaN(n) || n < 0) return NextResponse.json({ error: "El cupo debe ser un número válido." }, { status: 400 });
      patch.cupo = n;
    }
    if ("liga_meet" in b) {
      const l = b.liga_meet == null ? "" : String(b.liga_meet).trim();
      if (l && !ligaOk(l)) return NextResponse.json({ error: "La liga debe empezar con http:// o https://" }, { status: 400 });
      patch.liga_meet = l || null;
    }
    if ("dias" in b) patch.dias = normDias(b.dias);
    if ("hora_inicio" in b) patch.hora_inicio = normHora(b.hora_inicio);
    if ("duracion_horas" in b) {
      const d = b.duracion_horas === "" || b.duracion_horas == null ? null : Number(b.duracion_horas);
      if (d != null && (isNaN(d) || d < 0)) return NextResponse.json({ error: "Duración no válida." }, { status: 400 });
      patch.duracion_horas = d;
    }
    if ("horario_slots" in b) {
      const slots = normSlots(b.horario_slots);
      await sb.from("grupo_horario").delete().eq("group_id", id);
      if (slots.length) {
        const { error: se } = await sb.from("grupo_horario").insert(slots.map((s, i) => ({ group_id: id, dia: s.dia, hora_inicio: s.hora_inicio, duracion_horas: s.duracion_horas, orden: i + 1 })));
        if (se) return NextResponse.json({ error: "No se pudo guardar el horario." }, { status: 400 });
      }
      patch.dias = slots.length ? diasDeSlots(slots) : null;
      patch.hora_inicio = slots.length ? slots[0].hora_inicio : null;
      patch.duracion_horas = slots.length ? slots[0].duracion_horas : null;
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("groups").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el grupo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE: borra un grupo si no tiene alumnos ni dependencias. Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_BORRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const { data: g } = await sb.from("groups").select("codigo").eq("id", id).maybeSingle();
  if (g) {
    const { count } = await sb.from("enrollments").select("*", { count: "exact", head: true }).eq("activo", true).eq("grupo", g.codigo);
    if ((count || 0) > 0) {
      return NextResponse.json({ error: `No se puede borrar: el grupo tiene ${count} alumno(s) asignado(s). Reasígnalos o desactiva el grupo.` }, { status: 400 });
    }
  }

  const { error } = await sb.from("groups").delete().eq("id", id);
  if (error) {
    const fk = /foreign key|violates|referenced/i.test(error.message || "");
    return NextResponse.json({ error: fk ? "No se puede borrar: el grupo tiene registros asociados. Desactívalo en su lugar." : "No se pudo borrar." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
