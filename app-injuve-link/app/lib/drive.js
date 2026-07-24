// Conector a Google Drive vía OAuth (la app actúa como direccion@injuvelink.com).
// El refresh token se guarda en app_config; client_id/secret vienen de las env vars.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URI = "https://injuve-link.vercel.app/api/drive/callback";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export function driveClientId() { return process.env.GOOGLE_CLIENT_ID || ""; }
export function driveClientSecret() { return process.env.GOOGLE_CLIENT_SECRET || ""; }
export function driveConfigurado() { return !!(driveClientId() && driveClientSecret()); }

export function consentUrl(state) {
  const p = new URLSearchParams({
    client_id: driveClientId(),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: state || "panel",
  });
  return AUTH_URL + "?" + p.toString();
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    code, client_id: driveClientId(), client_secret: driveClientSecret(),
    redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return r.json().catch(() => ({}));
}

async function cfgGet(sb, clave) {
  const { data } = await sb.from("app_config").select("valor").eq("clave", clave).maybeSingle();
  return data?.valor || null;
}
async function cfgSet(sb, clave, valor) {
  await sb.from("app_config").upsert({ clave, valor, updated_at: new Date().toISOString() });
}

export async function guardarRefreshToken(sb, token) { await cfgSet(sb, "google_drive_refresh_token", token); }
export async function driveConectado(sb) { return !!(await cfgGet(sb, "google_drive_refresh_token")); }

export async function accessToken(sb) {
  if (!driveConfigurado()) return null;
  const rt = await cfgGet(sb, "google_drive_refresh_token");
  if (!rt) return null;
  const body = new URLSearchParams({
    client_id: driveClientId(), client_secret: driveClientSecret(),
    refresh_token: rt, grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return j.access_token || null;
}

// Asegura la carpeta raíz "INJUVE Link" en el Drive; devuelve su id (guardado en app_config).
export async function ensureFolder(sb, token) {
  const existing = await cfgGet(sb, "google_drive_folder_id");
  if (existing) return existing;
  const r = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "INJUVE Link", mimeType: "application/vnd.google-apps.folder" }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.id) { await cfgSet(sb, "google_drive_folder_id", j.id); return j.id; }
  return null;
}

// Datos de la cuenta autorizada (para mostrar "conectado como …").
export async function drivePerfil(token) {
  const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)", {
    headers: { Authorization: "Bearer " + token },
  });
  const j = await r.json().catch(() => ({}));
  return j.user || null;
}
