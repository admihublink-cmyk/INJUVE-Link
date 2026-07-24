"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel } from "../ui";

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


export default Inscripciones;
