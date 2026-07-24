"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel } from "../ui";

const GENERICA = "InjuveLink2026";

function Inscripciones() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [qActiva, setQActiva] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [acceso, setAcceso] = useState(null);
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
        <Sel width={230} value={filtro} onChange={(val) => { setPagina(1); setFiltro(val); }}
          options={[
            { value: "todos", label: "Todos" },
            { value: "pagados", label: `Pagados${data ? ` (${data.pagados})` : ""}` },
            { value: "sin_pago", label: `Registrados sin pago${data ? ` (${data.sin_pago})` : ""}` },
            { value: "sin_grupo", label: `Sin grupo${data ? ` (${data.sin_grupo})` : ""}` },
            ...grupos.map((g) => ({ value: g.codigo, label: `${g.codigo} · Nivel ${g.nivel}` })),
          ]} />
      </div>

      {data && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            { k: "todos", n: total, t: "Inscritos", c: "var(--negro)" },
            { k: "pagados", n: data.pagados, t: "Pagados", c: "var(--exito)" },
            { k: "sin_pago", n: data.sin_pago, t: "Sin pago", c: "var(--alerta)" },
          ].map((s) => (
            <button key={s.k} onClick={() => { setPagina(1); setFiltro(s.k); }}
              className="u-card" style={{ padding: "10px 16px", cursor: "pointer", textAlign: "left", border: filtro === s.k ? "1.5px solid " + s.c : undefined, minWidth: 110 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1.1 }}>{(s.k === "todos" ? total : s.n ?? 0).toLocaleString("es-MX")}</div>
              <div style={{ fontSize: 12.5, color: "var(--gris)" }}>{s.t}</div>
            </button>
          ))}
        </div>
      )}

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
                  <th>Alumno</th><th>WhatsApp</th><th>Pago</th><th>Grupo</th>
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
                      {al.activo
                        ? <span className="u-badge" style={{ background: "var(--exito-bg)", color: "var(--exito)" }}>Pagado</span>
                        : <span className="u-badge" style={{ background: "var(--alerta-bg)", color: "var(--alerta)" }}>Sin pago</span>}
                    </td>
                    <td>
                      {puedeAsignar ? (
                        <Sel width={148} tone={al.grupo ? "naranja" : "alerta"} ariaLabel="Grupo del alumno"
                          value={al.grupo || ""} disabled={guardandoId === al.id}
                          onChange={(val) => asignarGrupo(al, val)}
                          options={[{ value: "", label: "Sin grupo" }, ...grupos.map((g) => ({ value: g.codigo, label: `${g.codigo} · N${g.nivel}` }))]} />
                      ) : al.grupo ? <span className="u-rol">{al.grupo}</span> : <span className="u-badge off">Sin grupo</span>}
                      {!al.grupo && al.grupo_solicitado && (
                        <div style={{ fontSize: 11.5, color: "var(--gris)", marginTop: 3 }}>pidió: {al.grupo_solicitado}</div>
                      )}
                    </td>
                    <td>
                      <div className="u-acts">
                        <button className="u-mini" onClick={() => setAcceso(al)}><Ico n="usuarios" size={14} /> Acceso</button>
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

      {acceso && (
        <AccesoModal
          alumno={acceso}
          puedeEditar={puedeEditar}
          onClose={() => setAcceso(null)}
          onDone={() => { setAcceso(null); cargar(); }}
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

// Tarjeta de acceso: usuario (correo) + estado de la contraseña + restablecer a la genérica.
// La contraseña que el alumno eligió NO se puede ver (va cifrada); solo se restablece.
function AccesoModal({ alumno, puedeEditar, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const generica = alumno.password_cambiada === false;

  async function restablecer() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/panel/inscripciones", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alumno.id, reset_password: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo restablecer.");
      setOk("Contraseña restablecida a la genérica. El alumno la usará para entrar y la cambiará en su primer acceso.");
      setConfirmar(false);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const Fila = ({ dt, children }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--borde)" }}>
      <span style={{ color: "var(--gris)", fontSize: 13.5 }}>{dt}</span>
      <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{children}</span>
    </div>
  );

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <div className="u-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h3>Acceso al portal</h3>
        <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>{alumno.nombre}</p>

        <div style={{ marginTop: 12 }}>
          <Fila dt="Usuario (correo)">{alumno.correo || "—"}</Fila>
          <Fila dt="Contraseña">
            {generica ? (
              <span style={{ background: "var(--exito-bg)", color: "var(--exito)", padding: "3px 11px", borderRadius: 999, fontSize: 13 }}>Genérica: {GENERICA}</span>
            ) : (
              <span style={{ background: "rgba(110,98,88,.14)", color: "var(--gris-2)", padding: "3px 11px", borderRadius: 999, fontSize: 13 }}>Personalizada</span>
            )}
          </Fila>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--gris)", marginTop: 10, lineHeight: 1.5 }}>
          {generica
            ? "El alumno aún no cambia su contraseña: entra con la genérica y la personaliza en su primer acceso."
            : "El alumno ya eligió su propia contraseña. Por seguridad no se puede ver; si la perdió, restablécela a la genérica."}
        </p>

        {ok && <div className="aca-ok" style={{ marginTop: 12 }}>{ok}</div>}
        {error && <div className="u-err">{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          {puedeEditar && !ok && (
            confirmar ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginRight: "auto" }}>
                <span style={{ fontSize: 13 }}>¿Restablecer a <b>{GENERICA}</b>?</span>
                <button className="u-mini dan" onClick={restablecer} disabled={busy}>{busy ? "…" : "Sí, restablecer"}</button>
                <button className="u-mini" onClick={() => setConfirmar(false)}>No</button>
              </div>
            ) : (
              <button className="u-btn sec" style={{ marginRight: "auto" }} onClick={() => setConfirmar(true)}>Restablecer contraseña</button>
            )
          )}
          <button className="u-btn" onClick={ok ? onDone : onClose}>{ok ? "Listo" : "Cerrar"}</button>
        </div>
      </div>
    </div>
  );
}

export default Inscripciones;
