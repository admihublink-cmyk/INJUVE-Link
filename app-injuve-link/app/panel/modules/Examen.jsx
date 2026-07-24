"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead } from "../ui";

function Examen() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [guardandoNiv, setGuardandoNiv] = useState(false);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/examen");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cargar el examen.");
      setData(d);
      setNiveles((d.niveles || []).map((n) => ({ desde: String(n.desde), nivel: n.nivel })));
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function borrar(p) {
    if (!window.confirm("¿Borrar esta pregunta?")) return;
    try {
      const r = await fetch("/api/panel/examen?id=" + encodeURIComponent(p.id), { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar.");
      cargar();
    } catch (e) { setError(e.message); }
  }
  async function toggleActiva(p) {
    try {
      await fetch("/api/panel/examen", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, activa: !p.activa }) });
      cargar();
    } catch (e) { setError(e.message); }
  }
  async function guardarNiveles() {
    setGuardandoNiv(true); setError("");
    try {
      const r = await fetch("/api/panel/examen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ niveles }) });
      if (!r.ok) throw new Error("No se pudieron guardar los niveles.");
      cargar();
    } catch (e) { setError(e.message); }
    setGuardandoNiv(false);
  }

  const preguntas = data?.preguntas || [];
  const puede = data?.puede_editar;
  const activas = preguntas.filter((p) => p.activa).length;

  return (
    <div>
      <PageHead ico="examen" title="Examen de ubicación" sub="Edita las preguntas y el criterio de nivel. El aspirante lo presenta en injuve-link.vercel.app/examen."
        right={puede && <button className="u-btn" onClick={() => setModal({ tipo: "nueva" })}><Ico n="plus" size={16} /> Nueva pregunta</button>} />

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="u-card" style={{ padding: "12px 18px", minWidth: 120 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--negro)", lineHeight: 1.1 }}>{activas}</div>
          <div style={{ fontSize: 12.5, color: "var(--gris)" }}>Preguntas activas</div>
        </div>
        <div className="u-card" style={{ padding: "12px 18px", minWidth: 120 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--naranja-osc)", lineHeight: 1.1 }}>{data?.resultados_total ?? 0}</div>
          <div style={{ fontSize: 12.5, color: "var(--gris)" }}>Exámenes presentados</div>
        </div>
      </div>

      {/* Criterio puntaje → nivel */}
      <div className="u-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Criterio de nivel (puntaje 0–100)</div>
        <p style={{ fontSize: 12.5, color: "var(--gris)", marginBottom: 12 }}>Desde ese puntaje, el aspirante queda en ese nivel. El nivel debe coincidir con el de los grupos ofertados (ej. "1 y 2").</p>
        <div style={{ display: "grid", gap: 8 }}>
          {niveles.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--gris)" }}>Desde</span>
              <input className="u-inp" style={{ marginTop: 0, width: 80 }} type="number" min="0" max="100" value={n.desde}
                onChange={(e) => setNiveles((s) => s.map((x, j) => (j === i ? { ...x, desde: e.target.value } : x)))} />
              <span style={{ fontSize: 13, color: "var(--gris)" }}>→ Nivel</span>
              <input className="u-inp" style={{ marginTop: 0, width: 120 }} value={n.nivel}
                onChange={(e) => setNiveles((s) => s.map((x, j) => (j === i ? { ...x, nivel: e.target.value } : x)))} />
              <button className="u-mini dan" onClick={() => setNiveles((s) => s.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
        </div>
        {puede && (
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button className="u-btn sec" onClick={() => setNiveles((s) => [...s, { desde: "0", nivel: "" }])}>+ Banda</button>
            <button className="u-btn" onClick={guardarNiveles} disabled={guardandoNiv}>{guardandoNiv ? "…" : "Guardar criterio"}</button>
          </div>
        )}
      </div>

      {/* Preguntas */}
      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !preguntas.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Aún no hay preguntas. Agrega la primera.</div>
        ) : (
          <div style={{ display: "grid" }}>
            {preguntas.map((p, i) => (
              <div key={p.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--borde)", opacity: p.activa ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 600 }}>{i + 1}. {p.pregunta}</div>
                  <div className="u-acts">
                    {puede && <button className="u-mini" onClick={() => setModal({ tipo: "editar", p })}>Editar</button>}
                    {puede && <button className="u-mini" onClick={() => toggleActiva(p)}>{p.activa ? "Ocultar" : "Activar"}</button>}
                    {puede && <button className="u-mini dan" onClick={() => borrar(p)}>Borrar</button>}
                  </div>
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(p.opciones || []).map((op, j) => (
                    <span key={j} style={{ fontSize: 12.5, padding: "3px 10px", borderRadius: 999, background: j === p.correcta ? "var(--exito-bg)" : "#F1EEE9", color: j === p.correcta ? "var(--exito)" : "var(--gris-2)" }}>
                      {j === p.correcta ? "✓ " : ""}{op}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && <PreguntaModal modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
    </div>
  );
}

function PreguntaModal({ modal, onClose, onDone }) {
  const p = modal.p || {};
  const [pregunta, setPregunta] = useState(p.pregunta || "");
  const [opciones, setOpciones] = useState(() => (Array.isArray(p.opciones) && p.opciones.length ? p.opciones.slice() : ["", ""]));
  const [correcta, setCorrecta] = useState(p.correcta ?? 0);
  const [orden, setOrden] = useState(p.orden != null ? String(p.orden) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const ops = opciones.map((o) => o.trim()).filter(Boolean);
      if (!pregunta.trim() || ops.length < 2) throw new Error("Escribe la pregunta y al menos 2 opciones.");
      const corr = Math.min(correcta, ops.length - 1);
      const body = { pregunta, opciones: ops, correcta: corr, orden: orden === "" ? undefined : orden };
      let r;
      if (modal.tipo === "nueva") r = await fetch("/api/panel/examen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      else r = await fetch("/api/panel/examen", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>{modal.tipo === "nueva" ? "Nueva pregunta" : "Editar pregunta"}</h3>
        <textarea className="u-inp" placeholder="Escribe la pregunta" value={pregunta} onChange={(e) => setPregunta(e.target.value)} rows={2} style={{ resize: "vertical" }} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>Opciones <span style={{ fontWeight: 400, color: "var(--gris)" }}>(marca la correcta)</span></div>
        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          {opciones.map((op, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="correcta" checked={correcta === i} onChange={() => setCorrecta(i)} title="Correcta" />
              <input className="u-inp" style={{ marginTop: 0, flex: 1 }} placeholder={"Opción " + (i + 1)} value={op}
                onChange={(e) => setOpciones((s) => s.map((x, j) => (j === i ? e.target.value : x)))} />
              {opciones.length > 2 && <button type="button" className="u-mini dan" onClick={() => { setOpciones((s) => s.filter((_, j) => j !== i)); if (correcta >= i && correcta > 0) setCorrecta((c) => c - 1); }}>×</button>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="u-btn sec" onClick={() => setOpciones((s) => [...s, ""])}>+ Opción</button>
          <label style={{ fontSize: 12.5, color: "var(--gris)" }}>Orden
            <input className="u-inp" style={{ marginTop: 0, width: 70, marginLeft: 6 }} type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </label>
        </div>
        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cancelar</button>
          <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

export default Examen;
