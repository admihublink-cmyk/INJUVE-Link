"use client";
import { useState, useEffect, useRef } from "react";
import { Ico, PageHead } from "../ui";

const fmtMonto = (n) => "$" + (Number(n) || 0).toLocaleString("es-MX");
const fmtFecha = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? String(s).slice(0, 10) : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

function Cotejo() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("JUL-2026");
  const [archivo, setArchivo] = useState(null); // {nombre, base64}
  const [prev, setPrev] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [hecho, setHecho] = useState(null);
  const inputRef = useRef(null);

  async function cargar() {
    try {
      const r = await fetch("/api/panel/cotejo");
      const d = await r.json().catch(() => ({}));
      if (r.ok) setData(d);
    } catch {}
  }
  useEffect(() => { cargar(); }, []);

  function elegirArchivo(e) {
    const f = e.target.files?.[0];
    setError(""); setPrev(null); setHecho(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || "").split(",")[1] || "";
      setArchivo({ nombre: f.name, base64 });
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsDataURL(f);
  }

  async function previsualizar() {
    if (!archivo) return;
    setCargando(true); setError(""); setPrev(null); setHecho(null);
    try {
      const r = await fetch("/api/panel/cotejo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "preview", periodo, archivo_base64: archivo.base64 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo analizar el archivo.");
      setPrev(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }

  async function confirmar() {
    if (!archivo || !prev) return;
    setConfirmando(true); setError("");
    try {
      const r = await fetch("/api/panel/cotejo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "confirmar", periodo, archivo_base64: archivo.base64 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo confirmar.");
      setHecho(d); setPrev(null); setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      cargar();
    } catch (e) { setError(e.message); }
    setConfirmando(false);
  }

  const R = prev?.resumen;

  return (
    <div>
      <PageHead ico="cotejo" title="Cotejo y pagos"
        sub="Sube las transacciones de Banorte. Cruzamos contra el padrón y activamos el acceso solo de los que pagaron." />

      {/* Tarjetas de estado */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { n: data?.registrados, t: "Registrados", c: "var(--negro)" },
          { n: data?.pagados, t: "Con acceso (pagados)", c: "var(--exito)" },
          { n: data?.sin_pago, t: "Sin pago", c: "var(--alerta)" },
          { n: data?.transacciones_procesadas, t: "Transacciones procesadas", c: "var(--naranja-osc)" },
        ].map((s, i) => (
          <div key={i} className="u-card" style={{ padding: "12px 18px", minWidth: 130 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.c, lineHeight: 1.1 }}>{(s.n ?? 0).toLocaleString("es-MX")}</div>
            <div style={{ fontSize: 12.5, color: "var(--gris)" }}>{s.t}</div>
          </div>
        ))}
      </div>

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      {/* Paso 1: subir archivo */}
      <div className="u-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>1 · Sube el archivo de transacciones</div>
        <p style={{ color: "var(--gris)", fontSize: 13.5, marginBottom: 14, maxWidth: "70ch" }}>
          El export de Banorte (.xlsx). Puedes subir <b>todas</b> las transacciones cada vez: solo se agregan las que aún no se han procesado,
          incluidas las que pagaron fuera de tiempo.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--gris)" }}>
            Periodo:
            <input className="u-inp" style={{ marginTop: 0, width: 120 }} value={periodo}
              onChange={(e) => setPeriodo(e.target.value.toUpperCase())} />
          </label>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={elegirArchivo}
            style={{ fontSize: 13.5 }} />
        </div>
        {archivo && (
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="u-badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              <Ico n="documentos" size={13} /> {archivo.nombre}
            </span>
            <button className="u-btn" onClick={previsualizar} disabled={cargando}>
              {cargando ? "Analizando…" : "Analizar (pre-cotejo)"}
            </button>
          </div>
        )}
      </div>

      {/* Paso 2: previsualización */}
      {R && (
        <div className="u-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>2 · Revisa antes de aplicar</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Chip n={R.aprobadas_total} t="Aprobadas en el archivo" />
            <Chip n={R.a_activar} t="Nuevos a activar" c="var(--exito)" fuerte />
            <Chip n={R.ya_activos} t="Pagaron y ya tenían acceso" />
            <Chip n={R.sin_match} t="Pagaron sin registro" c="var(--alerta)" />
            <Chip n={R.ya_procesadas} t="Ya procesadas (se omiten)" />
          </div>

          {prev.nuevos?.length > 0 && (
            <Tabla titulo={`Se les activará el acceso (${prev.nuevos.length})`} filas={prev.nuevos} verde />
          )}
          {prev.sin_match?.length > 0 && (
            <Tabla titulo={`Pagaron pero no están en el padrón (${prev.sin_match.length})`} filas={prev.sin_match}
              nota="Regístralos primero (formulario o alta manual) y vuelve a subir el archivo." alerta />
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button className="u-btn" onClick={confirmar} disabled={confirmando || R.a_activar === 0}>
              {confirmando ? "Aplicando…" : `Confirmar y activar ${R.a_activar} acceso(s)`}
            </button>
            <button className="u-btn sec" onClick={() => setPrev(null)} disabled={confirmando}>Cancelar</button>
            {R.a_activar === 0 && <span style={{ fontSize: 13, color: "var(--gris)" }}>No hay nuevos alumnos que activar en este archivo.</span>}
          </div>
        </div>
      )}

      {/* Resultado */}
      {hecho && (
        <div className="u-card" style={{ padding: 20 }}>
          <div className="aca-ok" style={{ marginBottom: 8 }}>
            <Ico n="check" size={16} /> Cotejo aplicado
          </div>
          <p style={{ fontSize: 14, color: "var(--texto)" }}>
            Se procesaron <b>{hecho.procesadas_nuevas}</b> transacciones nuevas y se activó el acceso de <b>{hecho.activados}</b> alumno(s).
            {hecho.sin_match > 0 && <> Quedaron <b>{hecho.sin_match}</b> pagos sin registro por resolver.</>}
          </p>
        </div>
      )}
    </div>
  );
}

function Chip({ n, t, c = "var(--negro)", fuerte }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,0.55)", border: fuerte ? "1.5px solid " + c : "1px solid var(--borde)" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: c, lineHeight: 1.1 }}>{(n ?? 0).toLocaleString("es-MX")}</div>
      <div style={{ fontSize: 12, color: "var(--gris)" }}>{t}</div>
    </div>
  );
}

