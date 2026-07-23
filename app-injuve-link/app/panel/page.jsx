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
            : modActiva?.id === "misclases" ? <MisClases />
            : modActiva?.id === "usuarios" ? <Usuarios />
            : modActiva?.id === "inscripciones" ? <Inscripciones />
            : modActiva?.id === "grupos" ? <Grupos />
            : modActiva?.id === "maestros" ? <Maestros />
            : modActiva?.id === "pagos" ? <Pagos />
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
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>👥 Grupos</h1>
          <p style={{ color: "var(--gris)" }}>Maestro, horario, cupo y liga de Meet de cada grupo.</p>
        </div>
        {puedeCrear && <button className="u-btn" onClick={() => setModal({ tipo: "nuevo" })}>+ Nuevo grupo</button>}
      </div>

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
                    <td style={{ color: "var(--gris)", fontSize: 13 }}>{g.horario || "—"}</td>
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
    hora_inicio: (g.hora_inicio || "").slice(0, 5),
    duracion_horas: g.duracion_horas != null ? String(g.duracion_horas) : "",
    dias: g.dias ? String(g.dias).split(",").map((x) => x.trim()).filter(Boolean) : [],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const toggleDia = (n) => setV((s) => ({ ...s, dias: s.dias.includes(n) ? s.dias.filter((d) => d !== n) : [...s.dias, n] }));
  const titulos = { nuevo: "Nuevo grupo", editar: "Editar grupo", borrar: "Borrar grupo" };

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let r;
      if (modal.tipo === "borrar") {
        r = await fetch("/api/panel/grupos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
      } else if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: v.codigo, periodo: v.periodo, nivel: v.nivel, maestro: v.maestro, horario: v.horario, cupo: v.cupo, liga_meet: v.liga_meet, dias: v.dias.join(","), hora_inicio: v.hora_inicio, duracion_horas: v.duracion_horas }) });
      } else {
        const body = { id: g.id };
        if (puedeEditar) { body.nivel = v.nivel; body.horario = v.horario; body.cupo = v.cupo; body.liga_meet = v.liga_meet; body.dias = v.dias.join(","); body.hora_inicio = v.hora_inicio; body.duracion_horas = v.duracion_horas; }
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
            <input className="u-inp" placeholder="Horario (texto, ej. 5:00 pm - 7:00 pm)" value={v.horario} onChange={set("horario")} />

            <div style={{ marginTop: 6, fontWeight: 700, fontSize: 13, color: "var(--texto)" }}>Horario semanal <span style={{ fontWeight: 400, color: "var(--gris)" }}>(para el calendario y el pago)</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {[["1", "Lun"], ["2", "Mar"], ["3", "Mié"], ["4", "Jue"], ["5", "Vie"], ["6", "Sáb"], ["7", "Dom"]].map(([n, lbl]) => (
                <button type="button" key={n} onClick={() => toggleDia(n)}
                  style={{ padding: "6px 11px", borderRadius: 8, border: "1px solid var(--borde)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background: v.dias.includes(n) ? "var(--naranja)" : "#fff", color: v.dias.includes(n) ? "#fff" : "var(--texto)" }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <label style={{ flex: "1 1 130px", fontSize: 12, color: "var(--gris)" }}>Hora de inicio
                <input className="u-inp" style={{ marginTop: 3 }} type="time" value={v.hora_inicio} onChange={set("hora_inicio")} />
              </label>
              <label style={{ flex: "1 1 130px", fontSize: 12, color: "var(--gris)" }}>Duración (horas)
                <input className="u-inp" style={{ marginTop: 3 }} type="number" min="0" step="0.5" placeholder="2" value={v.duracion_horas} onChange={set("duracion_horas")} />
              </label>
            </div>

            <input className="u-inp" placeholder="Liga de Google Meet (https://…)" value={v.liga_meet} onChange={set("liga_meet")} />
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
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>🎓 Maestros</h1>
          <p style={{ color: "var(--gris)" }}>Carga docente, teléfono y cotización por nivel. Los maestros se dan de alta en Usuarios y roles.</p>
        </div>
      </div>

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
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>💵 Pago a maestros</h1>
          <p style={{ color: "var(--gris)" }}>Calculado desde la asistencia: horas impartidas × ${data?.tarifa_hora || 200}.</p>
        </div>
        <select className="u-sel" style={{ marginTop: 0, width: "auto" }} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          {(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

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
      <div className="u-head">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--negro)", letterSpacing: "-0.01em" }}>🧑‍🏫 Mis clases</h1>
          <p style={{ color: "var(--gris)" }}>Toma asistencia al iniciar tu clase y entra al Meet.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select className="u-sel" style={{ marginTop: 0, width: "auto" }} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {data?.puede_generar && <button className="u-btn" onClick={generar} disabled={busy}>{busy ? "…" : "🗓 Generar clases del periodo"}</button>}
        </div>
      </div>

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
