"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel, ROL_CORTO } from "../ui";

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

export default Usuarios;