function Tabla({ titulo, filas, nota, verde, alerta }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: verde ? "var(--exito)" : alerta ? "var(--alerta)" : "var(--texto)", marginBottom: 6 }}>{titulo}</div>
      {nota && <p style={{ fontSize: 12.5, color: "var(--gris)", marginBottom: 8 }}>{nota}</p>}
      <div className="u-card" style={{ maxHeight: 340, overflow: "auto" }}>
        <div className="u-tablewrap">
          <table className="u-table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Folio</th><th>Monto</th><th>Fecha</th><th>Cruce</th></tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id_transaccion}>
                  <td style={{ fontWeight: 600 }}>{f.nombre || "—"}</td>
                  <td style={{ color: "var(--gris)" }}>{f.correo || "—"}</td>
                  <td style={{ color: "var(--gris)" }}>{f.folio || "—"}</td>
                  <td>{fmtMonto(f.monto)}</td>
                  <td style={{ color: "var(--gris)" }}>{fmtFecha(f.fecha)}</td>
                  <td>
                    <span className="u-badge" style={f.match === "correo"
                      ? { background: "var(--exito-bg)", color: "var(--exito)" }
                      : f.match === "nombre" ? { background: "var(--info-bg)", color: "var(--info)" }
                      : { background: "#F1EEE9", color: "var(--gris-2)" }}>{f.match}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Cotejo;
