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
};

// Etiqueta corta para las insignias de rol en la tabla de usuarios.
const ROL_CORTO = {
  odp: "ODP · Super Admin",
  administracion: "Administración",
  coordinador_atencion: "Coordinador",
  maestro: "Maestro",
  agente_atencion: "Agente",
};

// Cada módulo se muestra en el menú lateral si el usuario tiene el permiso disparador.
const MODULOS = [
  { id: "dashboard", perm: "DASHBOARD_VER", nombre: "Dashboard", icon: "📊", desc: "Alumnos y grupos activos, métricas del programa." },
  { id: "inscripciones", perm: "INSC_VER", nombre: "Inscripciones", icon: "📝", desc: "Altas, estados y asignación de grupo." },
  { id: "grupos", perm: "GRUPO_VER", nombre: "Grupos", icon: "👥", desc: "Cohortes, maestro, horario y Google Meet." },
  { id: "maestros", perm: "MAESTRO_VER", nombre: "Maestros", icon: "🎓", desc: "Perfiles, cotización y documentos." },
  { id: "programa", perm: "PROGRAMA_VER", nombre: "Programa y clases", icon: "📚", desc: "Módulos, calendario y sesiones." },
  { id: "academico", perm: "CALIF_VER", nombre: "Asistencia y calificaciones", icon: "✅", desc: "Registro por sesión y módulo." },
  { id: "pagos", perm: "PAGOM_VER", nombre: "Pago a maestros", icon: "💵", desc: "Evidencias, documentos y pagos." },
  { id: "atencion", perm: "CASO_VER", nombre: "Atención a becarios", icon: "🎧", desc: "Buzón de casos con semáforo." },
  { id: "solicitudes", perm: "SOLIC_ATENDER", nombre: "Solicitudes", icon: "📨", desc: "Ligas de pago y Burlington." },
  { id: "legal", perm: "ARCO_ATENDER", nombre: "Legal y ARCO", icon: "⚖️", desc: "Solicitudes de derechos ARCO." },
  { id: "reportes", perm: "REPORTE_VER", nombre: "Reportes", icon: "📈", desc: "Estadísticas del programa." },
  { id: "reportes_pago", perm: "REPORTE_PAGOS", nombre: "Reportes de pago", icon: "💳", desc: "Pagos a maestros." },
  { id: "usuarios", perm: "USUARIO_VER", nombre: "Usuarios y roles", icon: "🔑", desc: "Personal, maestros, agentes y permisos." },
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
    } catch { setEstado("mantenimiento"); }
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
  return <Shell sesion={sesion} onSalir={salir} />;
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

