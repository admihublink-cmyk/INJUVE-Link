"use client";
import { useState, useEffect } from "react";
import { PageHead } from "../ui";

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
      <PageHead ico="maestros" title="Maestros" sub="Carga docente, teléfono y cotización por nivel. Los maestros se dan de alta en Usuarios y roles." />

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


export default Maestros;
