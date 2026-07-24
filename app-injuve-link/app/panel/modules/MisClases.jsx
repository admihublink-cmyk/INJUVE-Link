"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, Sel } from "../ui";

function MisClases() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("JUL-2026");
  const [verMaestro, setVerMaestro] = useState("");
  const [busy, setBusy] = useState(false);
  const [accId, setAccId] = useState(null);
  const [reprog, setReprog] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const qs = new URLSearchParams({ periodo });
      if (verMaestro) qs.set("maestro", verMaestro);
      const r = await fetch("/api/panel/sesiones?" + qs.toString());
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar las clases.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo, verMaestro]);

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
  const esAdmin = data?.puede_generar;
  const maestros = data?.maestros || [];
  const hoyStr = new Date().toISOString().slice(0, 10);
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtFecha = (f) => { const dt = new Date(f + "T00:00:00"); return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}`; };

  return (
    <div>
      <PageHead ico="misclases" title="Mis clases" sub={esAdmin ? "Consulta las clases de cada maestro. Puedes tomar asistencia o reprogramar por ellos si hace falta." : "Toma asistencia al iniciar tu clase y entra al Meet."}
        right={<>
          {esAdmin && (
            <Sel width={210} placeholder="Elige un maestro…" ariaLabel="Maestro" value={verMaestro} onChange={(val) => setVerMaestro(val)}
              options={maestros.map((m) => ({ value: m.id, label: m.nombre }))} />
          )}
          <Sel width={150} ariaLabel="Periodo" value={periodo} onChange={(val) => setPeriodo(val)}
            options={(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => ({ value: p, label: p }))} />
          {data?.puede_generar && <button className="u-btn" onClick={generar} disabled={busy}>{busy ? "…" : <><Ico n="calendar" size={16} /> Generar clases del periodo</>}</button>}
        </>} />

      {esAdmin && (
        <p style={{ color: "var(--gris)", fontSize: 13, marginBottom: 12 }}>
          Total de clases del periodo (todos los grupos): <b>{data.total_periodo}</b>.{verMaestro ? "" : " Elige un maestro arriba para ver y gestionar sus clases."}
        </p>
      )}
      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>
            {esAdmin
              ? (verMaestro ? "Este maestro no tiene clases en este periodo." : "Elige un maestro arriba para ver sus clases.")
              : "No tienes clases en este periodo."}
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
                        <span className="u-badge" style={s.estado === "impartida" ? { background: "var(--exito-bg)", color: "var(--exito)" } : s.estado === "reprogramada" ? { background: "var(--info-bg)", color: "var(--info)" } : { background: "var(--naranja-claro)", color: "var(--naranja-osc)" }}>{s.estado}</span>
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


export default MisClases;
