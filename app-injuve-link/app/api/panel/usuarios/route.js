import { NextResponse } from "next/server";
import { supa, leerSesion } from "../../../lib/auth";

// Roles que se pueden asignar a un usuario del equipo (con acceso al panel).
// Se excluyen "alumno" (entra por /login con folio) y "publico".
const ROLES_STAFF = ["odp", "administracion", "coordinador_atencion", "maestro", "agente_atencion"];

// Lee la sesión y devuelve el usuario que actúa + sus permisos (o null).
async function actor(sb, req) {
  const s = leerSesion(req);
  if (!s) return null;
  const { data: u } = await sb
    .from("usuarios")
    .select("id, rol_codigo, activo")
    .eq("id", s.id)
    .maybeSingle();
  if (!u || !u.activo) return null;
  const { data: perms } = await sb
    .from("roles_permisos")
    .select("permiso_codigo")
    .eq("rol_codigo", u.rol_codigo);
  return { id: u.id, rol: u.rol_codigo, permisos: (perms || []).map((p) => p.permiso_codigo) };
}

const mant = () => NextResponse.json({ error: "El sistema está en mantenimiento." }, { status: 503 });
const noAuth = () => NextResponse.json({ error: "No autenticado." }, { status: 401 });
const noPerm = () => NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

// GET: lista de usuarios + roles asignables + flags de permiso del que consulta.
export async function GET(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("USUARIO_VER")) return noPerm();

  const { data: usuarios, error } = await sb
    .from("usuarios")
    .select("id, nombre, correo, rol_codigo, activo, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "No se pudieron cargar los usuarios." }, { status: 500 });

  const { data: roles } = await sb.from("roles").select("codigo, nombre");
  const rolesStaff = (roles || [])
    .filter((r) => ROLES_STAFF.includes(r.codigo))
    .sort((x, y) => ROLES_STAFF.indexOf(x.codigo) - ROLES_STAFF.indexOf(y.codigo));

  return NextResponse.json({
    usuarios: usuarios || [],
    roles: rolesStaff,
    puede_gestionar: a.permisos.includes("USUARIO_GESTIONAR"),
    puede_borrar: a.permisos.includes("USUARIO_BORRAR"),
    yo: a.id,
  });
}

// POST: crea un usuario del equipo.
export async function POST(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("USUARIO_GESTIONAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const nombre = String(b.nombre || "").trim();
  const correo = String(b.correo || "").trim().toLowerCase();
  const rol = String(b.rol || "").trim();
  const password = String(b.password || "");
  if (nombre.length < 3) return NextResponse.json({ error: "Escribe el nombre completo." }, { status: 400 });
  if (!correoOk(correo)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  if (!ROLES_STAFF.includes(rol)) return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });

  const { data, error } = await sb.rpc("crear_usuario", {
    p_nombre: nombre, p_correo: correo, p_rol: rol, p_password: password,
  });
  if (error) {
    const dup = /duplicate|unique|ya existe/i.test(error.message || "");
    return NextResponse.json({ error: dup ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data });
}

// PATCH: edita campos, cambia contraseña o activa/desactiva. Body incluye { id }.
export async function PATCH(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("USUARIO_GESTIONAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });

  // Cambio de contraseña.
  if (b.password != null) {
    const password = String(b.password || "");
    if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    const { error } = await sb.rpc("usuario_set_password", { p_id: id, p_password: password });
    if (error) return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Actualización de campos.
  const patch = {};
  if (b.nombre != null) {
    const n = String(b.nombre).trim();
    if (n.length < 3) return NextResponse.json({ error: "Nombre no válido." }, { status: 400 });
    patch.nombre = n;
  }
  if (b.correo != null) {
    const c = String(b.correo).trim().toLowerCase();
    if (!correoOk(c)) return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
    patch.correo = c;
  }
  if (b.rol != null) {
    const r = String(b.rol).trim();
    if (!ROLES_STAFF.includes(r)) return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
    if (id === a.id && r !== a.rol) return NextResponse.json({ error: "No puedes cambiar tu propio rol." }, { status: 400 });
    patch.rol_codigo = r;
  }
  if (b.activo != null) {
    if (id === a.id && b.activo === false) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
    patch.activo = !!b.activo;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });

  const { error } = await sb.from("usuarios").update(patch).eq("id", id);
  if (error) {
    const dup = /duplicate|unique/i.test(error.message || "");
    return NextResponse.json({ error: dup ? "Ya existe un usuario con ese correo." : "No se pudo actualizar." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE: borra un usuario (si no tiene registros asociados). Body { id }.
export async function DELETE(req) {
  let sb;
  try { sb = supa(); } catch { return mant(); }
  const a = await actor(sb, req);
  if (!a) return noAuth();
  if (!a.permisos.includes("USUARIO_BORRAR")) return noPerm();

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ error: "Falta el identificador." }, { status: 400 });
  if (id === a.id) return NextResponse.json({ error: "No puedes borrar tu propia cuenta." }, { status: 400 });

  const { error } = await sb.from("usuarios").delete().eq("id", id);
  if (error) {
    const fk = /foreign key|violates|referenced|still referenced/i.test(error.message || "");
    return NextResponse.json({
      error: fk
        ? "No se puede borrar: el usuario tiene registros asociados (grupos, casos, pagos…). Desactívalo en su lugar."
        : "No se pudo borrar.",
    }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
