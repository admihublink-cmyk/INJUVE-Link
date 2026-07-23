"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const ROL_NOMBRE = {
  odp: "ODP · Super Admin",
  administracion: "Administración",
  coordinador_atencion: "Coordinador de Atención",
  maestro: "Maestro",
  agente_atencion: "Agente de Atención",
  alumno: "Alumno",
  publico: "Público",
};

// Módulos del tablero: se muestran si el usuario tiene el permiso disparador.
const MODULOS = [
  { perm: "DASHBOARD_VER", nombre: "Dashboard general", desc: "Alumnos y grupos activos, métricas." },
  { perm: "INSC_VER", nombre: "Inscripciones", desc: "Altas, estados y asignación de grupo." },
  { perm: "GRUPO_VER", nombre: "Grupos", desc: "Cohortes, maestro, horario y Google Meet." },
  { perm: "MAESTRO_VER", nombre: "Maestros", desc: "Perfiles, cotización y documentos." },
  { perm: "PROGRAMA_VER", nombre: "Programa y clases", desc: "Módulos, calendario y sesiones." },
  { perm: "ASIST_REGISTRAR", nombre: "Asistencia y calificaciones", desc: "Registro por sesión y módulo." },
  { perm: "PAGOM_VER", nombre: "Pago a maestros", desc: "Evidencias, documentos y pagos." },
  { perm: "CASO_VER", nombre: "Atención a becarios", desc: "Buzón de casos con semáforo." },
  { perm: "SOLIC_ATENDER", nombre: "Solicitudes", desc: "Ligas de pago y Burlington." },
  { perm: "ARCO_ATENDER", nombre: "Legal y ARCO", desc: "Solicitudes de derechos ARCO." },
  { perm: "REPORTE_VER", nombre: "Reportes", desc: "Estadísticas del programa." },
  { perm: "REPORTE_PAGOS", nombre: "Reportes de pago", desc: "Pagos a maestros." },
  { perm: "USUARIO_VER", nombre: "Usuarios y roles", desc: "Personal, maestros, agentes y permisos." },
];

