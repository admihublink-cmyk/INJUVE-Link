import { NextResponse } from "next/server";
import { supa } from "../../../lib/auth";
import { actor, mant, noAuth, noPerm } from "../../../lib/panelAuth";

// Catálogo de grupos ofertados en el formulario de inscripción (los publica el superadmin).
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_VER")) return noPerm();

  const { data } = await sb
    .from("grupos_ofertados")
    .select("id, periodo, codigo, nivel, horario, dias, cupo, publicado, orden")
    .order("orden", { ascending: true })
    .order("nivel", { ascending: true })
    .order("codigo", { ascending: true });

  return NextResponse.json({
    grupos: data || [],
    publicados: (data || []).filter((g) => g.publicado).length,
    puede_editar: a.permisos.includes("GRUPO_CREAR"),
    puede_borrar: a.permisos.includes("GRUPO_BORRAR"),
  });
}

function limpiar(b) {
  const dias = Array.isArray(b.dias) ? b.dias.join(",") : (b.dias == null ? null : String(b.dias).trim() || null);
  const cupo = b.cupo === "" || b.cupo == null ? null : parseInt(b.cupo, 10);
  return {
    periodo: b.periodo != null ? String(b.periodo).trim() || null : undefined,
    codigo: b.codigo != null ? String(b.codigo).trim().toUpperCase() || null : undefined,
    nivel: b.nivel != null ? String(b.nivel).trim() || null : undefined,
    horario: b.horario != null ? String(b.horario).trim() || null : undefined,
    dias: b.dias !== undefined ? dias : undefined,
    cupo: b.cupo !== undefined ? (Number.isNaN(cupo) ? null : cupo) : undefined,
    publicado: b.publicado !== undefined ? !!b.publicado : undefined,
    orden: b.orden !== undefined ? (parseInt(b.orden, 10) || 0) : undefined,
  };
}
const soloDefinidos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const fila = soloDefinidos(limpiar(b));
  if (!fila.nivel && !fila.codigo) return NextResponse.json({ error: "Indica al menos nivel o código." }, { status: 400 });
  if (fila.publicado === undefined) fila.publicado = true;

  const { data, error } = await sb.from("grupos_ofertados").insert(fila).select("id").single();
  if (error) return NextResponse.json({ error: "No se pudo crear el grupo ofertado." }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_CREAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const patch = soloDefinidos(limpiar(b));
  delete patch.id;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("grupos_ofertados").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("GRUPO_BORRAR")) return noPerm();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  const { error } = await sb.from("grupos_ofertados").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
