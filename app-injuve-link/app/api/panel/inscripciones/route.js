import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

const POR_PAGINA = 40;
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

// actor() y respuestas (mant/noAuth/noPerm) viven en lib/panelAuth.js.

// GET: lista de alumnos con búsqueda, filtro por grupo y paginación.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("INSC_VER")) return noPerm();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const filtro = (url.searchParams.get("filtro") || "todos").trim();
  const pagina = Math.max(1, parseInt(url.searchParams.get("pagina") || "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  // Base: todos los inscritos menos las bajas (incluye registrados sin pago).
  let query = sb
    .from("enrollments")
    .select("id, folio, nombre, whatsapp, correo, municipio, colonia, sexo, grupo, grupo_solicitado, estado, activo, notas_admin, password_cambiada", { count: "exact" })
    .neq("estado", "baja");

  // Búsqueda (se limpian caracteres que romperían el filtro PostgREST).
  const qs = q.replace(/[%,()*\\:]/g, " ").trim().slice(0, 60);
  if (qs) {
    query = query.or(`nombre.ilike.%${qs}%,folio.ilike.%${qs}%,whatsapp.ilike.%${qs}%,correo.ilike.%${qs}%`);
  }
  if (filtro === "sin_grupo") query = query.is("grupo", null);
  else if (filtro === "pagados") query = query.eq("activo", true);
  else if (filtro === "sin_pago") query = query.eq("activo", false);
  else if (filtro && filtro !== "todos") query = query.eq("grupo", filtro);

  query = query.order("nombre", { ascending: true }).range(desde, desde + POR_PAGINA - 1);
  const { data: rows, count, error } = await query;
  if (error) return NextResponse.json({ error: "No se pudieron cargar las inscripciones." }, { status: 500 });

  const { data: grupos } = await sb
    .from("groups")
    .select("codigo, nivel, maestro")
    .eq("activo", true)
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });

  // Conteos para los filtros (base: no baja).
  const cont = async (fn) => {
    let c = sb.from("enrollments").select("*", { count: "exact", head: true }).neq("estado", "baja");
    c = fn(c);
    const { count } = await c;
    return count || 0;
  };
  const [sinGrupo, pagados, sinPago] = await Promise.all([
    cont((c) => c.is("grupo", null)),
    cont((c) => c.eq("activo", true)),
    cont((c) => c.eq("activo", false)),
  ]);

  return NextResponse.json({
    rows: rows || [],
    total: count || 0,
    pagina,
    por_pagina: POR_PAGINA,
    sin_grupo: sinGrupo,
    pagados,
    sin_pago: sinPago,
    grupos: grupos || [],
    puede_asignar: a.permisos.includes("INSC_ASIGNAR_GRUPO"),
    puede_estado: a.permisos.includes("INSC_ESTADO"),
    puede_editar: a.permisos.includes("INSC_CREAR"),
  });
}

// PATCH: asigna grupo, cambia estado o edita datos del alumno. Body { id, ... }.
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

  // Restablecer la contraseña del alumno a la genérica (para quien la perdió).
  if (b.reset_password === true) {
    if (!perms.includes("INSC_CREAR")) return noPerm();
    const { error } = await sb.rpc("alumno_reset_password", { p_id: id });
    if (error) return NextResponse.json({ error: "No se pudo restablecer la contraseña." }, { status: 400 });
    return NextResponse.json({ ok: true, reset: true });
  }

  const patch = {};

  // Asignar / cambiar grupo.
  if ("grupo" in b) {
    if (!perms.includes("INSC_ASIGNAR_GRUPO")) return noPerm();
    const g = b.grupo === null || String(b.grupo).trim() === "" ? null : String(b.grupo).trim();
    patch.grupo = g;
  }

  // Cambiar estado.
  if ("estado" in b && b.estado != null) {
    if (!perms.includes("INSC_ESTADO")) return noPerm();
    patch.estado = String(b.estado).trim();
  }

  // Editar datos personales.
  const CAMPOS = ["nombre", "correo", "whatsapp", "municipio", "colonia", "sexo", "notas_admin"];
  const editaDatos = CAMPOS.some((k) => k in b);
  if (editaDatos) {
    if (!perms.includes("INSC_CREAR")) return noPerm();
    for (const k of CAMPOS) {
      if (!(k in b)) continue;
      let v = b[k];
      if (typeof v === "string") v = v.trim();
      if (k === "nombre" && (!v || v.length < 3)) return NextResponse.json({ error: "El nombre no es válido." }, { status: 400 });
      if (k === "correo" && v && !correoOk(v)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
      patch[k] = v === "" ? null : v;
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("enrollments").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
