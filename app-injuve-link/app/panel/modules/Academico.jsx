"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel } from "../ui";

function TareasTab({ group }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [modal, setModal] = useState(null);
  const [entregas, setEntregas] = useState({});
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const qs = new URLSearchParams({ group });
      if (sel) qs.set("tarea", sel);
      const r = await fetch("/api/panel/tareas?" + qs.toString());
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cargar.");
      setData(d);
      if (d.tarea && d.entregas) {
        const roster = d.alumnos || [];
        const e = {};
        roster.forEach((a) => {
          const ex = d.entregas[a.enrollment_id];
          e[a.enrollment_id] = ex
            ? { entregada: true, calificacion: ex.calificacion != null ? String(ex.calificacion) : "", comentario: ex.comentario || "" }
            : { entregada: false, calificacion: "", comentario: "" };
        });
        setEntregas(e);
      }
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [group, sel]);
  useEffect(() => { setSel(null); setOk(""); }, [group]);

  const tareas = data?.tareas || [];
  const roster = data?.alumnos || [];
  const modulos = data?.modulos || [];
  const puedeCrear = data?.puede_crear;
  const puedeCalif = data?.puede_calificar;
  const tareaSel = tareas.find((t) => t.id === sel);
  const modNombre = (id) => modulos.find((m) => m.id === id)?.nombre || "—";
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtF = (f) => { if (!f) return "—"; const dt = new Date(f + "T00:00:00"); return dt.getDate() + " " + MES[dt.getMonth()]; };
  const nEnt = roster.reduce((n, a) => n + (entregas[a.enrollment_id]?.entregada ? 1 : 0), 0);

  const setEnt = (id, k, val) => { setEntregas((s) => ({ ...s, [id]: { ...(s[id] || { entregada: false, calificacion: "", comentario: "" }), [k]: val } })); setOk(""); };
  const todas = (val) => { const e = {}; roster.forEach((a) => { e[a.enrollment_id] = { ...(entregas[a.enrollment_id] || { calificacion: "", comentario: "" }), entregada: val }; }); setEntregas(e); setOk(""); };

  async function guardar() {
    setBusy(true); setError(""); setOk("");
    try {
      const registros = roster.map((a) => ({ enrollment_id: a.enrollment_id, entregada: !!entregas[a.enrollment_id]?.entregada, calificacion: entregas[a.enrollment_id]?.calificacion ?? "", comentario: entregas[a.enrollment_id]?.comentario ?? "" }));
      const r = await fetch("/api/panel/tareas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tarea_id: sel, group_id: group, registros }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      setOk(`Entregas guardadas: ${d.entregadas} de ${roster.length}.`);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function descargar() {
    const filas = [["Alumno", "Folio", "Entregada", "Calificacion", "Comentario"]];
    roster.forEach((a) => { const c = entregas[a.enrollment_id] || {}; filas.push([a.nombre, a.folio || "", c.entregada ? "Si" : "No", c.calificacion || "", c.comentario || ""]); });
    const csv = filas.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = ("entregas_" + (tareaSel?.titulo || "tarea")).replace(/\s+/g, "_") + ".csv"; el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}
      {ok && <div className="aca-ok"><Ico n="check" size={16} /> {ok}</div>}

      {!sel ? (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {puedeCrear && <button className="u-btn" onClick={() => setModal({ tipo: "nueva" })}><Ico n="plus" size={16} /> Nueva tarea</button>}
          </div>
          {cargando ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div></div>
          ) : !tareas.length ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Este grupo aún no tiene tareas.{puedeCrear ? " Crea la primera con “+ Nueva tarea”." : ""}</div></div>
          ) : (
            <div className="u-card"><div className="u-tablewrap">
              <table className="u-table">
                <thead><tr><th>Tarea</th><th>Módulo</th><th>Límite</th><th style={{ textAlign: "center" }}>Entregas</th><th style={{ textAlign: "right" }}>Acciones</th></tr></thead>
                <tbody>
                  {tareas.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.titulo}{t.descripcion && <div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400, maxWidth: 320 }}>{t.descripcion}</div>}</td>
                      <td style={{ color: "var(--gris)", fontSize: 13 }}>{t.modulo_id ? modNombre(t.modulo_id) : "—"}</td>
                      <td style={{ color: "var(--gris)", fontSize: 13, whiteSpace: "nowrap" }}>{fmtF(t.fecha_limite)}</td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{t.entregas}<span style={{ color: "var(--gris)", fontWeight: 400 }}> / {roster.length}</span></td>
                      <td><div className="u-acts">
                        <button className="u-mini" onClick={() => { setSel(t.id); setOk(""); }}>Entregas</button>
                        {puedeCrear && <button className="u-mini" onClick={() => setModal({ tipo: "editar", tarea: t })}>Editar</button>}
                        {puedeCrear && <button className="u-mini dan" onClick={() => setModal({ tipo: "borrar", tarea: t })}>Borrar</button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          )}
        </>
      ) : (
        <>
          <button className="u-mini" style={{ marginBottom: 12 }} onClick={() => { setSel(null); setOk(""); }}>← Volver a tareas</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--negro)" }}>{tareaSel?.titulo || "Tarea"}</h2>
              <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>
                {tareaSel?.modulo_id ? modNombre(tareaSel.modulo_id) + " · " : ""}Límite: {fmtF(tareaSel?.fecha_limite)} · {nEnt} de {roster.length} entregadas
              </p>
            </div>
            {puedeCalif && roster.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="u-mini" onClick={() => todas(true)}>Todas entregadas</button>
                <button className="u-mini" onClick={() => todas(false)}>Ninguna</button>
              </div>
            )}
          </div>

          {cargando ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div></div>
          ) : !roster.length ? (
            <div className="u-card"><div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Este grupo no tiene alumnos activos.</div></div>
          ) : (
            <>
              <div className="u-card"><div className="u-tablewrap">
                <table className="u-table">
                  <thead><tr><th>Alumno</th><th style={{ textAlign: "center" }}>Entregada</th><th style={{ width: 120 }}>Calif. (0–100)</th><th>Comentario</th></tr></thead>
                  <tbody>
                    {roster.map((a) => {
                      const c = entregas[a.enrollment_id] || { entregada: false, calificacion: "", comentario: "" };
                      return (
                        <tr key={a.enrollment_id}>
                          <td style={{ fontWeight: 600 }}>{a.nombre}<div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{a.folio || ""}</div></td>
                          <td style={{ textAlign: "center" }}>
                            <button type="button" className={"asis-sw" + (c.entregada ? " pres" : "")} disabled={!puedeCalif} onClick={() => setEnt(a.enrollment_id, "entregada", !c.entregada)} aria-pressed={c.entregada}>
                              <span className="dotsw">{c.entregada ? <Ico n="check" size={12} /> : null}</span>{c.entregada ? "Entregada" : "Pendiente"}
                            </button>
                          </td>
                          <td>
                            <input className="u-inp" style={{ marginTop: 0, width: 90 }} type="number" min="0" max="100" step="1" placeholder="—"
                              value={c.calificacion} disabled={!puedeCalif || !c.entregada} onChange={(e) => setEnt(a.enrollment_id, "calificacion", e.target.value)} />
                          </td>
                          <td>
                            <input className="u-inp" style={{ marginTop: 0 }} placeholder={c.entregada ? "Opcional" : "—"}
                              value={c.comentario} disabled={!puedeCalif || !c.entregada} onChange={(e) => setEnt(a.enrollment_id, "comentario", e.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div></div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="u-btn sec" onClick={descargar}><Ico n="download" size={16} /> Descargar</button>
                {puedeCalif && <button className="u-btn" onClick={guardar} disabled={busy}>{busy ? "…" : "Guardar entregas"}</button>}
              </div>
            </>
          )}
        </>
      )}

      {modal && <TareaModal modal={modal} groupId={group} modulos={modulos} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
    </div>
  );
}

function TareaModal({ modal, groupId, modulos, onClose, onDone }) {
  const t = modal.tarea || {};
  const [v, setV] = useState({
    titulo: t.titulo || "", descripcion: t.descripcion || "",
    modulo_id: t.modulo_id || "", fecha_limite: t.fecha_limite || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const titulos = { nueva: "Nueva tarea", editar: "Editar tarea", borrar: "Borrar tarea" };

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let r;
      if (modal.tipo === "borrar") {
        r = await fetch("/api/panel/tareas", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
      } else if (modal.tipo === "nueva") {
        r = await fetch("/api/panel/tareas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: groupId, titulo: v.titulo, descripcion: v.descripcion, modulo_id: v.modulo_id || null, fecha_limite: v.fecha_limite }) });
      } else {
        r = await fetch("/api/panel/tareas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, titulo: v.titulo, descripcion: v.descripcion, modulo_id: v.modulo_id || null, fecha_limite: v.fecha_limite }) });
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
          <p style={{ color: "var(--gris)", marginTop: 8, fontSize: 14.5 }}>¿Seguro que quieres borrar la tarea <b>{t.titulo}</b>? Se borran también sus entregas.</p>
        ) : (
          <>
            <input className="u-inp" placeholder="Título de la tarea" value={v.titulo} onChange={set("titulo")} />
            <textarea className="u-inp" placeholder="Instrucciones (opcional)" value={v.descripcion} onChange={set("descripcion")} rows={3} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11.5, color: "var(--gris)", margin: "8px 0 3px", fontWeight: 600 }}>Módulo (opcional)</div>
                <Sel width="100%" placeholder="Sin módulo" value={v.modulo_id} onChange={(val) => setV((s) => ({ ...s, modulo_id: val }))}
                  options={[{ value: "", label: "Sin módulo" }, ...modulos.map((m) => ({ value: m.id, label: `${m.orden}. ${m.nombre}` }))]} />
              </div>
              <label style={{ flex: "1 1 140px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Fecha límite
                <input className="u-inp" style={{ marginTop: 3 }} type="date" value={v.fecha_limite} onChange={set("fecha_limite")} />
              </label>
            </div>
          </>
        )}
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className={"u-btn" + (modal.tipo === "borrar" ? " dan" : "")} disabled={busy}>
            {busy ? "…" : modal.tipo === "borrar" ? "Sí, borrar" : modal.tipo === "nueva" ? "Crear tarea" : "Guardar"}
          </button>
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
            <button className={"pnl-tab" + (tab === "tareas" ? " on" : "")} onClick={() => cambiarTab("tareas")}><span className="ic"><Ico n="programa" size={16} /></span> Tareas</button>
          </div>

          {tab === "tareas" ? (
            <TareasTab group={group} />
          ) : (
          <>
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
        </>
      )}
    </div>
  );
}


export default Academico;
