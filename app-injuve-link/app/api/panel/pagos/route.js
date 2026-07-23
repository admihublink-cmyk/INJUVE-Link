import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

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
const ESTADOS = ["pendiente", "pagado"];

// GET: pagos de un periodo, con resumen. ?periodo=JUL-2026
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PAGOM_VER")) return noPerm();

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "JUL-2026").trim();

  const { data: pagos } = await sb.from("pagos_maestro").select("id, maestro_id, group_id, periodo, nivel, monto, estado").eq("periodo", periodo);
  const { data: maestros } = await sb.from("usuarios").select("id, nombre").eq("rol_codigo", "maestro");
  const { data: groups } = await sb.from("groups").select("id, codigo, nivel, maestro_id, activo");

  const mMap = {}; (maestros || []).forEach((m) => { mMap[m.id] = m.nombre; });
  const gMap = {}; (groups || []).forEach((g) => { gMap[g.id] = g; });

  const rows = (pagos || [])
    .map((p) => ({
      id: p.id,
      maestro_id: p.maestro_id,
      maestro: mMap[p.maestro_id] || "—",
      group_id: p.group_id,
      grupo: gMap[p.group_id]?.codigo || "—",
      nivel: p.nivel || (gMap[p.group_id]?.nivel ?? "—"),
      monto: p.monto != null ? Number(p.monto) : 0,
      estado: p.estado,
    }))
    .sort((a2, b2) => (a2.maestro || "").localeCompare(b2.maestro || "") || (a2.grupo || "").localeCompare(b2.grupo || ""));

  const conPago = new Set((pagos || []).map((p) => p.group_id));
  const generables = (groups || []).filter((g) => g.activo && g.maestro_id && !conPago.has(g.id)).length;

  const total = rows.reduce((s, r) => s + r.monto, 0);
  const pagado = rows.filter((r) => r.estado === "pagado").reduce((s, r) => s + r.monto, 0);

  const periodos = Array.from(new Set([...(groups || []).map(() => null), periodo].filter(Boolean)));
  const { data: gper } = await sb.from("groups").select("periodo");
  (gper || []).forEach((x) => { if (x.periodo && !periodos.includes(x.periodo)) periodos.push(x.periodo); });

  return NextResponse.json({
    rows, periodo, periodos, generables,
    total, pagado, pendiente: total - pagado,
    puede_procesar: a.permisos.includes("PAGOM_PROCESAR"),
  });
}

// POST: genera los pagos faltantes del periodo desde la cotización por nivel. Body { periodo }.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PAGOM_PROCESAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const periodo = String(b.periodo || "JUL-2026").trim();

  const { data: groups } = await sb.from("groups").select("id, nivel, maestro_id").eq("activo", true).not("maestro_id", "is", null);
  const { data: cotis } = await sb.from("cotizaciones_maestro").select("maestro_id, nivel, monto");
  const cotMap = {}; (cotis || []).forEach((c) => { cotMap[c.maestro_id + "|" + c.nivel] = Number(c.monto); });

  const { data: existentes } = await sb.from("pagos_maestro").select("group_id").eq("periodo", periodo);
  const yaTiene = new Set((existentes || []).map((p) => p.group_id));

  const nuevos = (groups || [])
    .filter((g) => !yaTiene.has(g.id))
    .map((g) => ({
      maestro_id: g.maestro_id,
      group_id: g.id,
      periodo,
      nivel: g.nivel,
      monto: cotMap[g.maestro_id + "|" + g.nivel] || 0,
      estado: "pendiente",
    }));

  if (nuevos.length > 0) {
    const { error } = await sb.from("pagos_maestro").insert(nuevos);
    if (error) return NextResponse.json({ error: "No se pudieron generar los pagos." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, creados: nuevos.length });
}

// PATCH: cambia estado o monto de un pago. Body { id, estado?, monto? }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("PAGOM_PROCESAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  const patch = { updated_at: new Date().toISOString() };
  if ("estado" in b) {
    const e = String(b.estado).trim();
    if (!ESTADOS.includes(e)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    patch.estado = e;
  }
  if ("monto" in b) {
    const n = Number(b.monto);
    if (isNaN(n) || n < 0) return NextResponse.json({ error: "Monto no válido." }, { status: 400 });
    patch.monto = n;
  }
  if (Object.keys(patch).length <= 1) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("pagos_maestro").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el pago." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
