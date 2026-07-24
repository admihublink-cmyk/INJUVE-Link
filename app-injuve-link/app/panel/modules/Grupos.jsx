"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel, fmtDias } from "../ui";

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

      <OfertaGrupos />

      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gris)", margin: "4px 2px 8px" }}>Grupos del periodo (operativos)</div>
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
                    <td>{g.maestro || "—"}{g.maestro_id && <span title="Cuenta de maestro vinculada" style={{ color: "var(--exito)", marginLeft: 5 }}>●</span>}</td>
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
  const [niveles, setNiveles] = useState(() => {
    const m = String(g.nivel || "").match(/\d+/g) || [];
    return m.filter((n) => Number(n) >= 1 && Number(n) <= 10);
  });
  const toggleNivel = (n) => setNiveles((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
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
      const nivOrd = niveles.slice().sort((a, b) => Number(a) - Number(b));
      const nivel = nivOrd.length === 2 ? `${nivOrd[0]} y ${nivOrd[1]}` : nivOrd.join(", ");
      let r;
      if (modal.tipo === "borrar") {
        r = await fetch("/api/panel/grupos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id }) });
      } else if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: v.codigo, periodo: v.periodo, nivel, maestro: v.maestro, horario: v.horario, cupo: v.cupo, liga_meet: v.liga_meet, horario_slots }) });
      } else {
        const body = { id: g.id };
        if (puedeEditar) { body.nivel = nivel; body.horario = v.horario; body.cupo = v.cupo; body.liga_meet = v.liga_meet; body.horario_slots = horario_slots; }
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
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13, color: "var(--texto)" }}>Niveles <span style={{ fontWeight: 400, color: "var(--gris)" }}>(elige uno o varios, del 1 al 10)</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => (
                <button type="button" key={n} onClick={() => toggleNivel(n)}
                  style={{ minWidth: 38, padding: "6px 10px", borderRadius: 9, border: "1px solid var(--borde)", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: niveles.includes(n) ? "var(--naranja)" : "rgba(255,255,255,0.8)", color: niveles.includes(n) ? "#fff" : "var(--texto)" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11.5, color: "var(--gris)", marginBottom: 3, fontWeight: 600 }}>Maestro</div>
                <Sel width="100%" placeholder="Sin asignar" ariaLabel="Maestro" value={v.maestro} onChange={(val) => setV((s) => ({ ...s, maestro: val }))}
                  options={[{ value: "", label: "Sin asignar" }, ...maestros.map((m) => ({ value: m, label: m }))]} />
              </div>
              <label style={{ flex: "0 0 92px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Cupo
                <input className="u-inp" style={{ marginTop: 3 }} type="number" min="0" placeholder="0" value={v.cupo} onChange={set("cupo")} />
              </label>
            </div>
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


// Catálogo de grupos ofertados en el formulario de inscripción (los publica el superadmin).
function OfertaGrupos() {
  const [abierto, setAbierto] = useState(false);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/oferta");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cargar la oferta.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { if (abierto && !data) cargar(); /* eslint-disable-next-line */ }, [abierto]);

  async function publicar(g) {
    setBusyId(g.id); setError("");
    try {
      const r = await fetch("/api/panel/oferta", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id, publicado: !g.publicado }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      cargar();
    } catch (e) { setError(e.message); }
    setBusyId(null);
  }
  async function borrar(g) {
    if (!window.confirm(`¿Borrar el grupo ofertado ${g.codigo || g.nivel}?`)) return;
    setBusyId(g.id); setError("");
    try {
      const r = await fetch("/api/panel/oferta?id=" + encodeURIComponent(g.id), { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo borrar.");
      cargar();
    } catch (e) { setError(e.message); }
    setBusyId(null);
  }

  const grupos = data?.grupos || [];
  const puedeEditar = data?.puede_editar;
  const puedeBorrar = data?.puede_borrar;

  return (
    <div className="u-card" style={{ marginBottom: 16, overflow: "hidden" }}>
      <button onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 18px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 14.5, color: "var(--negro)" }}>
          <Ico n="inscripciones" size={17} /> Grupos ofertados en el formulario
          {data && <span className="u-badge on" style={{ marginLeft: 4 }}>{data.publicados} publicados</span>}
        </span>
        <span style={{ display: "inline-flex", transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s", color: "var(--gris)" }}>
          <Ico n="chevron" size={16} />
        </span>
      </button>

      {abierto && (
        <div style={{ padding: "0 18px 18px" }}>
          <p style={{ fontSize: 12.5, color: "var(--gris)", marginBottom: 12, maxWidth: "72ch" }}>
            Estos son los horarios que ve el aspirante en el formulario de inscripción. Publica aquí lo que se oferta este periodo;
            los grupos operativos reales (con maestro y Meet) se crean después, ya con el cotejo.
          </p>
          {error && <div className="u-err" style={{ marginBottom: 12 }}>{error}</div>}
          {puedeEditar && (
            <button className="u-btn" style={{ marginBottom: 12 }} onClick={() => setModal({ tipo: "nuevo" })}>
              <Ico n="plus" size={15} /> Nuevo grupo ofertado
            </button>
          )}
          {cargando ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
          ) : !grupos.length ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--gris)" }}>Aún no publicas grupos. El formulario solo mostrará “Requiero examen de ubicación”.</div>
          ) : (
            <div className="u-tablewrap">
              <table className="u-table">
                <thead>
                  <tr><th>Código</th><th>Nivel</th><th>Horario</th><th style={{ textAlign: "center" }}>Cupo</th><th>Estado</th><th style={{ textAlign: "right" }}>Acciones</th></tr>
                </thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.id} style={{ opacity: g.publicado ? 1 : 0.55 }}>
                      <td style={{ fontWeight: 700 }}>{g.codigo || "—"}</td>
                      <td><span className="u-rol">{g.nivel || "—"}</span></td>
                      <td style={{ color: "var(--gris)", fontSize: 13 }}>
                        {fmtDias(g.dias) && <div style={{ color: "var(--texto)", fontWeight: 600 }}>{fmtDias(g.dias)}</div>}
                        <div>{g.horario || "—"}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{g.cupo ?? "—"}</td>
                      <td><span className={"u-badge " + (g.publicado ? "on" : "off")}>{g.publicado ? "Publicado" : "Oculto"}</span></td>
                      <td>
                        <div className="u-acts">
                          {puedeEditar && <button className="u-mini" onClick={() => setModal({ tipo: "editar", grupo: g })}>Editar</button>}
                          {puedeEditar && <button className="u-mini" onClick={() => publicar(g)} disabled={busyId === g.id}>{g.publicado ? "Ocultar" : "Publicar"}</button>}
                          {puedeBorrar && <button className="u-mini dan" onClick={() => borrar(g)} disabled={busyId === g.id}>Borrar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && <OfertaModal modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
    </div>
  );
}

function OfertaModal({ modal, onClose, onDone }) {
  const g = modal.grupo || {};
  const [v, setV] = useState({
    codigo: g.codigo || "", periodo: g.periodo || "JUL-2026", horario: g.horario || "",
    cupo: g.cupo != null ? String(g.cupo) : "", orden: g.orden != null ? String(g.orden) : "",
  });
  const [niveles, setNiveles] = useState(() => (String(g.nivel || "").match(/\d+/g) || []).filter((n) => Number(n) >= 1 && Number(n) <= 10));
  const [dias, setDias] = useState(() => String(g.dias || "").split(",").map((s) => s.trim()).filter(Boolean));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (arr, setArr, n) => setArr(arr.includes(n) ? arr.filter((x) => x !== n) : [...arr, n]);
  const DIAS = [["1", "Lun"], ["2", "Mar"], ["3", "Mié"], ["4", "Jue"], ["5", "Vie"], ["6", "Sáb"], ["7", "Dom"]];

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const nivOrd = niveles.slice().sort((a, b) => Number(a) - Number(b));
      const nivel = nivOrd.length === 2 ? `${nivOrd[0]} y ${nivOrd[1]}` : nivOrd.join(", ");
      const diasOrd = dias.slice().sort((a, b) => Number(a) - Number(b)).join(",");
      const body = { codigo: v.codigo, periodo: v.periodo, nivel, horario: v.horario, dias: diasOrd, cupo: v.cupo, orden: v.orden };
      let r;
      if (modal.tipo === "nuevo") {
        r = await fetch("/api/panel/oferta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, publicado: true }) });
      } else {
        r = await fetch("/api/panel/oferta", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id, ...body }) });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>{modal.tipo === "nuevo" ? "Nuevo grupo ofertado" : "Editar grupo ofertado"}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="u-inp" style={{ flex: "1 1 140px" }} placeholder="Código (ej. N1-A)" value={v.codigo} onChange={set("codigo")} />
          <input className="u-inp" style={{ flex: "0 0 110px" }} placeholder="Periodo" value={v.periodo} onChange={set("periodo")} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>Niveles <span style={{ fontWeight: 400, color: "var(--gris)" }}>(1 al 10)</span></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => (
            <button type="button" key={n} onClick={() => toggle(niveles, setNiveles, n)}
              style={{ minWidth: 36, padding: "6px 9px", borderRadius: 9, border: "1px solid var(--borde)", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: niveles.includes(n) ? "var(--naranja)" : "rgba(255,255,255,0.8)", color: niveles.includes(n) ? "#fff" : "var(--texto)" }}>{n}</button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>Días</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
          {DIAS.map(([val, lab]) => (
            <button type="button" key={val} onClick={() => toggle(dias, setDias, val)}
              style={{ padding: "6px 11px", borderRadius: 9, border: "1px solid var(--borde)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background: dias.includes(val) ? "var(--naranja)" : "rgba(255,255,255,0.8)", color: dias.includes(val) ? "#fff" : "var(--texto)" }}>{lab}</button>
          ))}
        </div>
        <input className="u-inp" placeholder="Horario que ve el alumno (ej. 5:00 pm - 7:00 pm)" value={v.horario} onChange={set("horario")} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 90px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Cupo (opcional)
            <input className="u-inp" style={{ marginTop: 3 }} type="number" min="0" value={v.cupo} onChange={set("cupo")} />
          </label>
          <label style={{ flex: "0 0 90px", fontSize: 11.5, color: "var(--gris)", fontWeight: 600 }}>Orden
            <input className="u-inp" style={{ marginTop: 3 }} type="number" value={v.orden} onChange={set("orden")} />
          </label>
        </div>
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : modal.tipo === "nuevo" ? "Publicar" : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}


export default Grupos;
