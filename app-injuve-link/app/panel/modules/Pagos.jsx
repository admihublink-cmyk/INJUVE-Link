"use client";
import { useState, useEffect } from "react";
import { PageHead, Sel } from "../ui";

function Pagos() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("JUL-2026");
  const [detalle, setDetalle] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/pagos?periodo=" + encodeURIComponent(periodo));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los pagos.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo]);

  async function marcar(p, estado) {
    setError("");
    try {
      const r = await fetch("/api/panel/pagos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maestro_id: p.maestro_id, periodo, estado, monto: p.monto }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      cargar();
    } catch (e) { setError(e.message); }
  }

  const rows = data?.rows || [];
  const puede = data?.puede_procesar;
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");

  return (
    <div>
      <PageHead ico="pagos" title="Pago a maestros" sub={`Calculado desde la asistencia: horas impartidas × $${data?.tarifa_hora || 200}.`}
        right={<Sel width={150} ariaLabel="Periodo" value={periodo} onChange={(val) => setPeriodo(val)}
          options={(data?.periodos && data.periodos.length ? data.periodos : ["JUL-2026"]).map((p) => ({ value: p, label: p }))} />} />

      {data && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 18 }}>
          {[["Total del periodo", data.total, "var(--naranja-osc)"], ["Pagado", data.pagado, "var(--exito)"], ["Pendiente", data.pendiente, "var(--alerta)"]].map(([t, v, c]) => (
            <div key={t} style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--sombra)" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c, fontFamily: "var(--font-titulo),sans-serif" }}>{money(v)}</div>
              <div style={{ fontSize: 13, color: "var(--gris)", marginTop: 3 }}>{t}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>
            Aún no hay clases impartidas en {periodo}. El pago aparece automáticamente cuando los maestros toman asistencia.
          </div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr><th>Maestro</th><th style={{ textAlign: "center" }}>Clases</th><th style={{ textAlign: "center" }}>Horas</th><th>Monto</th><th>Documentos</th><th>Estado</th><th style={{ textAlign: "right" }}>Acción</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.maestro_id}>
                    <td style={{ fontWeight: 600 }}>{p.maestro}</td>
                    <td style={{ textAlign: "center" }}>{p.clases}</td>
                    <td style={{ textAlign: "center" }}>{p.horas} h</td>
                    <td style={{ fontWeight: 700 }}>{money(p.monto)}</td>
                    <td>{(() => { const d = p.docs; const s = !d ? ["—", "rgba(110,98,88,.12)", "var(--gris-2)"] : d.listo_pago ? ["Listo para pago", "rgba(27,122,61,.15)", "var(--exito)"] : d.factura_subida ? ["Factura en revisión", "rgba(45,125,210,.15)", "var(--info)"] : d.prereqs_ok ? ["Falta factura", "var(--naranja-claro)", "var(--naranja-osc)"] : [`${d.aprobados}/${d.total} docs`, "rgba(110,98,88,.12)", "var(--gris)"]; return <span className="u-badge" style={{ background: s[1], color: s[2] }}>{s[0]}</span>; })()}</td>
                    <td><span className="u-badge" style={p.estado === "pagado" ? { background: "var(--exito-bg)", color: "var(--exito)" } : { background: "var(--naranja-claro)", color: "var(--naranja-osc)" }}>{p.estado}</span></td>
                    <td>
                      <div className="u-acts">
                        <button className="u-mini" onClick={() => setDetalle(p)}>Ver detalle</button>
                        {puede && <button className="u-mini" onClick={() => marcar(p, p.estado === "pagado" ? "pendiente" : "pagado")}>{p.estado === "pagado" ? "Marcar pendiente" : "Marcar pagado"}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalle && <ReporteMaestroModal pago={detalle} periodo={periodo} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function ReporteMaestroModal({ pago, periodo, onClose }) {
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
  const detalle = pago.detalle || [];
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtF = (f) => { const dt = new Date(f + "T00:00:00"); return DIAS[dt.getDay()] + " " + dt.getDate() + " " + MES[dt.getMonth()]; };

  function descargar() {
    const filas = [["Fecha", "Grupo", "Nivel", "Horas", "Monto"]];
    detalle.forEach((d) => filas.push([d.fecha, d.grupo, d.nivel, d.horas, d.monto]));
    filas.push(["", "", "TOTAL", pago.horas, pago.monto]);
    const csv = filas.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte_" + (pago.maestro || "maestro").replace(/\s+/g, "_") + "_" + periodo + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <div className="u-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <h3>{pago.maestro}</h3>
            <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>Clases impartidas · {periodo}</p>
          </div>
          <button className="u-btn sec" onClick={descargar}>⬇ Descargar</button>
        </div>

        <div style={{ display: "flex", gap: 18, margin: "12px 0 14px" }}>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{pago.clases}</b> <span style={{ color: "var(--gris)", fontSize: 13 }}>clases</span></div>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{pago.horas}</b> <span style={{ color: "var(--gris)", fontSize: 13 }}>horas</span></div>
          <div><b style={{ fontSize: 20, color: "var(--naranja-osc)" }}>{money(pago.monto)}</b></div>
        </div>

        <div className="u-tablewrap" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="u-table">
            <thead><tr><th>Fecha</th><th>Grupo</th><th>Nivel</th><th style={{ textAlign: "center" }}>Horas</th><th>Monto</th></tr></thead>
            <tbody>
              {detalle.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gris)", padding: 20 }}>Sin clases impartidas.</td></tr>
                : detalle.map((d, i) => (
                  <tr key={i}>
                    <td style={{ textTransform: "capitalize" }}>{fmtF(d.fecha)}</td>
                    <td style={{ fontWeight: 700 }}>{d.grupo}</td>
                    <td><span className="u-rol">{d.nivel}</span></td>
                    <td style={{ textAlign: "center" }}>{d.horas}</td>
                    <td style={{ fontWeight: 600 }}>{money(d.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="u-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}


export default Pagos;
