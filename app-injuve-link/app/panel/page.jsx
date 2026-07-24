"use client";
// build: panel modular (code-split con next/dynamic)
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Ico, PageHead } from "./ui";

const ROL_NOMBRE = {
  odp: "ODP · Super Admin",
  administracion: "Administración",
  coordinador_atencion: "Coordinador de Atención",
  maestro: "Maestro",
  agente_atencion: "Agente de Atención",
  alumno: "Alumno",
};

// Cada módulo se muestra en el menú lateral si el usuario tiene el permiso disparador.
const MODULOS = [
  { id: "dashboard", perm: "DASHBOARD_VER", nombre: "Dashboard", icon: "📊", desc: "Alumnos y grupos activos, métricas del programa." },
  { id: "misclases", perm: "SESION_VER", nombre: "Mis clases", icon: "🧑‍🏫", desc: "Toma asistencia y entra al Meet de tus clases." },
  { id: "inscripciones", perm: "INSC_VER", nombre: "Inscripciones", icon: "📝", desc: "Altas, estados y asignación de grupo." },
  { id: "cotejo", perm: "INSC_CREAR", nombre: "Cotejo y pagos", icon: "🧾", desc: "Cruza transacciones, activa pagados y descarga el cotejo." },
  { id: "examen", perm: "INSC_VER", nombre: "Examen de ubicación", icon: "🧠", desc: "Edita preguntas y criterio de nivel; resultados de aspirantes." },
  { id: "grupos", perm: "GRUPO_VER", nombre: "Grupos", icon: "👥", desc: "Cohortes, maestro, horario y Google Meet." },
  { id: "maestros", perm: "MAESTRO_VER", nombre: "Maestros", icon: "🎓", desc: "Perfiles, cotización y documentos." },
  { id: "programa", perm: "PROGRAMA_VER", nombre: "Programa y clases", icon: "📚", desc: "Módulos, calendario y sesiones." },
  { id: "academico", perm: "CALIF_VER", nombre: "Asistencia y calificaciones", icon: "✅", desc: "Registro por sesión y módulo." },
  { id: "documentos", perms: ["EVIDENCIA_SUBIR", "MAESTRO_DOC_VALIDAR", "PAGOM_VALIDAR", "MAESTRO_DOC_SUBIR", "PAGOM_DOC_SUBIR"], nombre: "Documentos", icon: "📄", desc: "Documentos básicos y de honorarios por maestro." },
  { id: "pagos", perm: "PAGOM_VER", nombre: "Pago a maestros", icon: "💵", desc: "Evidencias, documentos y pagos." },
  { id: "atencion", perm: "CASO_VER", nombre: "Atención a becarios", icon: "🎧", desc: "Buzón de casos con semáforo." },
  { id: "solicitudes", perm: "SOLIC_ATENDER", nombre: "Solicitudes", icon: "📨", desc: "Ligas de pago y Burlington." },
  { id: "legal", perm: "ARCO_ATENDER", nombre: "Legal y ARCO", icon: "⚖️", desc: "Solicitudes de derechos ARCO." },
  { id: "reportes", perm: "REPORTE_VER", nombre: "Reportes", icon: "📈", desc: "Estadísticas del programa." },
  { id: "reportes_pago", perm: "REPORTE_PAGOS", nombre: "Reportes de pago", icon: "💳", desc: "Pagos a maestros." },
  { id: "usuarios", perm: "USUARIO_VER", nombre: "Usuarios y roles", icon: "🔑", desc: "Personal, maestros, agentes y permisos." },
];

function Cargando() {
  return <div className="pnl-view" style={{ padding: "56px 8px", textAlign: "center", color: "var(--gris)", fontWeight: 600 }}>Cargando módulo…</div>;
}

