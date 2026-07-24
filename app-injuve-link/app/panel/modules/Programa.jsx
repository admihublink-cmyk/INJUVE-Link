"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel } from "../ui";

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


export default Programa;
