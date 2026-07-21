"use client";
import { useEffect, useMemo, useState } from "react";

const ESTADOS = [
  ["nueva", "Nueva"], ["validada", "Validada"], ["liga_enviada", "Liga enviada"],
  ["pagada", "Pagada"], ["asignada", "Asignada"], ["baja", "Baja"],
];
const ESTADO_LABEL = Object.fromEntries(ESTADOS);

function Login({ onOk }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  async function entrar(e) {
    e.preventDefault();
    setError(""); setCargando(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo entrar.");
      onOk();
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  }
  return (
    <div className="admin-login">
      <form onSubmit={entrar} className="admin-login-card">
        <h1>Panel de administración</h1>
        <p>INJUVE Link · acceso del equipo</p>
        {error && <div className="admin-error">{error}</div>}
        <input type="password" placeholder="Contraseña del equipo" value={password}
          onChange={(e) => setPassword(e.target.value)} autoFocus />
        <button className="btn btn-cta" disabled={cargando} style={{ width: "100%", justifyContent: "center" }}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [sel, setSel] = useState(null);
  const [nuevoGrupo, setNuevoGrupo] = useState({ codigo: "", maestro: "", nivel: "", horario: "", liga_meet: "", cupo: 25 });

  async function cargar() {
    setError("");
    const r = await fetch("/api/admin/data");
    if (r.status === 401) { setAuth(false); return; }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Error al cargar."); return; }
    setData(d); setAuth(true);
  }
  useEffect(() => { cargar(); }, []);

  async function accion(payload) {
    const r = await fetch("/api/admin/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.error || "Error en la acción."); return false; }
    await cargar();
    return true;
  }

  async function salir() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuth(false); setData(null);
  }

  const inscripciones = data?.inscripciones || [];
  const grupos = data?.grupos || [];

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return inscripciones.filter((i) => {
      if (filtro !== "todos" && i.estado !== filtro) return false;
      if (!q) return true;
      return [i.nombre, i.correo, i.whatsapp, i.folio].some((c) => String(c || "").toLowerCase().includes(q));
    });
  }, [inscripciones, busca, filtro]);

  const metricas = useMemo(() => {
    const total = inscripciones.length;
    const pagadas = inscripciones.filter((i) => ["pagada", "asignada"].includes(i.estado)).length;
    const pendientes = inscripciones.filter((i) => ["nueva", "validada", "liga_enviada"].includes(i.estado)).length;
    const activos = inscripciones.filter((i) => i.activo && i.estado !== "baja").length;
    return { total, pagadas, pendientes, activos };
  }, [inscripciones]);

  if (!auth) return <Login onOk={cargar} />;

  return (
    <div className="admin">
      <header className="admin-top">
        <div>
          <strong>INJUVE Link</strong> · Administración
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="admin-btn" onClick={cargar}>Actualizar</button>
          <button className="admin-btn" onClick={salir}>Salir</button>
        </div>
      </header>

      <div className="admin-body">
        {error && <div className="admin-error">{error}</div>}

        <div className="admin-metrics">
          <div className="admin-metric"><span>{metricas.total}</span><label>Inscripciones</label></div>
          <div className="admin-metric"><span>{metricas.pendientes}</span><label>Por validar/pagar</label></div>
          <div className="admin-metric"><span>{metricas.pagadas}</span><label>Pagadas</label></div>
          <div className="admin-metric"><span>{metricas.activos}</span><label>Acceso activo</label></div>
        </div>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Inscripciones</h2>
            <div className="admin-filtros">
              <input placeholder="Buscar nombre, correo, folio…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="todos">Todos los estados</option>
                {ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Folio</th><th>Alumno</th><th>Contacto</th><th>Edad</th>
                  <th>Estado</th><th>Grupo</th><th>Acceso</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.folio}</td>
                    <td>
                      {i.nombre}
                      {i.es_menor && <span className="admin-tag rosa">menor</span>}
                    </td>
                    <td className="chico">{i.whatsapp}<br />{i.correo}</td>
                    <td>{i.edad}</td>
                    <td>
                      <select className={"admin-estado e-" + i.estado} value={i.estado}
                        onChange={(e) => accion({ tipo: "estado", id: i.id, estado: e.target.value })}>
                        {ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="admin-mini" value={i.grupo || ""}
                        onChange={(e) => accion({ tipo: "asignar_grupo", id: i.id, grupo: e.target.value })}>
                        <option value="">—</option>
                        {grupos.map((g) => <option key={g.id} value={g.codigo}>{g.codigo}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className={"admin-toggle " + (i.activo ? "on" : "off")}
                        onClick={() => accion({ tipo: "acceso", id: i.id, activo: !i.activo })}>
                        {i.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td><button className="admin-btn chico" onClick={() => setSel(i)}>Ver</button></td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={8} className="admin-vacio">Sin inscripciones que coincidan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head"><h2>Grupos</h2></div>
          <div className="admin-grupos">
            {grupos.map((g) => {
              const n = inscripciones.filter((i) => i.grupo === g.codigo && i.estado !== "baja").length;
              return (
                <div className="admin-grupo" key={g.id}>
                  <strong>{g.codigo}</strong>
                  <span>{g.maestro || "Sin maestro"} · {g.nivel || "—"}</span>
                  <span className="chico">{g.horario || "Sin horario"}</span>
                  <span className="admin-tag">{n}/{g.cupo} alumnos</span>
                </div>
              );
            })}
          </div>
          <details className="admin-nuevo">
            <summary>+ Crear grupo</summary>
            <div className="admin-form-grupo">
              <input placeholder="Código (ej. G14)" value={nuevoGrupo.codigo} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, codigo: e.target.value })} />
              <input placeholder="Maestro" value={nuevoGrupo.maestro} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, maestro: e.target.value })} />
              <input placeholder="Nivel (ej. 1)" value={nuevoGrupo.nivel} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nivel: e.target.value })} />
              <input placeholder="Horario" value={nuevoGrupo.horario} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, horario: e.target.value })} />
              <input placeholder="Liga de Google Meet" value={nuevoGrupo.liga_meet} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, liga_meet: e.target.value })} />
              <input type="number" placeholder="Cupo" value={nuevoGrupo.cupo} onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, cupo: e.target.value })} />
              <button className="btn btn-cta" style={{ justifyContent: "center" }} onClick={async () => {
                if (await accion({ tipo: "crear_grupo", ...nuevoGrupo })) setNuevoGrupo({ codigo: "", maestro: "", nivel: "", horario: "", liga_meet: "", cupo: 25 });
              }}>Crear grupo</button>
            </div>
          </details>
        </section>
      </div>

      {sel && <Detalle insc={sel} grupos={grupos} onClose={() => setSel(null)} accion={accion} />}
    </div>
  );
}