function Shell({ sesion, onSalir }) {
  const permisos = sesion?.permisos || [];
  const u = sesion?.usuario || {};
  const modulos = MODULOS.filter((m) => permisos.includes(m.perm));
  const [activa, setActiva] = useState("dashboard");
  const [navAbierto, setNavAbierto] = useState(false);
  const modActiva = modulos.find((m) => m.id === activa) || modulos[0];

  return (
    <div className="pnl">
      <style>{`
        .pnl{position:fixed;inset:0;z-index:500;background:#FAF7F2;display:flex;flex-direction:column;
          font-family:var(--font-cuerpo),-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--texto);}
        .pnl-top{display:flex;align-items:center;justify-content:space-between;gap:12px;height:60px;
          padding:0 16px;background:var(--negro);color:#fff;flex-shrink:0;}
        .pnl-top .brand{display:flex;align-items:center;gap:10px;}
        .pnl-top .brand img{height:30px;width:auto;display:block;}
        .pnl-top .brand b{font-weight:700;font-size:15px;opacity:.9;}
        .pnl-top .der{display:flex;align-items:center;gap:14px;font-size:14px;}
        .pnl-top .der a{color:rgba(255,255,255,.7);}
        .pnl-top .der .quien{opacity:.9;white-space:nowrap;}
        .pnl-salir{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:#fff;
          border-radius:999px;padding:7px 16px;font-size:13.5px;font-weight:700;cursor:pointer;}
        .pnl-salir:hover{background:rgba(255,255,255,.22);}
        .pnl-burger{display:none;background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:2px 6px;}
        .pnl-body{display:flex;flex:1;min-height:0;}
        .pnl-aside{width:252px;background:#fff;border-right:1px solid var(--borde);overflow-y:auto;flex-shrink:0;}
        .pnl-aside nav{padding:12px 10px;display:grid;gap:3px;}
        .pnl-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:11px;border:none;
          background:transparent;color:var(--texto);font-weight:500;font-size:14.5px;cursor:pointer;text-align:left;width:100%;
          transition:background .15s;}
        .pnl-item:hover{background:#F4F1EC;}
        .pnl-item.on{background:var(--naranja-claro);color:var(--naranja-osc);font-weight:800;}
        .pnl-item .ic{font-size:17px;width:22px;text-align:center;}
        .pnl-main{flex:1;overflow-y:auto;padding:30px 34px;}
        .pnl-overlay{display:none;}
        @media(max-width:820px){
          .pnl-burger{display:inline-flex;}
          .pnl-top .der .quien{display:none;}
          .pnl-aside{position:fixed;top:60px;left:0;bottom:0;z-index:30;transform:translateX(-102%);
            transition:transform .25s var(--ease);box-shadow:0 20px 60px -20px rgba(0,0,0,.5);}
          .pnl-aside.abierto{transform:none;}
          .pnl-overlay.abierto{display:block;position:fixed;inset:60px 0 0 0;background:rgba(0,0,0,.35);z-index:25;}
          .pnl-main{padding:22px 18px;}
        }
        /* Módulo Usuarios */
        .u-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
        .u-btn{background:var(--naranja);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;}
        .u-btn:hover{background:var(--naranja-osc);}
        .u-btn.sec{background:#fff;color:var(--texto);border:1px solid var(--borde);}
        .u-btn.sec:hover{background:#F4F1EC;}
        .u-btn.dan{background:#B3261E;color:#fff;}
        .u-btn.dan:hover{background:#8f1e18;}
        .u-btn:disabled{opacity:.55;cursor:default;}
        .u-card{background:#fff;border:1px solid var(--borde);border-radius:16px;overflow:hidden;box-shadow:var(--sombra);}
        .u-tablewrap{overflow-x:auto;}
        .u-table{width:100%;border-collapse:collapse;font-size:14px;}
        .u-table th{text-align:left;padding:12px 16px;background:#FAF7F2;color:var(--gris);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid var(--borde);white-space:nowrap;}
        .u-table td{padding:12px 16px;border-bottom:1px solid var(--borde);vertical-align:middle;}
        .u-table tr:last-child td{border-bottom:none;}
        .u-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;}
        .u-badge.on{background:#E7F5EC;color:#1B7A3D;}
        .u-badge.off{background:#F1EEE9;color:#8A8178;}
        .u-rol{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:var(--naranja-claro);color:var(--naranja-osc);white-space:nowrap;}
        .u-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
        .u-mini{background:none;border:1px solid var(--borde);border-radius:8px;padding:5px 10px;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--texto);font-family:inherit;white-space:nowrap;}
        .u-mini:hover{background:#F4F1EC;}
        .u-mini.dan{color:#B3261E;border-color:rgba(179,38,30,.3);}
        .u-mini.dan:hover{background:rgba(179,38,30,.08);}
        .u-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:600;padding:16px;}
        .u-modal{background:#fff;border-radius:18px;padding:24px;width:100%;max-width:440px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);}
        .u-modal h3{font-size:20px;font-weight:800;color:var(--negro);margin-bottom:2px;}
        .u-inp,.u-sel{width:100%;padding:11px 13px;border:1px solid var(--borde);border-radius:10px;font-size:14.5px;margin-top:10px;font-family:inherit;background:#fff;color:var(--texto);}
        .u-inp:focus,.u-sel:focus{outline:none;border-color:var(--naranja);}
        .u-err{background:rgba(179,38,30,.1);color:#B3261E;border-radius:10px;padding:9px 13px;font-size:13.5px;margin-top:12px;}
      `}</style>

      <header className="pnl-top">
        <div className="brand">
          <button className="pnl-burger" onClick={() => setNavAbierto((s) => !s)} aria-label="Menú">☰</button>
          <img src="/logos/injuve-link.png" alt="INJUVE Link" />
          <b>Panel</b>
        </div>
        <div className="der">
          <a href="/" target="_blank" rel="noopener noreferrer">Ver sitio ↗</a>
          <span className="quien">{u.nombre} · {ROL_NOMBRE[u.rol] || u.rol}</span>
          <button className="pnl-salir" onClick={onSalir}>Salir</button>
        </div>
      </header>

      <div className="pnl-body">
        <div className={"pnl-overlay" + (navAbierto ? " abierto" : "")} onClick={() => setNavAbierto(false)} />
        <aside className={"pnl-aside" + (navAbierto ? " abierto" : "")}>
          <nav>
            {modulos.map((m) => (
              <button key={m.id} className={"pnl-item" + (modActiva?.id === m.id ? " on" : "")}
                onClick={() => { setActiva(m.id); setNavAbierto(false); }}>
                <span className="ic">{m.icon}</span> {m.nombre}
              </button>
            ))}
          </nav>
        </aside>

        <main className="pnl-main">
          {modActiva?.id === "dashboard" ? <Dashboard u={u} />
            : modActiva?.id === "usuarios" ? <Usuarios />
            : <Modulo mod={modActiva} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ u }) {
  const primer = (u.nombre || "").trim().split(/\s+/)[0] || "equipo";
  const cards = [
    ["Alumnos activos", "—"], ["Grupos activos", "—"],
    ["Maestros", "—"], ["Casos por resolver", "—"],
  ];
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>Dashboard general</h1>
      <p style={{ color: "var(--gris)", marginBottom: 24 }}>Hola, {primer}. Este es el resumen del programa.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
        {cards.map(([t, v]) => (
          <div key={t} style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--sombra)" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "var(--naranja-osc)", lineHeight: 1, fontFamily: "var(--font-titulo),sans-serif" }}>{v}</div>
            <div style={{ fontSize: 13.5, color: "var(--gris)", marginTop: 6 }}>{t}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 22, fontSize: 13, color: "var(--gris)", fontStyle: "italic" }}>
        Las métricas se conectarán a datos reales cuando construyamos el módulo de Dashboard.
      </p>
    </div>
  );
}