const Dashboard = dynamic(() => import("./modules/Dashboard"), { ssr: false, loading: Cargando });
const Inscripciones = dynamic(() => import("./modules/Inscripciones"), { ssr: false, loading: Cargando });
const Cotejo = dynamic(() => import("./modules/Cotejo"), { ssr: false, loading: Cargando });
const Examen = dynamic(() => import("./modules/Examen"), { ssr: false, loading: Cargando });
const Grupos = dynamic(() => import("./modules/Grupos"), { ssr: false, loading: Cargando });
const Maestros = dynamic(() => import("./modules/Maestros"), { ssr: false, loading: Cargando });
const Pagos = dynamic(() => import("./modules/Pagos"), { ssr: false, loading: Cargando });
const MisClases = dynamic(() => import("./modules/MisClases"), { ssr: false, loading: Cargando });
const Programa = dynamic(() => import("./modules/Programa"), { ssr: false, loading: Cargando });
const Academico = dynamic(() => import("./modules/Academico"), { ssr: false, loading: Cargando });
const Documentos = dynamic(() => import("./modules/Documentos"), { ssr: false, loading: Cargando });
const Usuarios = dynamic(() => import("./modules/Usuarios"), { ssr: false, loading: Cargando });

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
  const modulos = MODULOS.filter((m) => (m.perms ? m.perms.some((p) => permisos.includes(p)) : permisos.includes(m.perm)));
  const [activa, setActiva] = useState("dashboard");
  const [navAbierto, setNavAbierto] = useState(false);
  const modActiva = modulos.find((m) => m.id === activa) || modulos[0];

  // Accesibilidad de modales: Escape cierra el modal superior + trampa de foco (Tab/Shift+Tab cíclico dentro
  // del modal de más arriba), enfoca el primer control al abrir y devuelve el foco al disparador al cerrar.
  useEffect(() => {
    const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const modalArriba = () => {
      const ms = document.querySelectorAll(".u-modal");
      return ms.length ? ms[ms.length - 1] : null;
    };
    const enfocables = (root) => [...root.querySelectorAll(SEL)].filter((el) => !el.disabled && el.getClientRects().length > 0);
    let previo = null;

    const onKey = (e) => {
      if (e.key === "Escape") {
        if (document.querySelector(".sel-menu")) return; // el desplegable maneja su propio Escape
        const bgs = document.querySelectorAll(".u-modal-bg");
        if (bgs.length) bgs[bgs.length - 1].click();
        return;
      }
      if (e.key !== "Tab") return;
      const modal = modalArriba();
      if (!modal) return;
      const f = enfocables(modal);
      if (!f.length) { e.preventDefault(); return; }
      const primero = f[0], ultimo = f[f.length - 1], act = document.activeElement;
      if (!modal.contains(act)) { e.preventDefault(); primero.focus(); return; }
      if (e.shiftKey && act === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && act === ultimo) { e.preventDefault(); primero.focus(); }
    };

    const onMut = () => {
      const modal = modalArriba();
      if (modal) {
        if (!modal.dataset.trap) {
          modal.dataset.trap = "1";
          if (!previo) previo = document.activeElement; // recuerda el disparador (solo el 1er modal)
          const f = enfocables(modal);
          (f[0] || modal).focus?.();
        }
      } else if (previo) {
        previo.focus?.();
        previo = null;
      }
    };

    const obs = new MutationObserver(onMut);
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKey);
    return () => { obs.disconnect(); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className="pnl">
      <style>{`
        .pnl{--zdrop:1200;--zmbg:600;--zm:601;
          position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;color:var(--texto);
          font-family:var(--font-cuerpo),-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
          background:
            radial-gradient(760px 560px at 14% -20%, rgba(255,178,74,0.20) 0%, transparent 62%),
            radial-gradient(1000px 740px at 102% -12%, rgba(241,139,17,0.26) 0%, transparent 58%),
            radial-gradient(880px 720px at -8% 114%, rgba(255,150,40,0.20) 0%, transparent 62%),
            #FEF5EA;}
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
          background:rgba(255,250,244,0.5);
          -webkit-backdrop-filter:blur(20px) saturate(185%);backdrop-filter:blur(20px) saturate(185%);
          border-right:1px solid rgba(255,255,255,0.5);}
        .pnl-aside nav{display:grid;gap:5px;}
        .pnl-sec{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--gris);opacity:.7;padding:14px 12px 6px;}
        .pnl-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;border:1px solid rgba(241,139,17,0.18);
          background:rgba(241,139,17,0.10);color:var(--texto);font-weight:600;font-size:14px;cursor:pointer;text-align:left;width:100%;
          font-family:inherit;transition:background .18s var(--ease),color .16s,border-color .16s,box-shadow .18s,transform .12s var(--ease);}
        .pnl-item:hover{background:rgba(241,139,17,0.22);border-color:rgba(241,139,17,0.38);transform:translateX(2px);}
        .pnl-item .ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;color:var(--naranja-osc);flex-shrink:0;transition:color .16s;}
        .pnl-item.on{background:rgba(241,139,17,0.26);border-color:rgba(241,139,17,0.5);color:var(--texto);font-weight:750;box-shadow:0 6px 14px -10px rgba(184,101,0,0.4);}
        .pnl-item.on:hover{background:rgba(241,139,17,0.3);transform:none;}
        .pnl-item.on .ic{color:var(--naranja-osc);}
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
        .u-btn.dan{background:var(--alerta);color:#fff;box-shadow:0 10px 22px -12px rgba(179,38,30,0.8);}
        .u-btn.dan:hover{background:var(--alerta-osc);}
        .u-btn:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none;}
        /* —— Tarjetas y tablas —— */
        /* Tarjetas SIN backdrop-filter: el fondo detrás es un degradado suave, el blur no aportaba nada visible pero costaba GPU (una capa por tarjeta). El blur se reserva para barra/sidebar/modales. */
        .u-glass{background:rgba(248,214,170,0.26);
          border:1px solid rgba(255,255,255,0.55);border-radius:var(--r-md);box-shadow:0 16px 36px -18px rgba(150,84,8,0.34), inset 0 1px 0 rgba(255,255,255,0.72);}
        .u-card{background:rgba(248,214,170,0.26);
          border:1px solid rgba(255,255,255,0.55);border-radius:var(--r-md);overflow:hidden;box-shadow:0 16px 36px -18px rgba(150,84,8,0.34), inset 0 1px 0 rgba(255,255,255,0.72);}
        .u-tablewrap{overflow-x:auto;}
        /* Salta el render/pintado de tarjetas fuera de pantalla en listas que crecen (p.ej. maestros en Documentos). */
        .cv-card{content-visibility:auto;contain-intrinsic-size:auto 140px;}
        .u-table{width:100%;border-collapse:collapse;font-size:14px;}
        .u-table th{text-align:left;padding:12px 16px;background:rgba(241,139,17,0.12);color:#5A4326;font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--borde);white-space:nowrap;}
        .u-table td{padding:12px 16px;border-bottom:1px solid var(--borde);vertical-align:middle;}
        .u-table tbody tr{transition:background .14s;}
        .u-table tbody tr:hover{background:rgba(241,139,17,0.05);}
        .u-table tr:last-child td{border-bottom:none;}
        .u-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;}
        .u-badge.on{background:var(--exito-bg);color:var(--exito);}
        .u-badge.off{background:#F1EEE9;color:var(--gris-2);}
        .u-rol{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:var(--naranja-claro);color:var(--naranja-osc);white-space:nowrap;}
        .u-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
        .u-mini{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:rgba(255,255,255,0.82);border:1px solid var(--borde);border-radius:9px;padding:6px 12px;min-height:38px;box-sizing:border-box;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--texto);font-family:inherit;white-space:nowrap;transition:background .16s,box-shadow .16s;}
        .u-mini:hover{background:#fff;box-shadow:var(--sombra);}
        .u-mini.dan{color:var(--alerta);border-color:rgba(179,38,30,.3);}
        .u-mini.dan:hover{background:rgba(179,38,30,.08);}
        /* —— Modales de vidrio —— */
        .u-modal-bg{position:fixed;inset:0;background:rgba(43,33,24,0.34);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);
          display:flex;align-items:center;justify-content:center;z-index:var(--zmbg);padding:16px;animation:pnlfade .2s var(--ease);}
        .u-modal{background:rgba(255,255,255,0.9);-webkit-backdrop-filter:blur(30px) saturate(185%);backdrop-filter:blur(30px) saturate(185%);
          border:1px solid rgba(255,255,255,0.7);border-radius:var(--r-lg);padding:24px;width:100%;max-width:440px;
          box-shadow:var(--sombra-alta), inset 0 1px 0 rgba(255,255,255,0.8);
          z-index:var(--zm);animation:pnlpop .22s var(--ease);}
        .u-modal h3{font-size:20px;font-weight:800;color:var(--negro);margin-bottom:2px;}
        .u-inp,.u-sel{width:100%;padding:11px 13px;border:1px solid var(--borde);border-radius:11px;font-size:14.5px;margin-top:10px;font-family:inherit;background:rgba(255,255,255,0.85);color:var(--texto);transition:border-color .16s,box-shadow .16s;}
        .u-inp:focus,.u-sel:focus{outline:none;border-color:var(--naranja);box-shadow:0 0 0 3px var(--naranja-claro);}
        .u-err{background:rgba(179,38,30,.1);color:var(--alerta);border-radius:11px;padding:9px 13px;font-size:13.5px;margin-top:12px;}
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
        .sel.t-alerta .sel-btn{background:var(--alerta-bg);border-color:transparent;color:var(--alerta);font-weight:700;}
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
        .aca-ok{display:inline-flex;align-items:center;gap:7px;background:var(--exito-bg);color:var(--exito);border-radius:10px;padding:8px 13px;font-size:13.5px;font-weight:600;margin-bottom:14px;}
        .asis-sw{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--borde);background:rgba(255,255,255,0.8);border-radius:999px;padding:6px 14px 6px 8px;min-height:38px;box-sizing:border-box;font-family:inherit;font-size:13px;font-weight:700;color:var(--gris);cursor:pointer;transition:background .16s,color .16s,border-color .16s;}
        .asis-sw .dotsw{width:17px;height:17px;border-radius:50%;background:#CFC7BC;display:inline-flex;align-items:center;justify-content:center;color:#fff;transition:background .16s;}
        .asis-sw.pres{background:var(--exito-bg);border-color:transparent;color:var(--exito);}
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
              : modActiva?.id === "cotejo" ? <Cotejo />
              : modActiva?.id === "examen" ? <Examen />
              : modActiva?.id === "grupos" ? <Grupos />
              : modActiva?.id === "maestros" ? <Maestros />
              : modActiva?.id === "pagos" ? <Pagos />
              : modActiva?.id === "programa" ? <Programa />
              : modActiva?.id === "academico" ? <Academico />
              : modActiva?.id === "documentos" ? <Documentos />
              : <Modulo mod={modActiva} />}
          </div>
        </main>
      </div>
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