function Detalle({ insc, grupos, onClose, accion }) {
  const [usuario, setUsuario] = useState(insc.burlington_usuario || "");
  const [password, setPassword] = useState("");
  const [activada, setActivada] = useState(insc.licencia_burlington_activada || "");
  const [vence, setVence] = useState(insc.licencia_burlington_vence || "");
  const [notas, setNotas] = useState(insc.notas_admin || "");

  return (
    <div className="admin-modal-bg" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <div>
            <h3>{insc.nombre}</h3>
            <span className="mono">{insc.folio}</span>
          </div>
          <button className="admin-btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="admin-detalle-grid">
          <div><label>Correo</label><p>{insc.correo}</p></div>
          <div><label>WhatsApp</label><p>{insc.whatsapp}</p></div>
          <div><label>Edad / Sexo</label><p>{insc.edad} · {insc.sexo}</p></div>
          <div><label>Examen ubicación</label><p>{insc.examen_ubicacion}</p></div>
          {insc.es_menor && (
            <div style={{ gridColumn: "1 / -1" }}><label>Tutor</label><p>{insc.tutor_nombre} · {insc.tutor_contacto}</p></div>
          )}
        </div>

        <h4>Credenciales Burlington English</h4>
        <div className="admin-form-grupo">
          <input placeholder="Usuario Burlington" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          <input placeholder="Contraseña Burlington" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="chico">Licencia activada<input type="date" value={activada || ""} onChange={(e) => setActivada(e.target.value)} /></label>
          <label className="chico">Licencia vence<input type="date" value={vence || ""} onChange={(e) => setVence(e.target.value)} /></label>
          <button className="btn btn-cta" style={{ justifyContent: "center" }} onClick={async () => {
            const ok = await accion({ tipo: "burlington", id: insc.id, usuario, password, activada, vence });
            if (ok) { setPassword(""); onClose(); }
          }}>Guardar credenciales</button>
        </div>

        <h4>Notas internas</h4>
        <textarea className="admin-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones del equipo…" />
        <button className="admin-btn" onClick={async () => { await accion({ tipo: "notas", id: insc.id, notas }); }}>Guardar notas</button>

        <div className="admin-peligro">
          <button className="admin-btn rojo" onClick={async () => {
            if (confirm("¿Eliminar definitivamente esta inscripción? No se puede deshacer.")) {
              if (await accion({ tipo: "borrar_inscripcion", id: insc.id })) onClose();
            }
          }}>Eliminar inscripción</button>
        </div>
      </div>
    </div>
  );
}
