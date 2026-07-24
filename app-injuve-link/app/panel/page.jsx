"use client";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  { id: "misclases", perm: "SESION_VER", nombre: "Mis clases", icon: "🧑‍🏫", desc: "Toma asistencia y entra al Meet de tus clases." },
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

// —— Sistema de iconos (línea, un solo trazo, hereda el color) ——
const ICONS = {
  dashboard: (<><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /></>),
  misclases: (<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4" /><path d="M8 20h8" /><path d="M10.4 8.1l3.4 1.9-3.4 1.9z" /></>),
  inscripciones: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.8 19.4c0-3 2.3-5.2 5.2-5.2 1.2 0 2.3.35 3.2 1" /><path d="M18 7.5v5" /><path d="M15.5 10h5" /></>),
  grupos: (<><circle cx="8.5" cy="9" r="3" /><path d="M2.8 19c0-3.1 2.5-5.3 5.7-5.3 1.4 0 2.6.4 3.6 1.1" /><path d="M15.6 6.4a3 3 0 0 1 .3 5.8" /><path d="M16.6 14c2.6.3 4.6 2.4 4.6 5" /></>),
  maestros: (<><path d="M12 4L2.5 8.5 12 13l9.5-4.5L12 4z" /><path d="M6.5 10.6V15c0 1.6 2.5 2.8 5.5 2.8s5.5-1.2 5.5-2.8v-4.4" /><path d="M21.5 8.5V14" /></>),
  programa: (<><path d="M12 6.6C10.4 5.2 8 4.7 4.2 5.2v12.6c3.8-.5 6.2 0 7.8 1.4" /><path d="M12 6.6c1.6-1.4 4-1.9 7.8-1.4v12.6c-3.8-.5-6.2 0-7.8 1.4" /><path d="M12 6.6v12.4" /></>),
  academico: (<><rect x="5" y="4.5" width="14" height="16.5" rx="2.2" /><path d="M9 4.5V6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4.5" /><path d="M8.6 13.2l2.2 2.2 4.6-4.6" /></>),
  pagos: (<><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><circle cx="12" cy="12" r="2.7" /><path d="M6 9.5v5M18 9.5v5" /></>),
  atencion: (<><path d="M4 13.5v-2a8 8 0 0 1 16 0v2" /><rect x="2.5" y="13" width="4" height="6.2" rx="1.6" /><rect x="17.5" y="13" width="4" height="6.2" rx="1.6" /><path d="M20 19.2c0 1.9-1.8 2.8-4 2.8" /></>),
  solicitudes: (<><path d="M3 13l2.4-6.6A2 2 0 0 1 7.3 5h9.4a2 2 0 0 1 1.9 1.4L21 13" /><path d="M3 13h5l1.4 2.2h5.2L16 13h5v4.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  legal: (<><path d="M12 3.5v17" /><path d="M7 20.5h10" /><path d="M4.8 7h14.4" /><path d="M8.5 4.6L5 7 2.7 12a2.8 2.8 0 0 0 5.6 0L5 7" /><path d="M19 7l-2.3 5a2.8 2.8 0 0 0 5.6 0L19 7" /></>),
  reportes: (<><path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" /><path d="M7.5 15.4l3.2-3.7 2.8 2.3 4-5.1" /><path d="M17.5 6.4H21V10" /></>),
  reportes_pago: (<><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6 15h4" /></>),
  usuarios: (<><circle cx="8" cy="8" r="4.2" /><path d="M11 11.2l8 8" /><path d="M16.5 16.7l1.8-1.8" /><path d="M18.7 18.9l1.8-1.8" /></>),
  menu: (<><path d="M4 7h16M4 12h16M4 17h16" /></>),
  close: (<><path d="M6 6l12 12M18 6L6 18" /></>),
  external: (<><path d="M13.5 5H19v5.5" /><path d="M19 5l-8.5 8.5" /><path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" /></>),
  logout: (<><path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" /><path d="M10 12h10" /><path d="M16.5 8.5L20 12l-3.5 3.5" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>),
  download: (<><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M5 20h14" /></>),
  chevron: (<><path d="M6 9l6 6 6-6" /></>),
  check: (<><path d="M5 12.5l4.5 4.5L19 7" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2.4" /><path d="M3.5 10h17" /><path d="M8 3.2v3.6M16 3.2v3.6" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  dot: (<><circle cx="12" cy="12" r="3" /></>),
};

function Ico({ n, size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[n] || ICONS.dot}
    </svg>
  );
}

// Días de la semana (ISO 1-7) → etiquetas cortas, para el horario de los grupos.
const DIAS_CORTO = { "1": "Lun", "2": "Mar", "3": "Mié", "4": "Jue", "5": "Vie", "6": "Sáb", "7": "Dom" };
function fmtDias(csv) {
  return String(csv || "").split(",").map((s) => s.trim()).filter(Boolean).map((n) => DIAS_CORTO[n] || "").filter(Boolean).join(" · ");
}
// Horario por clase → "Mar 17:00 · Jue 17:00".
function fmtHorario(slots) {
  if (!Array.isArray(slots) || !slots.length) return "";
  return slots.map((s) => `${DIAS_CORTO[String(s.dia)] || ""} ${String(s.hora_inicio || "").slice(0, 5)}`.trim()).join(" · ");
}

// Encabezado de módulo: chip con icono + título + subtítulo (+ acciones a la derecha).
function PageHead({ ico, title, sub, right }) {
  return (
    <div className="pnl-head">
      <div className="pnl-head-l">
        {ico && <span className="pnl-head-ico"><Ico n={ico} size={22} /></span>}
        <div className="pnl-head-tt">
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {right && <div className="pnl-head-r">{right}</div>}
    </div>
  );
}

// Desplegable personalizado (glass, con teclado, no se recorta: el menú va en position:fixed).
function Sel({ value, onChange, options, placeholder = "Elige…", disabled, width, tone = "default", ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const cur = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const repos = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", repos);
    window.addEventListener("scroll", repos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", repos);
      window.removeEventListener("scroll", repos, true);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  }
  function pick(v) { onChange(v); setOpen(false); }

  let menuStyle = null;
  if (rect) {
    const abajo = window.innerHeight - rect.bottom;
    const up = abajo < 260 && rect.top > abajo;
    menuStyle = {
      position: "fixed", left: rect.left, minWidth: rect.width, zIndex: 2000,
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    };
  }

  // El menú va en un portal al <body> para no descolocarse dentro de modales/tarjetas
  // con backdrop-filter (que crean un containing block para position:fixed).
  const menu = open && rect ? (
    <div ref={menuRef} className="sel-menu" role="listbox" style={menuStyle}>
      {options.map((o) => (
        <button type="button" key={String(o.value)} role="option" aria-selected={String(o.value) === String(value)}
          className={"sel-opt" + (String(o.value) === String(value) ? " on" : "")} onClick={() => pick(o.value)}>
          <span>{o.label}</span>
          {String(o.value) === String(value) && <Ico n="check" size={15} />}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={"sel" + (tone === "naranja" ? " t-naranja" : tone === "alerta" ? " t-alerta" : "")} style={width ? { width } : undefined}>
      <button type="button" ref={btnRef} className={"sel-btn" + (open ? " open" : "")} onClick={toggle}
        disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span className={"sel-val" + (cur ? "" : " ph")}>{cur ? cur.label : placeholder}</span>
        <span className="sel-chev"><Ico n="chevron" size={16} /></span>
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

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
        .pnl{--zdrop:1200;--zmbg:600;--zm:601;
          position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;color:var(--texto);
          font-family:var(--font-cuerpo),-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
          background:
            radial-gradient(1100px 520px at 97% -12%, rgba(255,241,222,0.85) 0%, transparent 55%),
            radial-gradient(780px 520px at -8% 112%, rgba(252,228,236,0.5) 0%, transparent 60%),
            #F7F3EC;}
        .pnl svg{display:block;}
        /* —— Barra superior: vidrio claro —— */
        .pnl-top{position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;
          height:62px;padding:0 16px 0 14px;flex-shrink:0;color:var(--texto);
          background:rgba(255,255,255,0.66);
          -webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
          border-bottom:1px solid var(--borde);}
        .pnl-top .brand{display:flex;align-items:center;gap:11px;min-width:0;}
        .pnl-top .brand img{height:28px;width:auto;display:block;}
        .pnl-top .brand b{font-weight:700;font-size:13.5px;color:var(--gris);letter-spacing:.02em;padding-left:11px;border-left:1px solid var(--borde);}
        .pnl-top .der{display:flex;align-items:center;gap:8px;font-size:14px;}
        .pnl-top .der .site{display:inline-flex;align-items:center;gap:6px;color:var(--gris);font-weight:600;padding:7px 11px;border-radius:10px;transition:color .18s,background .18s;}
        .pnl-top .der .site:hover{color:var(--naranja-osc);background:rgba(241,139,17,0.1);}
        .pnl-top .der .quien{color:var(--gris);white-space:nowrap;font-weight:600;padding-right:4px;}
        .pnl-salir{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.9);border:1px solid var(--borde);
          color:var(--texto);border-radius:999px;padding:7px 15px 7px 13px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;
          transition:background .18s,box-shadow .18s,transform .18s;}
        .pnl-salir:hover{background:#fff;box-shadow:var(--sombra);transform:translateY(-1px);}
        .pnl-salir svg{opacity:.65;}
        .pnl-burger{display:none;align-items:center;justify-content:center;background:rgba(255,255,255,0.72);border:1px solid var(--borde);
          color:var(--texto);border-radius:11px;width:38px;height:38px;cursor:pointer;padding:0;}
        .pnl-body{display:flex;flex:1;min-height:0;}
        /* —— Menú lateral: panel esmerilado —— */
        .pnl-aside{width:252px;flex-shrink:0;overflow-y:auto;padding:14px 12px 26px;
          background:rgba(255,255,255,0.42);
          -webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);
          border-right:1px solid var(--borde);}
        .pnl-aside nav{display:grid;gap:2px;}
        .pnl-sec{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--gris);opacity:.7;padding:14px 12px 6px;}
        .pnl-item{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:12px;border:1px solid transparent;
          background:transparent;color:var(--texto);font-weight:550;font-size:14px;cursor:pointer;text-align:left;width:100%;
          font-family:inherit;transition:background .16s var(--ease),color .16s,border-color .16s,box-shadow .16s;}
        .pnl-item:hover{background:rgba(43,33,24,0.055);}
        .pnl-item .ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;color:var(--gris);flex-shrink:0;transition:color .16s;}
        .pnl-item:hover .ic{color:var(--texto);}
        .pnl-item.on{background:rgba(255,255,255,0.92);border-color:var(--borde);color:var(--naranja-osc);font-weight:750;box-shadow:0 6px 16px -10px rgba(184,101,0,0.55);}
        .pnl-item.on .ic{color:var(--naranja);}
        .pnl-main{flex:1;overflow-y:auto;padding:30px 34px 60px;}
        .pnl-overlay{display:none;}
        @media(max-width:860px){
          .pnl-burger{display:inline-flex;}
          .pnl-top .der .quien{display:none;}
          .pnl-top .der .site span{display:none;}
          .pnl-aside{position:fixed;top:62px;left:0;bottom:0;z-index:30;width:274px;transform:translateX(-104%);
            transition:transform .28s var(--ease);box-shadow:var(--sombra-alta);background:rgba(255,255,255,0.92);
            -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);}
          .pnl-aside.abierto{transform:none;}
          .pnl-overlay.abierto{display:block;position:fixed;inset:62px 0 0 0;background:rgba(43,33,24,0.32);
            -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:25;}
          .pnl-main{padding:22px 16px 48px;}
        }
        /* —— Encabezado de módulo —— */
        .pnl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:22px;flex-wrap:wrap;}
        .pnl-head-l{display:flex;align-items:flex-start;gap:13px;min-width:0;}
        .pnl-head-ico{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;flex-shrink:0;
          background:linear-gradient(150deg,rgba(255,255,255,0.95),rgba(255,241,222,0.7));border:1px solid var(--borde);color:var(--naranja-osc);box-shadow:var(--sombra);}
        .pnl-head-tt h1{font-size:26px;font-weight:800;color:var(--negro);letter-spacing:-0.015em;line-height:1.12;}
        .pnl-head-tt p{color:var(--gris);font-size:14px;margin-top:3px;max-width:66ch;}
        .pnl-head-r{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
        .u-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
        /* —— Botones —— */
        .u-btn{display:inline-flex;align-items:center;gap:7px;background:var(--naranja);color:#fff;border:none;border-radius:11px;padding:10px 16px;
          font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;box-shadow:0 10px 22px -12px rgba(241,139,17,0.85);
          transition:background .18s,box-shadow .18s,transform .18s;}
        .u-btn:hover{background:var(--naranja-osc);transform:translateY(-1px);box-shadow:0 14px 26px -12px rgba(184,101,0,0.75);}
        .u-btn:active{transform:translateY(0);}
        .u-btn.sec{background:rgba(255,255,255,0.9);color:var(--texto);border:1px solid var(--borde);box-shadow:none;}
        .u-btn.sec:hover{background:#fff;box-shadow:var(--sombra);}
        .u-btn.dan{background:#B3261E;color:#fff;box-shadow:0 10px 22px -12px rgba(179,38,30,0.8);}
        .u-btn.dan:hover{background:#8f1e18;}
        .u-btn:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none;}
        /* —— Tarjetas y tablas —— */
        .u-card{background:rgba(255,255,255,0.8);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);
          border:1px solid var(--borde);border-radius:var(--r-md);overflow:hidden;box-shadow:var(--sombra);}
        .u-tablewrap{overflow-x:auto;}
        .u-table{width:100%;border-collapse:collapse;font-size:14px;}
        .u-table th{text-align:left;padding:12px 16px;background:rgba(247,243,236,0.72);color:var(--gris);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--borde);white-space:nowrap;}
        .u-table td{padding:12px 16px;border-bottom:1px solid var(--borde);vertical-align:middle;}
        .u-table tbody tr{transition:background .14s;}
        .u-table tbody tr:hover{background:rgba(241,139,17,0.05);}
        .u-table tr:last-child td{border-bottom:none;}
        .u-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;}
        .u-badge.on{background:#E7F5EC;color:#1B7A3D;}
        .u-badge.off{background:#F1EEE9;color:#8A8178;}
        .u-rol{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:var(--naranja-claro);color:var(--naranja-osc);white-space:nowrap;}
        .u-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
        .u-mini{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.82);border:1px solid var(--borde);border-radius:9px;padding:5px 10px;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--texto);font-family:inherit;white-space:nowrap;transition:background .16s,box-shadow .16s;}
        .u-mini:hover{background:#fff;box-shadow:var(--sombra);}
        .u-mini.dan{color:#B3261E;border-color:rgba(179,38,30,.3);}
        .u-mini.dan:hover{background:rgba(179,38,30,.08);}
        /* —— Modales de vidrio —— */
        .u-modal-bg{position:fixed;inset:0;background:rgba(43,33,24,0.34);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);
          display:flex;align-items:center;justify-content:center;z-index:var(--zmbg);padding:16px;animation:pnlfade .2s var(--ease);}
        .u-modal{background:rgba(255,255,255,0.9);-webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);
          border:1px solid rgba(255,255,255,0.6);border-radius:var(--r-lg);padding:24px;width:100%;max-width:440px;box-shadow:var(--sombra-alta);
          z-index:var(--zm);animation:pnlpop .22s var(--ease);}
        .u-modal h3{font-size:20px;font-weight:800;color:var(--negro);margin-bottom:2px;}
        .u-inp,.u-sel{width:100%;padding:11px 13px;border:1px solid var(--borde);border-radius:11px;font-size:14.5px;margin-top:10px;font-family:inherit;background:rgba(255,255,255,0.85);color:var(--texto);transition:border-color .16s,box-shadow .16s;}
        .u-inp:focus,.u-sel:focus{outline:none;border-color:var(--naranja);box-shadow:0 0 0 3px var(--naranja-claro);}
        .u-err{background:rgba(179,38,30,.1);color:#B3261E;border-radius:11px;padding:9px 13px;font-size:13.5px;margin-top:12px;}
        /* —— Desplegable personalizado —— */
        .sel{position:relative;display:inline-block;}
        .sel-btn{display:inline-flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:40px;padding:8px 12px;
          border:1px solid var(--borde);border-radius:11px;background:rgba(255,255,255,0.85);color:var(--texto);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;
          transition:border-color .16s,box-shadow .16s,background .16s;}
        .sel-btn:hover{background:#fff;}
        .sel-btn.open{outline:none;border-color:var(--naranja);box-shadow:0 0 0 3px var(--naranja-claro);}
        .sel-btn:disabled{opacity:.55;cursor:default;}
        .sel-val{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sel-val.ph{color:var(--gris);font-weight:500;}
        .sel-chev{display:inline-flex;color:var(--gris);transition:transform .2s var(--ease);flex-shrink:0;}
        .sel-btn.open .sel-chev{transform:rotate(180deg);}
        .sel.t-naranja .sel-btn{background:var(--naranja-claro);border-color:transparent;color:var(--naranja-osc);font-weight:700;}
        .sel.t-alerta .sel-btn{background:#FDECEC;border-color:transparent;color:#B3261E;font-weight:700;}
        .sel-menu{z-index:var(--zdrop);max-height:302px;overflow-y:auto;padding:6px;border-radius:14px;
          background:rgba(255,255,255,0.86);-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);
          border:1px solid var(--borde);box-shadow:var(--sombra-alta);animation:pnlpop .16s var(--ease);}
        .sel-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 11px;border:none;background:transparent;border-radius:9px;
          font-family:inherit;font-size:14px;font-weight:550;color:var(--texto);cursor:pointer;text-align:left;transition:background .12s;}
        .sel-opt:hover{background:rgba(241,139,17,0.1);}
        .sel-opt.on{color:var(--naranja-osc);font-weight:700;background:var(--naranja-claro);}
        .sel-opt svg{color:var(--naranja);flex-shrink:0;}
        /* —— Pestañas y asistencia —— */
        .pnl-tabs{display:inline-flex;gap:4px;padding:4px;background:rgba(255,255,255,0.6);border:1px solid var(--borde);border-radius:13px;margin-bottom:18px;}
        .pnl-tab{display:inline-flex;align-items:center;gap:7px;border:none;background:transparent;border-radius:9px;padding:8px 15px;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--gris);cursor:pointer;transition:background .16s,color .16s,box-shadow .16s;}
        .pnl-tab:hover{color:var(--texto);}
        .pnl-tab.on{background:#fff;color:var(--naranja-osc);box-shadow:var(--sombra);}
        .pnl-tab .ic{display:inline-flex;}
        .aca-ok{display:inline-flex;align-items:center;gap:7px;background:#E7F5EC;color:#1B7A3D;border-radius:10px;padding:8px 13px;font-size:13.5px;font-weight:600;margin-bottom:14px;}
        .asis-sw{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--borde);background:rgba(255,255,255,0.8);border-radius:999px;padding:5px 13px 5px 7px;font-family:inherit;font-size:13px;font-weight:700;color:var(--gris);cursor:pointer;transition:background .16s,color .16s,border-color .16s;}
        .asis-sw .dotsw{width:17px;height:17px;border-radius:50%;background:#CFC7BC;display:inline-flex;align-items:center;justify-content:center;color:#fff;transition:background .16s;}
        .asis-sw.pres{background:#E7F5EC;border-color:transparent;color:#1B7A3D;}
        .asis-sw.pres .dotsw{background:#1B9048;}
        .asis-sw:disabled{opacity:.55;cursor:default;}
        @keyframes pnlfade{from{opacity:0;}to{opacity:1;}}
        @keyframes pnlpop{from{opacity:0;transform:translateY(6px) scale(.985);}to{opacity:1;transform:none;}}
        .pnl-view{animation:pnlview .34s var(--ease);}
        @keyframes pnlview{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
        .sel-menu{animation:pnlpop .16s var(--ease);}
        @media(prefers-reduced-motion:reduce){.pnl *,.sel-menu{animation:none !important;transition:none !important;}}
      `}</style>

      <header className="pnl-top">
        <div className="brand">
          <button className="pnl-burger" onClick={() => setNavAbierto((s) => !s)} aria-label="Menú"><Ico n="menu" size={20} /></button>
          <img src="/logos/injuve-link.png" alt="INJUVE Link" />
          <b>Panel</b>
        </div>
        <div className="der">
          <a className="site" href="/" target="_blank" rel="noopener noreferrer"><span>Ver sitio</span><Ico n="external" size={16} /></a>
          <span className="quien">{u.nombre} · {ROL_NOMBRE[u.rol] || u.rol}</span>
          <button className="pnl-salir" onClick={onSalir}><Ico n="logout" size={16} /> Salir</button>
        </div>
      </header>

      <div className="pnl-body">
        <div className={"pnl-overlay" + (navAbierto ? " abierto" : "")} onClick={() => setNavAbierto(false)} />
        <aside className={"pnl-aside" + (navAbierto ? " abierto" : "")}>
          <nav>
            {modulos.map((m) => (
              <button key={m.id} className={"pnl-item" + (modActiva?.id === m.id ? " on" : "")}
                onClick={() => { setActiva(m.id); setNavAbierto(false); }}>
                <span className="ic"><Ico n={m.id} size={19} /></span> {m.nombre}
              </button>
            ))}
          </nav>
        </aside>

        <main className="pnl-main">
          <div key={modActiva?.id} className="pnl-view">
            {modActiva?.id === "dashboard" ? <Dashboard u={u} />
              : modActiva?.id === "misclases" ? <MisClases />
              : modActiva?.id === "usuarios" ? <Usuarios />
              : modActiva?.id === "inscripciones" ? <Inscripciones />
              : modActiva?.id === "grupos" ? <Grupos />
              : modActiva?.id === "maestros" ? <Maestros />
              : modActiva?.id === "pagos" ? <Pagos />
              : modActiva?.id === "programa" ? <Programa />
              : modActiva?.id === "academico" ? <Academico />
              : <Modulo mod={modActiva} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ u }) {
  const primer = (u.nombre || "").trim().split(/\s+/)[0] || "equipo";
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/panel/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setErr(true));
  }, []);
  const num = (v) => (d ? Number(v).toLocaleString("es-MX") : err ? "—" : "…");
  const cards = [
    ["Alumnos activos", d && d.alumnos, d ? `${d.en_grupo} en grupo · ${d.sin_grupo} sin grupo` : null],
    ["Grupos activos", d && d.grupos, null],
    ["Maestros", d && d.maestros, null],
    ["Casos por resolver", d && d.casos, null],
  ];
  return (
    <div>
      <PageHead ico="dashboard" title="Dashboard general" sub={`Hola, ${primer}. Este es el resumen del programa.`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
        {cards.map(([t, v, sub]) => (
          <div key={t} style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--sombra)" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "var(--naranja-osc)", lineHeight: 1, fontFamily: "var(--font-titulo),sans-serif" }}>{num(v)}</div>
            <div style={{ fontSize: 13.5, color: "var(--gris)", marginTop: 6 }}>{t}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--gris)", marginTop: 4, opacity: 0.85 }}>{sub}</div>}
          </div>
        ))}
      </div>
      {err && <p style={{ marginTop: 16, fontSize: 13, color: "#B3261E" }}>No se pudieron cargar las métricas.</p>}

      {d && Array.isArray(d.proximas) && d.proximas.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--negro)", marginTop: 34, marginBottom: 2 }}>Próximas clases</h2>
          <p style={{ color: "var(--gris)", marginBottom: 16, fontSize: 14 }}>La siguiente clase de cada grupo, según su horario semanal.</p>
          <div className="u-card">
            <div className="u-tablewrap">
              <table className="u-table">
                <thead><tr><th>Cuándo</th><th>Grupo</th><th>Hora</th><th>Maestro</th><th>Clase</th></tr></thead>
                <tbody>
                  {d.proximas.map((c, i) => {
                    const DIAS_L = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                    const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                    const dt = new Date(c.fecha + "T00:00:00");
                    const hoyMx = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
                    const esHoy = c.fecha === hoyMx;
                    return (
                      <tr key={i} style={esHoy ? { background: "#FFF8EE" } : undefined}>
                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{`${DIAS_L[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}`}{esHoy && <span style={{ color: "var(--naranja-osc)", fontSize: 11, marginLeft: 6, fontWeight: 800 }}>HOY</span>}</td>
                        <td><b>{c.codigo}</b> <span className="u-rol">N{c.nivel}</span></td>
                        <td style={{ color: "var(--gris)" }}>{(c.hora || "").slice(0, 5) || "—"}</td>
                        <td>{c.maestro || "—"}</td>
                        <td>{c.liga_meet ? <a href={c.liga_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a> : <span style={{ color: "var(--gris)" }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {d && Array.isArray(d.grupos_lista) && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--negro)", marginTop: 34, marginBottom: 2 }}>Grupos del programa</h2>
          <p style={{ color: "var(--gris)", marginBottom: 16, fontSize: 14 }}>Maestro, horario e inscritos por grupo activo.</p>
          <div className="u-card">
            <div className="u-tablewrap">
              <table className="u-table">
                <thead>
                  <tr>
                    <th>Grupo</th><th>Nivel</th><th>Maestro</th><th>Horario</th>
                    <th style={{ textAlign: "center" }}>Inscritos</th><th>Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {d.grupos_lista.map((g) => (
                    <tr key={g.codigo}>
                      <td style={{ fontWeight: 700 }}>{g.codigo}</td>
                      <td><span className="u-rol">Nivel {g.nivel}</span></td>
                      <td>{g.maestro || "—"}</td>
                      <td style={{ color: "var(--gris)" }}>
                        {fmtHorario(g.horario_slots)
                          ? <div style={{ color: "var(--texto)", fontWeight: 600 }}>{fmtHorario(g.horario_slots)}</div>
                          : <div style={{ fontSize: 13 }}>{g.horario || "—"}</div>}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {g.inscritos}<span style={{ color: "var(--gris)", fontWeight: 400 }}> / {g.cupo}</span>
                      </td>
                      <td>
                        {g.liga_meet
                          ? <a href={g.liga_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a>
                          : <span style={{ color: "var(--gris)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Inscripciones() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [qActiva, setQActiva] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const p = new URLSearchParams({ q: qActiva, filtro, pagina: String(pagina) });
      const r = await fetch("/api/panel/inscripciones?" + p.toString());
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar las inscripciones.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qActiva, filtro, pagina]);

  function buscar(e) { e.preventDefault(); setPagina(1); setQActiva(q.trim()); }

  async function asignarGrupo(al, grupo) {
    setGuardandoId(al.id); setError("");
    try {
      const r = await fetch("/api/panel/inscripciones", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: al.id, grupo: grupo || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo asignar el grupo.");
      cargar();
    } catch (e) { setError(e.message); setGuardandoId(null); }
  }

  const grupos = data?.grupos || [];
  const total = data?.total || 0;
  const porPagina = data?.por_pagina || 40;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const puedeAsignar = data?.puede_asignar;
  const puedeEditar = data?.puede_editar;

  return (
    <div>
      <PageHead ico="inscripciones" title="Inscripciones" sub="Busca alumnos, asígnales grupo y edita sus datos." />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <form onSubmit={buscar} style={{ display: "flex", gap: 8, flex: "1 1 260px" }}>
          <input className="u-inp" style={{ marginTop: 0, flex: 1 }} placeholder="Buscar por nombre, folio, WhatsApp o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="u-btn" type="submit"><Ico n="search" size={16} /> Buscar</button>
        </form>
        <Sel width={210} value={filtro} onChange={(val) => { setPagina(1); setFiltro(val); }}
          options={[
            { value: "todos", label: "Todos los grupos" },
            { value: "sin_grupo", label: `Sin grupo${data ? ` (${data.sin_grupo})` : ""}` },
            ...grupos.map((g) => ({ value: g.codigo, label: `${g.codigo} · Nivel ${g.nivel}` })),
          ]} />
      </div>

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !data?.rows?.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>No se encontraron alumnos.</div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Alumno</th><th>WhatsApp</th><th>Grupo</th><th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((al) => (
                  <tr key={al.id}>
                    <td style={{ fontWeight: 600 }}>
                      {al.nombre}
                      <div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{al.folio || ""}{al.correo ? ` · ${al.correo}` : ""}</div>
                    </td>
                    <td style={{ color: "var(--gris)" }}>{al.whatsapp || "—"}</td>
                    <td>
                      {puedeAsignar ? (
                        <Sel width={148} tone={al.grupo ? "naranja" : "alerta"} ariaLabel="Grupo del alumno"
                          value={al.grupo || ""} disabled={guardandoId === al.id}
                          onChange={(val) => asignarGrupo(al, val)}
                          options={[{ value: "", label: "Sin grupo" }, ...grupos.map((g) => ({ value: g.codigo, label: `${g.codigo} · N${g.nivel}` }))]} />
                      ) : al.grupo ? <span className="u-rol">{al.grupo}</span> : <span className="u-badge off">Sin grupo</span>}
                    </td>
                    <td>
                      <span className="u-badge" style={al.estado === "asignada" ? { background: "#E7F5EC", color: "#1B7A3D" } : { background: "var(--naranja-claro)", color: "var(--naranja-osc)" }}>{al.estado || "—"}</span>
                    </td>
                    <td>
                      <div className="u-acts">
                        {puedeEditar && <button className="u-mini" onClick={() => setModal(al)}>Editar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13.5, color: "var(--gris)" }}>{total.toLocaleString("es-MX")} alumno(s) · página {pagina} de {totalPaginas}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="u-mini" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>← Anterior</button>
            <button className="u-mini" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}

      {modal && (
        <InscripcionModal
          alumno={modal}
          grupos={grupos}
          puedeAsignar={puedeAsignar}
          puedeEstado={data?.puede_estado}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function InscripcionModal({ alumno, grupos, puedeAsignar, puedeEstado, onClose, onDone }) {
  const [v, setV] = useState({
    nombre: alumno.nombre || "", correo: alumno.correo || "", whatsapp: alumno.whatsapp || "",
    municipio: alumno.municipio || "", colonia: alumno.colonia || "", sexo: alumno.sexo || "",
    grupo: alumno.grupo || "", estado: alumno.estado || "asignada", notas_admin: alumno.notas_admin || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function guardar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = {
        id: alumno.id,
        nombre: v.nombre, correo: v.correo, whatsapp: v.whatsapp,
        municipio: v.municipio, colonia: v.colonia, sexo: v.sexo, notas_admin: v.notas_admin,
      };
      if (puedeAsignar) body.grupo = v.grupo || null;
      if (puedeEstado) body.estado = v.estado;
      const r = await fetch("/api/panel/inscripciones", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>Editar alumno</h3>
        <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>{alumno.folio}</p>
        <input className="u-inp" placeholder="Nombre completo" value={v.nombre} onChange={set("nombre")} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="u-inp" style={{ flex: "1 1 200px" }} type="email" placeholder="Correo" value={v.correo} onChange={set("correo")} />
          <input className="u-inp" style={{ flex: "1 1 160px" }} placeholder="WhatsApp" value={v.whatsapp} onChange={set("whatsapp")} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="u-inp" style={{ flex: "1 1 160px" }} placeholder="Municipio" value={v.municipio} onChange={set("municipio")} />
          <input className="u-inp" style={{ flex: "1 1 160px" }} placeholder="Colonia" value={v.colonia} onChange={set("colonia")} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {puedeAsignar && (
            <div style={{ flex: "1 1 200px" }}>
              <Sel width="100%" value={v.grupo} onChange={(val) => setV((s) => ({ ...s, grupo: val }))}
                options={[{ value: "", label: "Sin grupo" }, ...grupos.map((g) => ({ value: g.codigo, label: `${g.codigo} · Nivel ${g.nivel} · ${g.maestro}` }))]} />
            </div>
          )}
          {puedeEstado && (
            <div style={{ flex: "1 1 130px" }}>
              <Sel width="100%" value={v.estado} onChange={(val) => setV((s) => ({ ...s, estado: val }))}
                options={[{ value: "asignada", label: "asignada" }, { value: "pagada", label: "pagada" }]} />
            </div>
          )}
        </div>
        <textarea className="u-inp" placeholder="Notas del administrador" value={v.notas_admin} onChange={set("notas_admin")} rows={2} style={{ resize: "vertical" }} />
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : "Guardar cambios"}</button>
        </div>
      </form>
    </div>
  );
}

function Grupos() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [togId, setTogId] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/grupos");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los grupos.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function toggleActivo(g) {
    setTogId(g.id); setError("");
    try {
      const r = await fetch("/api/panel/grupos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id, activo: !g.activo }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      cargar();
    } catch (e) { setError(e.message); }
    setTogId(null);
  }

  const rows = data?.rows || [];
  const puedeEditar = data?.puede_editar || data?.puede_maestro;
  const puedeActivar = data?.puede_activar;
  const puedeCrear = data?.puede_crear;
  const puedeBorrar = data?.puede_borrar;

  return (
    <div>
      <PageHead ico="grupos" title="Grupos" sub="Maestro, horario, cupo y liga de Meet de cada grupo."
        right={puedeCrear && <button className="u-btn" onClick={() => setModal({ tipo: "nuevo" })}><Ico n="plus" size={16} /> Nuevo grupo</button>} />

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Sin grupos.</div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Grupo</th><th>Nivel</th><th>Maestro</th><th>Horario</th>
                  <th style={{ textAlign: "center" }}>Inscritos</th><th>Clase</th><th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} style={{ opacity: g.activo ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 700 }}>{g.codigo}</td>
                    <td><span className="u-rol">{g.nivel || "—"}</span></td>
                    <td>{g.maestro || "—"}{g.maestro_id && <span title="Cuenta de maestro vinculada" style={{ color: "#1B7A3D", marginLeft: 5 }}>●</span>}</td>
                    <td style={{ color: "var(--gris)", fontSize: 13 }}>
                      {fmtDias(g.dias) && <div style={{ color: "var(--texto)", fontWeight: 600 }}>{fmtDias(g.dias)}</div>}
                      <div>{g.horario || "—"}</div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{g.inscritos}<span style={{ color: "var(--gris)", fontWeight: 400 }}> / {g.cupo}</span></td>
                    <td>{g.liga_meet ? <a href={g.liga_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a> : <span style={{ color: "var(--gris)" }}>—</span>}</td>
                    <td><span className={"u-badge " + (g.activo ? "on" : "off")}>{g.activo ? "Activo" : "Inactivo"}</span></td>
                    <td>
                      <div className="u-acts">
                        {puedeEditar && <button className="u-mini" onClick={() => setModal({ tipo: "editar", grupo: g })}>Editar</button>}
                        {puedeActivar && <button className="u-mini" onClick={() => toggleActivo(g)} disabled={togId === g.id}>{g.activo ? "Desactivar" : "Activar"}</button>}
                        {puedeBorrar && <button className="u-mini dan" onClick={() => setModal({ tipo: "borrar", grupo: g })}>Borrar</button>}
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
        <GrupoModal
          modal={modal}
          maestros={data?.maestros || []}
          periodos={data?.periodos || []}
          puedeMaestro={data?.puede_maestro}
          puedeEditar={data?.puede_editar}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function GrupoModal({ modal, maestros, periodos, puedeMaestro, puedeEditar, onClose, onDone }) {
  const g = modal.grupo || {};
  const [v, setV] = useState({
    codigo: g.codigo || "", periodo: g.periodo || periodos[0] || "JUL-2026",
    nivel: g.nivel || "", maestro: g.maestro || "", horario: g.horario || "",
    cupo: g.cupo != null ? String(g.cupo) : "", liga_meet: g.liga_meet || "",
  });
  const [clases, setClases] = useState(() => {
    const src = Array.isArray(g.horario_slots) ? g.horario_slots : [];
    if (src.length) return src.map((s) => ({ dia: String(s.dia), hora: String(s.hora_inicio || "").slice(0, 5), dur: String(s.duracion_horas ?? "2") }));
    return [{ dia: "", hora: "", dur: "2" }];
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const setClase = (i, k, val) => setClases((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: val } : c)));
  const setModalidad = (n) => setClases((cs) => {
    if (n === cs.length) return cs;
    if (n < cs.length) return cs.slice(0, n);
    const add = [];
    for (let k = cs.length; k < n; k++) add.push({ dia: "", hora: "", dur: "2" });
    return [...cs, ...add];
  });
  const titulos = { nuevo: "Nuevo grupo", editar: "Editar grupo", borrar: "Borrar grupo" };
  const DIAS_OPC = [["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"], ["5", "Viernes"], ["6", "Sábado"], ["7", "Domingo"]].map(([value, label]) => ({ value, label }));

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const horario_slots = clases.filter((c) => c.dia && c.hora).map((c) => ({ dia: Number(c.dia), hora: c.hora, dur: Number(c.dur) || 2 }));
      let r;
      if (modal.tipo === "borrar") {
        r = await fetch("/api/panel/grupos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
      } else if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: v.codigo, periodo: v.periodo, nivel: v.nivel, maestro: v.maestro, horario: v.horario, cupo: v.cupo, liga_meet: v.liga_meet, horario_slots }) });
      } else {
        const body = { id: g.id };
        if (puedeEditar) { body.nivel = v.nivel; body.horario = v.horario; body.cupo = v.cupo; body.liga_meet = v.liga_meet; body.horario_slots = horario_slots; }
        if (puedeMaestro) { body.maestro = v.maestro; }
        r = await fetch("/api/panel/grupos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo completar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{titulos[modal.tipo]}</h3>
        {modal.tipo === "borrar" ? (
          <p style={{ color: "var(--gris)", marginTop: 8, fontSize: 14.5 }}>
            ¿Seguro que quieres borrar el grupo <b>{g.codigo}</b>? Si tiene alumnos asignados no se podrá borrar; en ese caso, mejor <b>desactívalo</b>.
          </p>
        ) : (
          <>
            {modal.tipo === "nuevo"
              ? <input className="u-inp" placeholder="Código (ej. G16)" value={v.codigo} onChange={set("codigo")} />
              : <input className="u-inp" value={v.codigo} disabled style={{ opacity: 0.6 }} />}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="u-inp" style={{ flex: "1 1 140px" }} placeholder="Nivel (ej. 1 y 2)" value={v.nivel} onChange={set("nivel")} />
              <input className="u-inp" style={{ flex: "1 1 100px" }} type="number" min="0" placeholder="Cupo" value={v.cupo} onChange={set("cupo")} />
            </div>
            <input className="u-inp" placeholder="Maestro" value={v.maestro} onChange={set("maestro")} list="lista-maestros" />
            <datalist id="lista-maestros">{maestros.map((m) => <option key={m} value={m} />)}</datalist>
            <input className="u-inp" placeholder="Horario (texto que ve el alumno, ej. 5:00 pm - 7:00 pm)" value={v.horario} onChange={set("horario")} />

            <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13, color: "var(--texto)" }}>Clases de la semana <span style={{ fontWeight: 400, color: "var(--gris)" }}>(día y hora de cada clase; alimenta el calendario y el pago)</span></div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[1, 2].map((n) => (
                <button type="button" key={n} onClick={() => setModalidad(n)}
                  style={{ padding: "7px 13px", borderRadius: 999, border: "1px solid var(--borde)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background: clases.length === n ? "var(--naranja)" : "rgba(255,255,255,0.8)", color: clases.length === n ? "#fff" : "var(--texto)" }}>
                  {n === 1 ? "1 clase / semana" : "2 clases / semana"}
                </button>
              ))}
            </div>
            {clases.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8, background: "rgba(43,33,24,0.03)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ flex: "1 1 130px" }}>
                  <div style={{ fontSize: 11.5, color: "var(--gris)", marginBottom: 3, fontWeight: 600 }}>Clase {i + 1} · día</div>
                  <Sel width="100%" placeholder="Día…" ariaLabel={"Día clase " + (i + 1)} value={c.dia} onChange={(val) => setClase(i, "dia", val)} options={DIAS_OPC} />
                </div>
                <label style={{ flex: "0 0 104px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Hora
                  <input className="u-inp" style={{ marginTop: 3 }} type="time" value={c.hora} onChange={(e) => setClase(i, "hora", e.target.value)} />
                </label>
                <label style={{ flex: "0 0 84px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Horas
                  <input className="u-inp" style={{ marginTop: 3 }} type="number" min="0.5" step="0.5" value={c.dur} onChange={(e) => setClase(i, "dur", e.target.value)} />
                </label>
              </div>
            ))}

            <input className="u-inp" style={{ marginTop: 10 }} placeholder="Liga de Google Meet (https://…)" value={v.liga_meet} onChange={set("liga_meet")} />
          </>
        )}
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className={"u-btn" + (modal.tipo === "borrar" ? " dan" : "")} disabled={busy}>
            {busy ? "…" : modal.tipo === "borrar" ? "Sí, borrar" : modal.tipo === "nuevo" ? "Crear grupo" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Maestros() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/maestros");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los maestros.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  const rows = data?.rows || [];

  return (
    <div>
      <PageHead ico="maestros" title="Maestros" sub="Carga docente, teléfono y cotización por nivel. Los maestros se dan de alta en Usuarios y roles." />

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Aún no hay maestros. Créalos en Usuarios y roles.</div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Maestro</th><th>Teléfono</th><th>Grupos</th>
                  <th style={{ textAlign: "center" }}>Alumnos</th><th>Niveles</th><th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} style={{ opacity: m.activo ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>{m.nombre}<div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{m.correo}</div></td>
                    <td style={{ color: "var(--gris)" }}>{m.telefono || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{m.grupos.length ? m.grupos.map((g) => g.codigo).join(", ") : <span style={{ color: "var(--gris)", fontWeight: 400 }}>—</span>}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{m.alumnos}</td>
                    <td>{m.niveles.length ? m.niveles.map((n) => <span key={n} className="u-rol" style={{ marginRight: 4 }}>{n}</span>) : <span style={{ color: "var(--gris)" }}>—</span>}</td>
                    <td><span className={"u-badge " + (m.activo ? "on" : "off")}>{m.activo ? "Activo" : "Inactivo"}</span></td>
                    <td><div className="u-acts"><button className="u-mini" onClick={() => setModal(m)}>Ver perfil</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <MaestroModal
          maestro={modal}
          niveles={data?.niveles || []}
          puedeEditar={data?.puede_editar}
          puedeCotizar={data?.puede_cotizar}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function MaestroModal({ maestro, niveles, puedeEditar, puedeCotizar, onClose, onDone }) {
  const [tel, setTel] = useState(maestro.telefono || "");
  const [cot, setCot] = useState(() => {
    const o = {};
    (niveles || []).forEach((n) => { o[n] = maestro.cotizaciones && maestro.cotizaciones[n] != null ? String(maestro.cotizaciones[n]) : ""; });
    return o;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setNivel = (n) => (e) => setCot((s) => ({ ...s, [n]: e.target.value }));

  async function guardar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = { id: maestro.id };
      if (puedeEditar) body.telefono = tel;
      if (puedeCotizar) {
        const c = {};
        for (const n of niveles) { const v = cot[n]; if (v !== "" && v != null) c[n] = Number(v); }
        body.cotizaciones = c;
      }
      const r = await fetch("/api/panel/maestros", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  const totalMensual = niveles.reduce((s, n) => { const v = Number(cot[n]); return s + (isNaN(v) ? 0 : v); }, 0);

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>{maestro.nombre}</h3>
        <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>{maestro.correo}</p>

        <div style={{ marginTop: 14, marginBottom: 6, fontWeight: 700, fontSize: 13.5 }}>Grupos que imparte</div>
        {maestro.grupos.length === 0 ? (
          <p style={{ color: "var(--gris)", fontSize: 13.5 }}>Sin grupos asignados.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {maestro.grupos.map((g) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "#FAF7F2", borderRadius: 8, padding: "7px 11px", fontSize: 13.5 }}>
                <span><b>{g.codigo}</b> · Nivel {g.nivel}</span>
                <span style={{ color: "var(--gris)" }}>{g.horario || "—"} · {g.inscritos} alumnos</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, marginBottom: 2, fontWeight: 700, fontSize: 13.5 }}>Teléfono / WhatsApp</div>
        <input className="u-inp" style={{ marginTop: 4 }} placeholder="Teléfono" value={tel} onChange={(e) => setTel(e.target.value)} disabled={!puedeEditar} />

        {puedeCotizar && niveles.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 2, fontWeight: 700, fontSize: 13.5 }}>Cotización por nivel (mensual)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 6 }}>
              {niveles.map((n) => (
                <label key={n} style={{ fontSize: 12.5, color: "var(--gris)" }}>Nivel {n}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <span style={{ color: "var(--gris)" }}>$</span>
                    <input className="u-inp" style={{ marginTop: 0 }} type="number" min="0" step="0.01" placeholder="0" value={cot[n]} onChange={setNivel(n)} />
                  </div>
                </label>
              ))}
            </div>
            <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--gris)" }}>Suma de todos los niveles: <b>${totalMensual.toLocaleString("es-MX")}</b></p>
          </>
        )}

        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cerrar</button>
          {(puedeEditar || puedeCotizar) && <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : "Guardar"}</button>}
        </div>
      </form>
    </div>
  );
}

function Pagos() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("JUL-2026");
  const [detalle, setDetalle] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/pagos?periodo=" + encodeURIComponent(periodo));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los pagos.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo]);

  async function marcar(p, estado) {
    setError("");
    try {
      const r = await fetch("/api/panel/pagos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maestro_id: p.maestro_id, periodo, estado, monto: p.monto }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      cargar();
    } catch (e) { setError(e.message); }
  }

  const rows = data?.rows || [];
  const puede = data?.puede_procesar;
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");

  return (
    <div>
      <PageHead ico="pagos" title="Pago a maestros" sub={`Calculado desde la asistencia: horas impartidas × $${data?.tarifa_hora || 200}.`}
        right={<Sel width={150} ariaLabel="Periodo" value={periodo} onChange={(val) => setPeriodo(val)}
          options={(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => ({ value: p, label: p }))} />} />

      {data && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 18 }}>
          {[["Total del periodo", data.total, "var(--naranja-osc)"], ["Pagado", data.pagado, "#1B7A3D"], ["Pendiente", data.pendiente, "#B3261E"]].map(([t, v, c]) => (
            <div key={t} style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--sombra)" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c, fontFamily: "var(--font-titulo),sans-serif" }}>{money(v)}</div>
              <div style={{ fontSize: 13, color: "var(--gris)", marginTop: 3 }}>{t}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>
            Aún no hay clases impartidas en {periodo}. El pago aparece automáticamente cuando los maestros toman asistencia.
          </div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr><th>Maestro</th><th style={{ textAlign: "center" }}>Clases</th><th style={{ textAlign: "center" }}>Horas</th><th>Monto</th><th>Estado</th><th style={{ textAlign: "right" }}>Acción</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.maestro_id}>
                    <td style={{ fontWeight: 600 }}>{p.maestro}</td>
                    <td style={{ textAlign: "center" }}>{p.clases}</td>
                    <td style={{ textAlign: "center" }}>{p.horas} h</td>
                    <td style={{ fontWeight: 700 }}>{money(p.monto)}</td>
                    <td><span className="u-badge" style={p.estado === "pagado" ? { background: "#E7F5EC", color: "#1B7A3D" } : { background: "var(--naranja-claro)", color: "var(--naranja-osc)" }}>{p.estado}</span></td>
                    <td>
                      <div className="u-acts">
                        <button className="u-mini" onClick={() => setDetalle(p)}>Ver detalle</button>
                        {puede && <button className="u-mini" onClick={() => marcar(p, p.estado === "pagado" ? "pendiente" : "pagado")}>{p.estado === "pagado" ? "Marcar pendiente" : "Marcar pagado"}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalle && <ReporteMaestroModal pago={detalle} periodo={periodo} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function ReporteMaestroModal({ pago, periodo, onClose }) {
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
  const detalle = pago.detalle || [];
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtF = (f) => { const dt = new Date(f + "T00:00:00"); return DIAS[dt.getDay()] + " " + dt.getDate() + " " + MES[dt.getMonth()]; };

  function descargar() {
    const filas = [["Fecha", "Grupo", "Nivel", "Horas", "Monto"]];
    detalle.forEach((d) => filas.push([d.fecha, d.grupo, d.nivel, d.horas, d.monto]));
    filas.push(["", "", "TOTAL", pago.horas, pago.monto]);
    const csv = filas.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_" + (pago.maestro || "maestro").replace(/\s+/g, "_") + "_" + periodo + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <div className="u-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <h3>{pago.maestro}</h3>
            <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>Clases impartidas · {periodo}</p>
          </div>
          <button className="u-btn sec" onClick={descargar}>⬇ Descargar</button>
        </div>

        <div style={{ display: "flex", gap: 18, margin: "12px 0 14px" }}>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{pago.clases}</b> <span style={{ color: "var(--gris)", fontSize: 13 }}>clases</span></div>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{pago.horas}</b> <span style={{ color: "var(--gris)", fontSize: 13 }}>horas</span></div>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{money(pago.monto)}</b></div>
        </div>

        <div className="u-tablewrap" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="u-table">
            <thead><tr><th>Fecha</th><th>Grupo</th><th>Nivel</th><th style={{ textAlign: "center" }}>Horas</th><th>Monto</th></tr></thead>
            <tbody>
              {detalle.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gris)", padding: 20 }}>Sin clases impartidas.</td></tr>
                : detalle.map((d, i) => (
                  <tr key={i}>
                    <td style={{ textTransform: "capitalize" }}>{fmtF(d.fecha)}</td>
                    <td style={{ fontWeight: 700 }}>{d.grupo}</td>
                    <td><span className="u-rol">{d.nivel}</span></td>
                    <td style={{ textAlign: "center" }}>{d.horas}</td>
                    <td style={{ fontWeight: 600 }}>{money(d.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="u-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function MisClases() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("JUL-2026");
  const [busy, setBusy] = useState(false);
  const [accId, setAccId] = useState(null);
  const [reprog, setReprog] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/sesiones?periodo=" + encodeURIComponent(periodo));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar las clases.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo]);

  async function generar() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/panel/sesiones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodo }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron generar las clases.");
      cargar();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function asistencia(s, estado) {
    setAccId(s.id); setError("");
    try {
      const r = await fetch("/api/panel/sesiones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, estado }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo registrar.");
      cargar();
    } catch (e) { setError(e.message); }
    setAccId(null);
  }

  const rows = data?.rows || [];
  const hoyStr = new Date().toISOString().slice(0, 10);
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtFecha = (f) => { const dt = new Date(f + "T00:00:00"); return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}`; };

  return (
    <div>
      <PageHead ico="misclases" title="Mis clases" sub="Toma asistencia al iniciar tu clase y entra al Meet."
        right={<>
          <Sel width={150} ariaLabel="Periodo" value={periodo} onChange={(val) => setPeriodo(val)}
            options={(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => ({ value: p, label: p }))} />
          {data?.puede_generar && <button className="u-btn" onClick={generar} disabled={busy}>{busy ? "…" : <><Ico n="calendar" size={16} /> Generar clases del periodo</>}</button>}
        </>} />

      {data?.puede_generar && (
        <p style={{ color: "var(--gris)", fontSize: 13, marginBottom: 12 }}>
          Administración: total de clases del periodo (todos los grupos): <b>{data.total_periodo}</b>. Aquí abajo solo aparecen las tuyas.
        </p>
      )}
      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>
            No tienes clases en este periodo.{data?.puede_generar ? " Genera el calendario, o revisa que los grupos tengan horario semanal y maestro asignado." : ""}
          </div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr><th>Fecha</th><th>Hora</th><th>Grupo</th><th>Duración</th><th>Estado</th><th style={{ textAlign: "right" }}>Acción</th></tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const esHoy = s.fecha === hoyStr;
                  return (
                    <tr key={s.id} style={esHoy ? { background: "#FFF8EE" } : undefined}>
                      <td style={{ fontWeight: esHoy ? 800 : 600 }}>
                        {fmtFecha(s.fecha)}{esHoy && <span style={{ color: "var(--naranja-osc)", fontSize: 11, marginLeft: 6, fontWeight: 800 }}>HOY</span>}
                      </td>
                      <td style={{ color: "var(--gris)" }}>{(s.hora || "").slice(0, 5)}</td>
                      <td><b>{s.grupo}</b> · N{s.nivel}</td>
                      <td>{s.duracion_horas} h</td>
                      <td>
                        <span className="u-badge" style={s.estado === "impartida" ? { background: "#E7F5EC", color: "#1B7A3D" } : s.estado === "reprogramada" ? { background: "#E6EEF9", color: "#2D5FA6" } : { background: "var(--naranja-claro)", color: "var(--naranja-osc)" }}>{s.estado}</span>
                      </td>
                      <td>
                        <div className="u-acts">
                          {s.link_meet && <a className="u-mini" href={s.link_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a>}
                          {s.estado !== "impartida"
                            ? <button className="u-mini" style={{ background: "var(--naranja)", color: "#fff", border: "none" }} disabled={accId === s.id} onClick={() => asistencia(s, "impartida")}>Tomar asistencia</button>
                            : <button className="u-mini" disabled={accId === s.id} onClick={() => asistencia(s, "programada")}>Deshacer</button>}
                          {s.estado !== "impartida" && <button className="u-mini" onClick={() => setReprog(s)}>Reprogramar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reprog && <ReprogramarModal sesion={reprog} onClose={() => setReprog(null)} onDone={() => { setReprog(null); cargar(); }} />}
    </div>
  );
}

function ReprogramarModal({ sesion, onClose, onDone }) {
  const [fecha, setFecha] = useState(sesion.fecha || "");
  const [hora, setHora] = useState((sesion.hora || "").slice(0, 5));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function guardar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const r = await fetch("/api/panel/sesiones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sesion.id, fecha, hora }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo reprogramar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>Reprogramar clase</h3>
        <p style={{ color: "var(--gris)", fontSize: 13.5, marginTop: 4 }}>Grupo <b>{sesion.grupo}</b>. Los alumnos verán la nueva fecha en su portal.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 150px", fontSize: 12, color: "var(--gris)" }}>Nueva fecha
            <input className="u-inp" style={{ marginTop: 3 }} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label style={{ flex: "1 1 110px", fontSize: 12, color: "var(--gris)" }}>Nueva hora
            <input className="u-inp" style={{ marginTop: 3 }} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : "Reprogramar"}</button>
        </div>
      </form>
    </div>
  );
}

function Programa() {
  const [data, setData] = useState(null);
  const [group, setGroup] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/programa" + (group ? "?group=" + encodeURIComponent(group) : ""));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cargar el programa.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [group]);

  const grupos = data?.grupos || [];
  const modulos = data?.modulos || [];
  const puede = data?.puede_config;
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtF = (f) => { if (!f) return "—"; const dt = new Date(f + "T00:00:00"); return dt.getDate() + " " + MES[dt.getMonth()]; };

  return (
    <div>
      <PageHead ico="programa" title="Programa y clases" sub="Los módulos del currículo de cada grupo (temas y fechas)."
        right={<>
          <Sel width={210} placeholder="Elige un grupo…" ariaLabel="Grupo" value={group} onChange={(val) => setGroup(val)}
            options={grupos.map((g) => ({ value: g.id, label: `${g.codigo} · Nivel ${g.nivel}` }))} />
          {puede && group && <button className="u-btn" onClick={() => setModal({ tipo: "nuevo" })}><Ico n="plus" size={16} /> Nuevo módulo</button>}
        </>} />

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      {!group ? (
        <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Elige un grupo para ver y editar su programa.</div></div>
      ) : (
        <div className="u-card">
          {cargando ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
          ) : !modulos.length ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Este grupo aún no tiene módulos.{puede ? " Agrega el primero con “+ Nuevo módulo”." : ""}</div>
          ) : (
            <div className="u-tablewrap">
              <table className="u-table">
                <thead>
                  <tr><th style={{ width: 40 }}>#</th><th>Módulo</th><th>Temas</th><th>Fechas</th>{puede && <th style={{ textAlign: "right" }}>Acciones</th>}</tr>
                </thead>
                <tbody>
                  {modulos.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700, color: "var(--gris)" }}>{m.orden}</td>
                      <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                      <td style={{ color: "var(--gris)", fontSize: 13, maxWidth: 340 }}>{m.temas || "—"}</td>
                      <td style={{ color: "var(--gris)", fontSize: 13, whiteSpace: "nowrap" }}>{fmtF(m.fecha_inicio)} – {fmtF(m.fecha_fin)}</td>
                      {puede && (
                        <td>
                          <div className="u-acts">
                            <button className="u-mini" onClick={() => setModal({ tipo: "editar", modulo: m })}>Editar</button>
                            <button className="u-mini dan" onClick={() => setModal({ tipo: "borrar", modulo: m })}>Borrar</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && <ProgramaModuloModal modal={modal} groupId={group} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
    </div>
  );
}

function ProgramaModuloModal({ modal, groupId, onClose, onDone }) {
  const m = modal.modulo || {};
  const [v, setV] = useState({
    nombre: m.nombre || "", orden: m.orden != null ? String(m.orden) : "", temas: m.temas || "",
    fecha_inicio: m.fecha_inicio || "", fecha_fin: m.fecha_fin || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const titulos = { nuevo: "Nuevo módulo", editar: "Editar módulo", borrar: "Borrar módulo" };

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let r;
      if (modal.tipo === "borrar") {
        r = await fetch("/api/panel/programa", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id }) });
      } else if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/programa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: groupId, nombre: v.nombre, orden: v.orden, temas: v.temas, fecha_inicio: v.fecha_inicio, fecha_fin: v.fecha_fin }) });
      } else {
        r = await fetch("/api/panel/programa", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, nombre: v.nombre, orden: v.orden, temas: v.temas, fecha_inicio: v.fecha_inicio, fecha_fin: v.fecha_fin }) });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo completar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{titulos[modal.tipo]}</h3>
        {modal.tipo === "borrar" ? (
          <p style={{ color: "var(--gris)", marginTop: 8, fontSize: 14.5 }}>¿Seguro que quieres borrar el módulo <b>{m.nombre}</b>?</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="u-inp" style={{ flex: "1 1 200px" }} placeholder="Nombre del módulo" value={v.nombre} onChange={set("nombre")} />
              <input className="u-inp" style={{ flex: "0 0 90px" }} type="number" min="0" placeholder="Orden" value={v.orden} onChange={set("orden")} />
            </div>
            <textarea className="u-inp" placeholder="Temas que cubre" value={v.temas} onChange={set("temas")} rows={3} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ flex: "1 1 130px", fontSize: 12, color: "var(--gris)" }}>Inicio<input className="u-inp" style={{ marginTop: 3 }} type="date" value={v.fecha_inicio} onChange={set("fecha_inicio")} /></label>
              <label style={{ flex: "1 1 130px", fontSize: 12, color: "var(--gris)" }}>Fin<input className="u-inp" style={{ marginTop: 3 }} type="date" value={v.fecha_fin} onChange={set("fecha_fin")} /></label>
            </div>
          </>
        )}
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className={"u-btn" + (modal.tipo === "borrar" ? " dan" : "")} disabled={busy}>{busy ? "…" : modal.tipo === "borrar" ? "Sí, borrar" : modal.tipo === "nuevo" ? "Crear" : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

function Academico() {
  const [data, setData] = useState(null);
  const [group, setGroup] = useState("");
  const [tab, setTab] = useState("asistencia"); // asistencia | calificaciones
  const [sesion, setSesion] = useState("");
  const [modulo, setModulo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [presentes, setPresentes] = useState({});
  const [grades, setGrades] = useState({});
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const qs = new URLSearchParams();
      if (group) qs.set("group", group);
      if (tab === "asistencia" && sesion) qs.set("sesion", sesion);
      if (tab === "calificaciones" && modulo) qs.set("modulo", modulo);
      const r = await fetch("/api/panel/academico?" + qs.toString());
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cargar.");
      setData(d);
      const roster = d.alumnos || [];
      if (d.sesion) {
        const map = d.asistencia || {};
        const hay = Object.keys(map).length > 0;
        const p = {};
        roster.forEach((a) => { p[a.enrollment_id] = a.enrollment_id in map ? !!map[a.enrollment_id] : !hay; });
        setPresentes(p);
      }
      if (d.modulo) {
        const map = d.calificaciones || {};
        const g = {};
        roster.forEach((a) => { const c = map[a.enrollment_id]; g[a.enrollment_id] = { calificacion: c && c.calificacion != null ? String(c.calificacion) : "", comentario: (c && c.comentario) || "" }; });
        setGrades(g);
      }
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [group, sesion, modulo, tab]);

  function elegirGrupo(v) { setGroup(v); setSesion(""); setModulo(""); setPresentes({}); setGrades({}); setOk(""); setError(""); }
  function cambiarTab(t) { if (t === tab) return; setTab(t); setOk(""); setError(""); }

  const grupos = data?.grupos || [];
  const roster = data?.alumnos || [];
  const sesiones = data?.sesiones || [];
  const modulos = data?.modulos || [];
  const puedeAsist = data?.puede_asist;
  const puedeCalif = data?.puede_calif;

  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fSes = (s) => { const dt = new Date(s.fecha + "T00:00:00"); return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}${s.hora ? " · " + s.hora.slice(0, 5) : ""}`; };
  const nPres = roster.reduce((n, a) => n + (presentes[a.enrollment_id] ? 1 : 0), 0);

  function togglePres(id) { setPresentes((s) => ({ ...s, [id]: !s[id] })); setOk(""); }
  function todos(val) { const p = {}; roster.forEach((a) => { p[a.enrollment_id] = val; }); setPresentes(p); setOk(""); }
  function setGrade(id, k, val) { setGrades((s) => ({ ...s, [id]: { ...(s[id] || { calificacion: "", comentario: "" }), [k]: val } })); setOk(""); }

  async function guardarAsistencia() {
    setBusy(true); setError(""); setOk("");
    try {
      const registros = roster.map((a) => ({ enrollment_id: a.enrollment_id, presente: !!presentes[a.enrollment_id] }));
      const r = await fetch("/api/panel/academico", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: group, sesion_id: sesion, registros }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      setOk(`Asistencia guardada: ${d.presentes} presente(s) de ${d.total}.`);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function guardarCalif() {
    setBusy(true); setError(""); setOk("");
    try {
      const registros = roster.map((a) => ({ enrollment_id: a.enrollment_id, calificacion: grades[a.enrollment_id]?.calificacion ?? "", comentario: grades[a.enrollment_id]?.comentario ?? "" }));
      const r = await fetch("/api/panel/academico", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: group, modulo_id: modulo, registros }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      setOk(`Calificaciones guardadas (${d.guardadas}).`);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function descargar() {
    const gcod = grupos.find((g) => g.id === group)?.codigo || "grupo";
    let filas, nombre;
    if (tab === "asistencia") {
      const s = sesiones.find((x) => x.id === sesion);
      filas = [["Alumno", "Folio", "Asistencia"]];
      roster.forEach((a) => filas.push([a.nombre, a.folio || "", presentes[a.enrollment_id] ? "Presente" : "Ausente"]));
      nombre = `asistencia_${gcod}_${s ? s.fecha : ""}.csv`;
    } else {
      const m = modulos.find((x) => x.id === modulo);
      filas = [["Alumno", "Folio", "Calificacion", "Comentario"]];
      roster.forEach((a) => { const c = grades[a.enrollment_id] || {}; filas.push([a.nombre, a.folio || "", c.calificacion || "", c.comentario || ""]); });
      nombre = `calificaciones_${gcod}_${m ? m.nombre : ""}.csv`;
    }
    const csv = filas.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = nombre.replace(/\s+/g, "_"); a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHead ico="academico" title="Asistencia y calificaciones" sub="Pasa lista por sesión y captura calificaciones por módulo."
        right={<Sel width={210} placeholder="Elige un grupo…" ariaLabel="Grupo" value={group} onChange={elegirGrupo}
          options={grupos.map((g) => ({ value: g.id, label: `${g.codigo} · Nivel ${g.nivel}` }))} />} />

      {!group ? (
        <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Elige un grupo para tomar asistencia o capturar calificaciones.</div></div>
      ) : (
        <>
          <div className="pnl-tabs">
            <button className={"pnl-tab" + (tab === "asistencia" ? " on" : "")} onClick={() => cambiarTab("asistencia")}><span className="ic"><Ico n="academico" size={16} /></span> Asistencia</button>
            <button className={"pnl-tab" + (tab === "calificaciones" ? " on" : "")} onClick={() => cambiarTab("calificaciones")}><span className="ic"><Ico n="reportes" size={16} /></span> Calificaciones</button>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            {tab === "asistencia" ? (
              <Sel width={280} placeholder="Elige una sesión…" ariaLabel="Sesión" value={sesion} onChange={(v) => { setSesion(v); setOk(""); }}
                options={sesiones.map((s) => ({ value: s.id, label: fSes(s) }))} />
            ) : (
              <Sel width={280} placeholder="Elige un módulo…" ariaLabel="Módulo" value={modulo} onChange={(v) => { setModulo(v); setOk(""); }}
                options={modulos.map((m) => ({ value: m.id, label: `${m.orden}. ${m.nombre}` }))} />
            )}
            {tab === "asistencia" && sesion && roster.length > 0 && <span style={{ color: "var(--gris)", fontSize: 13.5, fontWeight: 600 }}>{nPres} de {roster.length} presentes</span>}
          </div>

          {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}
          {ok && <div className="aca-ok"><Ico n="check" size={16} /> {ok}</div>}

          {tab === "asistencia" && !sesion ? (
            <div className="u-card"><div style={{ padding: 34, textAlign: "center", color: "var(--gris)" }}>{sesiones.length ? "Elige una sesión para pasar lista." : "Este grupo aún no tiene sesiones. Genéralas en Mis clases."}</div></div>
          ) : tab === "calificaciones" && !modulo ? (
            <div className="u-card"><div style={{ padding: 34, textAlign: "center", color: "var(--gris)" }}>{modulos.length ? "Elige un módulo para capturar calificaciones." : "Este grupo aún no tiene módulos. Créalos en Programa y clases."}</div></div>
          ) : cargando ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div></div>
          ) : !roster.length ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Este grupo no tiene alumnos activos.</div></div>
          ) : (
            <>
              {tab === "asistencia" && puedeAsist && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <button className="u-mini" onClick={() => todos(true)}>Todos presentes</button>
                  <button className="u-mini" onClick={() => todos(false)}>Todos ausentes</button>
                </div>
              )}
              <div className="u-card">
                <div className="u-tablewrap">
                  <table className="u-table">
                    {tab === "asistencia" ? (
                      <>
                        <thead><tr><th>Alumno</th><th style={{ textAlign: "right" }}>Asistencia</th></tr></thead>
                        <tbody>
                          {roster.map((a) => {
                            const pres = !!presentes[a.enrollment_id];
                            return (
                              <tr key={a.enrollment_id}>
                                <td style={{ fontWeight: 600 }}>{a.nombre}<div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{a.folio || ""}</div></td>
                                <td style={{ textAlign: "right" }}>
                                  <button type="button" className={"asis-sw" + (pres ? " pres" : "")} disabled={!puedeAsist} onClick={() => togglePres(a.enrollment_id)} aria-pressed={pres}>
                                    <span className="dotsw">{pres ? <Ico n="check" size={12} /> : null}</span>{pres ? "Presente" : "Ausente"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    ) : (
                      <>
                        <thead><tr><th>Alumno</th><th style={{ width: 130 }}>Calif. (0–100)</th><th>Comentario</th></tr></thead>
                        <tbody>
                          {roster.map((a) => {
                            const c = grades[a.enrollment_id] || { calificacion: "", comentario: "" };
                            return (
                              <tr key={a.enrollment_id}>
                                <td style={{ fontWeight: 600 }}>{a.nombre}<div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{a.folio || ""}</div></td>
                                <td>
                                  <input className="u-inp" style={{ marginTop: 0, width: 96 }} type="number" min="0" max="100" step="1" placeholder="—"
                                    value={c.calificacion} disabled={!puedeCalif} onChange={(e) => setGrade(a.enrollment_id, "calificacion", e.target.value)} />
                                </td>
                                <td>
                                  <input className="u-inp" style={{ marginTop: 0 }} placeholder="Opcional"
                                    value={c.comentario} disabled={!puedeCalif} onChange={(e) => setGrade(a.enrollment_id, "comentario", e.target.value)} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="u-btn sec" onClick={descargar}><Ico n="download" size={16} /> Descargar</button>
                {tab === "asistencia" && puedeAsist && <button className="u-btn" onClick={guardarAsistencia} disabled={busy}>{busy ? "…" : "Guardar asistencia"}</button>}
                {tab === "calificaciones" && puedeCalif && <button className="u-btn" onClick={guardarCalif} disabled={busy}>{busy ? "…" : "Guardar calificaciones"}</button>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Modulo({ mod }) {
  if (!mod) return <p style={{ color: "var(--gris)" }}>Tu rol aún no tiene módulos con pantalla.</p>;
  return (
    <div>
      <PageHead ico={mod.id} title={mod.nombre} sub={mod.desc} />
      <div style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(184,101,0,0.4)", borderRadius: "var(--r-lg)", padding: "46px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", color: "var(--naranja-osc)", marginBottom: 12 }}><Ico n={mod.id} size={40} /></div>
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
      <PageHead ico="usuarios" title="Usuarios y roles" sub="Da de alta al equipo: administración, maestros, coordinador y agentes."
        right={puedeG && <button className="u-btn" onClick={() => setModal({ tipo: "nuevo" })}><Ico n="plus" size={16} /> Nuevo usuario</button>} />

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
            <div style={{ marginTop: 10 }}>
              <Sel width="100%" ariaLabel="Rol" value={rol} disabled={esYo && modal.tipo === "editar"} onChange={(val) => setRol(val)}
                options={roles.map((r) => ({ value: r.codigo, label: r.nombre }))} />
            </div>
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
