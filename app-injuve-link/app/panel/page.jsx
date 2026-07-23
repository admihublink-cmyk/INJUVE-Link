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
            : modActiva?.id === "inscripciones" ? <Inscripciones />
            : <Modulo mod={modActiva} />}
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
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>Dashboard general</h1>
      <p style={{ color: "var(--gris)", marginBottom: 24 }}>Hola, {primer}. Este es el resumen del programa.</p>
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
                      <td style={{ color: "var(--gris)" }}>{g.horario || "—"}</td>
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
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>📝 Inscripciones</h1>
          <p style={{ color: "var(--gris)" }}>Busca alumnos, asígnales grupo y edita sus datos.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <form onSubmit={buscar} style={{ display: "flex", gap: 8, flex: "1 1 260px" }}>
          <input className="u-inp" style={{ marginTop: 0, flex: 1 }} placeholder="Buscar por nombre, folio, WhatsApp o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="u-btn" type="submit">Buscar</button>
        </form>
        <select className="u-sel" style={{ marginTop: 0, width: "auto", minWidth: 200 }} value={filtro} onChange={(e) => { setPagina(1); setFiltro(e.target.value); }}>
          <option value="todos">Todos los grupos</option>
          <option value="sin_grupo">Sin grupo{data ? ` (${data.sin_grupo})` : ""}</option>
          {grupos.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · Nivel {g.nivel}</option>)}
        </select>
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
                        <select
                          value={al.grupo || ""}
                          disabled={guardandoId === al.id}
                          onChange={(e) => asignarGrupo(al, e.target.value)}
                          style={{
                            padding: "6px 8px", borderRadius: 8, border: "1px solid var(--borde)",
                            background: al.grupo ? "var(--naranja-claro)" : "#FDECEC",
                            color: al.grupo ? "var(--naranja-osc)" : "#B3261E",
                            fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                          }}>
                          <option value="">Sin grupo</option>
                          {grupos.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · N{g.nivel}</option>)}
                        </select>
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
            <select className="u-sel" style={{ flex: "1 1 200px" }} value={v.grupo} onChange={set("grupo")}>
              <option value="">Sin grupo</option>
              {grupos.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · Nivel {g.nivel} · {g.maestro}</option>)}
            </select>
          )}
          {puedeEstado && (
            <select className="u-sel" style={{ flex: "1 1 130px" }} value={v.estado} onChange={set("estado")}>
              <option value="asignada">asignada</option>
              <option value="pagada">pagada</option>
            </select>
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
