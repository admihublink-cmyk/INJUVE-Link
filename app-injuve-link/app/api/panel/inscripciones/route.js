import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

const POR_PAGINA = 40;
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data: u } = await sb.from("usuarios").select("id, rol_codigo, activo").eq("id", s.id).maybeSingle();
  if (!u || !u.activo) return null;
  const { data: perms } = await sb.from("roles_permisos").select("permiso_codigo").eq("rol_codigo", u.rol_codigo);
  return { id: u.id, rol: u.rol_codigo, permisos: (perms || []).map((p) => p.permiso_codigo) };
}

const mant = () => NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
const noAuth = () => NextResponse.json({ error: "No autenticado." }, { status: 401 });
const noPerm = () => NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });

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

  let query = sb
    .from("enrollments")
    .select("id, folio, nombre, whatsapp, correo, municipio, colonia, sexo, grupo, estado, notas_admin", { count: "exact" })
    .eq("activo", true);

  // Búsqueda (se limpian caracteres que romperían el filtro PostgREST).
  const qs = q.replace(/[%,()*\\:]/g, " ").trim().slice(0, 60);
  if (qs) {
    query = query.or(`nombre.ilike.%${qs}%,folio.ilike.%${qs}%,whatsapp.ilike.%${qs}%,correo.ilike.%${qs}%`);
  }
  if (filtro === "sin_grupo") query = query.is("grupo", null);
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

  // Conteo de "sin grupo" para el filtro.
  const { count: sinGrupo } = await sb
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("activo", true)
    .is("grupo", null);

  return NextResponse.json({
    rows: rows || [],
    total: count || 0,
    pagina,
    por_pagina: POR_PAGINA,
    sin_grupo: sinGrupo || 0,
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