export default function Panel() {
  const [estado, setEstado] = useState("cargando"); // cargando | mantenimiento | setup | login | dentro
  const [sesion, setSesion] = useState(null);

  async function cargar() {
    try {
      const r = await fetch("/api/panel/me");
      if (r.status === 503) { setEstado("mantenimiento"); return; }
      const d = await r.json().catch(() => ({}));
      if (d.autenticado) { setSesion(d); setEstado("dentro"); return; }
      const rs = await fetch("/api/panel/setup");
      const ds = await rs.json().catch(() => ({}));
      if (rs.status === 503 || ds.error) { setEstado("mantenimiento"); return; }
      setEstado(ds.setup_necesario ? "setup" : "login");
    } catch {
      setEstado("mantenimiento");
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  async function salir() {
    try { await fetch("/api/panel/login", { method: "DELETE" }); } catch {}
    setSesion(null); setEstado("login");
  }

  if (estado === "cargando") {
    return <main className="login-fondo"><div className="login-card entra"><p className="sub">Cargando…</p></div></main>;
  }
  if (estado === "mantenimiento") {
    return (
      <main className="login-fondo">
        <div className="login-card entra">
          <h1>Panel INJUVE Link</h1>
          <p className="nota">El sistema está en configuración. Si eres del equipo técnico, revisa las variables de entorno de Supabase.</p>
          <p className="nota"><Link href="/">Volver al inicio</Link></p>
        </div>
      </main>
    );
  }
  if (estado === "setup") return <Setup onListo={cargar} />;
  if (estado === "login") return <Login onOk={cargar} />;
  return <Dashboard sesion={sesion} onSalir={salir} />;
}

function Login({ onOk }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  async function entrar(e) {
    e.preventDefault(); setError(""); setCargando(true);
    try {
      const r = await fetch("/api/panel/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo iniciar sesión.");
      onOk();
    } catch (err) { setError(err.message); setCargando(false); }
  }
  return (
    <main className="login-fondo">
      <div className="login-card entra">
        <h1>Panel INJUVE Link</h1>
        <p className="sub">Acceso del equipo</p>
        <form onSubmit={entrar}>
          <input type="email" placeholder="Correo" value={correo} autoComplete="username"
            onChange={(e) => setCorreo(e.target.value)} aria-label="Correo" />
          <input type="password" placeholder="Contraseña" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} aria-label="Contraseña" />
          <button type="submit" className="btn btn-negro" disabled={cargando}>
            {cargando ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
        {error && <p className="nota" role="status" style={{ background: "rgba(179,38,30,0.35)", borderRadius: 12, padding: "10px 14px" }}>{error}</p>}
        <p className="nota"><Link href="/">Volver al inicio</Link></p>
      </div>
    </main>
  );
}

function Setup({ onListo }) {
  const [v, setV] = useState({ nombre: "", correo: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  async function crear(e) {
    e.preventDefault(); setError("");
    if (v.password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (v.password !== v.confirm) return setError("Las contraseñas no coinciden.");
    setCargando(true);
    try {
      const r = await fetch("/api/panel/setup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: v.nombre, correo: v.correo, password: v.password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo crear el usuario.");
      onListo();
    } catch (err) { setError(err.message); setCargando(false); }
  }
  return (
    <main className="login-fondo">
      <div className="login-card entra">
        <h1>Configuración inicial</h1>
        <p className="sub">Crea el primer usuario ODP (super administrador)</p>
        <form onSubmit={crear}>
          <input type="text" placeholder="Tu nombre completo" value={v.nombre} onChange={set("nombre")} aria-label="Nombre" />
          <input type="email" placeholder="Correo" value={v.correo} onChange={set("correo")} autoComplete="username" aria-label="Correo" />
          <input type="password" placeholder="Contraseña (mín. 8)" value={v.password} onChange={set("password")} autoComplete="new-password" aria-label="Contraseña" />
          <input type="password" placeholder="Repite la contraseña" value={v.confirm} onChange={set("confirm")} autoComplete="new-password" aria-label="Confirmar contraseña" />
          <button type="submit" className="btn btn-cta" disabled={cargando}>
            {cargando ? "Creando…" : "Crear ODP y entrar"}
          </button>
        </form>
        {error && <p className="nota" role="status" style={{ background: "rgba(179,38,30,0.35)", borderRadius: 12, padding: "10px 14px" }}>{error}</p>}
        <p className="nota">Tu contraseña se guarda cifrada; nadie más la ve.</p>
      </div>
    </main>
  );
}

function Dashboard({ sesion, onSalir }) {
  const permisos = sesion?.permisos || [];
  const u = sesion?.usuario || {};
  const primer = (u.nombre || "").trim().split(/\s+/)[0] || "equipo";
  const modulos = MODULOS.filter((m) => permisos.includes(m.perm));
  return (
    <div style={{ minHeight: "100svh", background: "#FAF7F2" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", background: "var(--negro)", color: "#fff" }}>
        <div><strong style={{ color: "var(--naranja-vivo)" }}>INJUVE Link</strong> · Panel</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 14 }}>
          <span>{u.nombre} · {ROL_NOMBRE[u.rol] || u.rol}</span>
          <button onClick={onSalir} className="btn btn-fantasma" style={{ padding: "8px 16px", minHeight: 0 }}>Salir</button>
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 22px 60px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--negro)", marginBottom: 4 }}>¡Hola, {primer}! 👋</h1>
        <p style={{ color: "var(--gris)", marginBottom: 26 }}>
          Rol: <strong>{ROL_NOMBRE[u.rol] || u.rol}</strong> · Estos son tus módulos disponibles.
        </p>
        {modulos.length === 0 ? (
          <div className="card"><p>Tu rol aún no tiene módulos con pantalla. Los iremos habilitando.</p></div>
        ) : (
          <div className="grid grid-3">
            {modulos.map((m) => (
              <div className="card" key={m.perm} style={{ cursor: "default" }}>
                <h3>{m.nombre}</h3>
                <p>{m.desc}</p>
                <span className="pill" style={{ marginTop: 10 }}>Próximamente</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
