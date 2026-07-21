import crypto from "crypto";
export { supa } from "./admin";

// Cookie de sesión del alumno: guarda el id de la inscripción firmado con HMAC.
// El id no es secreto, pero la firma impide que alguien falsifique la sesión.
export const COOKIE_AL = "injuve_alumno";

function secreto() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "injuve-link-sesion";
}

export function firmarSesion(id) {
  const payload = String(id);
  const mac = crypto.createHmac("sha256", secreto()).update("alumno|" + payload).digest("hex");
  return payload + "." + mac;
}

export function leerSesion(req) {
  const raw = req.cookies.get(COOKIE_AL)?.value || "";
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const id = raw.slice(0, i);
  const mac = raw.slice(i + 1);
  const esperado = crypto.createHmac("sha256", secreto()).update("alumno|" + id).digest("hex");
  if (!mac || mac.length !== esperado.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;
  } catch {
    return null;
  }
  return id;
}