function Modulo({ mod }) {
  if (!mod) return <p style={{ color: "var(--gris)" }}>Tu rol aún no tiene módulos con pantalla.</p>;
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>{mod.icon} {mod.nombre}</h1>
      <p style={{ color: "var(--gris)", marginBottom: 24 }}>{mod.desc}</p>
      <div style={{ background: "#fff", border: "1px dashed rgba(184,101,0,0.4)", borderRadius: 18, padding: "46px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{mod.icon}</div>
        <p style={{ fontWeight: 800, color: "var(--texto)", fontSize: 17 }}>Módulo en construcción</p>
        <p style={{ fontSize: 14, color: "var(--gris)", marginTop: 4 }}>Lo estamos habilitando paso a paso.</p>
      </div>
    </div>
  );
}

function Usuarios() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { tipo:"nuevo"|"editar"|"pass"|"borrar", usuario }

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/usuarios");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los usuarios.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function toggleActivo(us) {
    setError("");
    try {
      const r = await fetch("/api/panel/usuarios", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: us.id, activo: !us.activo }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      cargar();
    } catch (e) { setError(e.message); }
  }

  const puedeG = data?.puede_gestionar;
  const puedeB = data?.puede_borrar;
  const yo = data?.yo;

  return (
    <div>
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>🔑 Usuarios y roles</h1>
          <p style={{ color: "var(--gris)" }}>Da de alta al equipo: administración, maestros, coordinador y agentes.</p>
        </div>
        {puedeG && <button className="u-btn" onClick={() => setModal({ tipo: "nuevo" })}>+ Nuevo usuario</button>}
      </div>

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !data?.usuarios?.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Aún no hay usuarios.</div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.usuarios.map((us) => (
                  <tr key={us.id}>
                    <td style={{ fontWeight: 600 }}>
                      {us.nombre}
                      {us.id === yo && <span style={{ color: "var(--gris)", fontWeight: 400 }}> · tú</span>}
                    </td>
                    <td style={{ color: "var(--gris)" }}>{us.correo}</td>
                    <td><span className="u-rol">{ROL_CORTO[us.rol_codigo] || us.rol_codigo}</span></td>
                    <td><span className={"u-badge " + (us.activo ? "on" : "off")}>{us.activo ? "Activo" : "Inactivo"}</span></td>
                    <td>
                      <div className="u-acts">
                        {puedeG && <button className="u-mini" onClick={() => setModal({ tipo: "editar", usuario: us })}>Editar</button>}
                        {puedeG && <button className="u-mini" onClick={() => setModal({ tipo: "pass", usuario: us })}>Contraseña</button>}
                        {puedeG && us.id !== yo && <button className="u-mini" onClick={() => toggleActivo(us)}>{us.activo ? "Desactivar" : "Activar"}</button>}
                        {puedeB && us.id !== yo && <button className="u-mini dan" onClick={() => setModal({ tipo: "borrar", usuario: us })}>Borrar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <UsuarioModal
          modal={modal}
          roles={data?.roles || []}
          esYo={modal.usuario?.id === yo}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function UsuarioModal({ modal, roles, esYo, onClose, onDone }) {
  const us = modal.usuario || {};
  const [nombre, setNombre] = useState(us.nombre || "");
  const [correo, setCorreo] = useState(us.correo || "");
  const [rol, setRol] = useState(us.rol_codigo || roles[0]?.codigo || "administracion");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const titulos = { nuevo: "Nuevo usuario", editar: "Editar usuario", pass: "Cambiar contraseña", borrar: "Borrar usuario" };

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let r;
      if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, correo, rol, password }) });
      } else if (modal.tipo === "editar") {
        r = await fetch("/api/panel/usuarios", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: us.id, nombre, correo, rol }) });
      } else if (modal.tipo === "pass") {
        r = await fetch("/api/panel/usuarios", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: us.id, password }) });
      } else {
        r = await fetch("/api/panel/usuarios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: us.id }) });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo completar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{titulos[modal.tipo]}</h3>

        {modal.tipo === "borrar" ? (
          <p style={{ color: "var(--gris)", marginTop: 8, fontSize: 14.5 }}>
            ¿Seguro que quieres borrar a <b>{us.nombre}</b>? Esta acción no se puede deshacer. Si tiene registros asociados (grupos, casos, pagos…), mejor <b>desactívalo</b>.
          </p>
        ) : modal.tipo === "pass" ? (
          <>
            <p style={{ color: "var(--gris)", marginTop: 4, fontSize: 14 }}>Nueva contraseña para <b>{us.nombre}</b>.</p>
            <input className="u-inp" type="password" placeholder="Nueva contraseña (mín. 8)" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </>
        ) : (
          <>
            <input className="u-inp" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className="u-inp" type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="off" />
            <select className="u-sel" value={rol} onChange={(e) => setRol(e.target.value)} disabled={esYo && modal.tipo === "editar"}>
              {roles.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
            </select>
            {esYo && modal.tipo === "editar" && <p style={{ color: "var(--gris)", fontSize: 12.5, marginTop: 6 }}>No puedes cambiar tu propio rol.</p>}
            {modal.tipo === "nuevo" && <input className="u-inp" type="password" placeholder="Contraseña (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />}
          </>
        )}

        {error && <div className="u-err">{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className={"u-btn" + (modal.tipo === "borrar" ? " dan" : "")} disabled={busy}>
            {busy ? "…" : modal.tipo === "borrar" ? "Sí, borrar" : modal.tipo === "pass" ? "Cambiar" : modal.tipo === "editar" ? "Guardar" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
