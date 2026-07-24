"use client";
import { useState, useEffect, useRef } from "react";
import { Ico, PageHead, Sel } from "../ui";

function docIniciales(n) {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  let i = "";
  if (p.length >= 2) i = p[0][0] + p[p.length - 1][0];
  else if (p.length === 1) i = p[0].slice(0, 2);
  return i.toUpperCase() || "?";
}
function docHue(n) { let h = 0; const s = String(n || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function DocAvatar({ nombre, size = 44 }) {
  const h = docHue(nombre);
  return <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: Math.round(size * 0.36), background: `hsl(${h} 70% 85%)`, color: `hsl(${h} 55% 26%)`, border: "1px solid rgba(255,255,255,0.65)" }}>{docIniciales(nombre)}</div>;
}
function DocBadge({ estado, locked }) {
  const m = { pendiente: ["Pendiente", "rgba(110,98,88,.14)", "#6E6258"], subido: ["En revisión", "rgba(45,125,210,.16)", "#1C5A96"], aprobado: ["Aprobado", "rgba(27,122,61,.16)", "#177A3B"], rechazado: ["Rechazado", "rgba(179,38,30,.14)", "#B3261E"] };
  const [t, bg, c] = locked ? ["En espera", "rgba(110,98,88,.1)", "#8A8178"] : (m[estado] || m.pendiente);
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", background: bg, color: c }}>{t}</span>;
}
function DocBarra({ label, ap, tot, sub }) {
  const pct = tot ? Math.round((ap / tot) * 100) : 0;
  const full = tot > 0 && ap === tot;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: "var(--texto)", fontWeight: 600 }}>{label}</span>
        <span style={{ color: full ? "#177A3B" : "var(--gris)", fontWeight: 700 }}>{ap}/{tot}{sub > ap ? ` · ${sub - ap} por revisar` : ""}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "rgba(110,98,88,.14)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: full ? "#3B9E63" : "var(--naranja)", borderRadius: 999, transition: "width .3s" }} />
      </div>
    </div>
  );
}

function Documentos() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [sel, setSel] = useState("");
  const [trabajando, setTrabajando] = useState("");
  const [linkModal, setLinkModal] = useState(null);
  const [linkVal, setLinkVal] = useState("");
  const [rechazo, setRechazo] = useState(null);
  const [notaVal, setNotaVal] = useState("");
  const [abiertos, setAbiertos] = useState({ basico: false, honorarios: true });
  const fileRef = useRef(null);
  const objetivoRef = useRef(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const p = new URLSearchParams();
      if (periodo) p.set("periodo", periodo);
      if (sel) p.set("maestro", sel);
      const r = await fetch("/api/panel/documentos?" + p.toString());
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los documentos.");
      setData(d);
      if (d.periodo && !periodo) setPeriodo(d.periodo);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, [periodo, sel]);

  const esAdmin = !!(data && data.es_admin);
  const vista = data && data.vista;
  const periodos = (data && data.periodos && data.periodos.length) ? data.periodos : [periodo || "JUL-2026"];

  function fileB64(file) {
    return new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(",")[1] || ""); rd.onerror = () => rej(new Error("No se pudo leer el archivo.")); rd.readAsDataURL(file); });
  }
  function pedirArchivo(categoria, tipo) { objetivoRef.current = { categoria, tipo }; if (fileRef.current) fileRef.current.click(); }
  async function alArchivo(e) {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    const obj = objetivoRef.current; objetivoRef.current = null;
    if (!file || !obj) return;
    if (file.size > 3.4 * 1024 * 1024) { setError("El archivo es muy grande (máx. ~3 MB)."); return; }
    const key = obj.categoria + ":" + obj.tipo; setTrabajando(key); setError(""); setOk("");
    try {
      const dataB64 = await fileB64(file);
      const body = { categoria: obj.categoria, tipo: obj.tipo, nombre: file.name, mime: file.type, data: dataB64 };
      if (obj.categoria === "honorarios") body.periodo = periodo;
      if (esAdmin && sel) body.maestro_id = sel;
      const r = await fetch("/api/panel/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo subir.");
      setOk("Documento guardado."); await cargar();
    } catch (e) { setError(e.message); }
    setTrabajando("");
  }
  async function guardarLink() {
    if (!linkModal) return;
    const v = linkVal.trim(); if (!v) { setError("Pega el o los links."); return; }
    const key = "honorarios:" + linkModal.tipo; setTrabajando(key); setError(""); setOk("");
    try {
      const body = { categoria: "honorarios", tipo: linkModal.tipo, enlace: v, periodo };
      if (esAdmin && sel) body.maestro_id = sel;
      const r = await fetch("/api/panel/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      setLinkModal(null); setOk("Evidencias guardadas."); await cargar();
    } catch (e) { setError(e.message); }
    setTrabajando("");
  }
  async function decidir(id, accion, nota) {
    setTrabajando("dec:" + id); setError(""); setOk("");
    try {
      const r = await fetch("/api/panel/documentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, accion, nota }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo actualizar.");
      setRechazo(null); await cargar();
    } catch (e) { setError(e.message); }
    setTrabajando("");
  }

  function normLink(u) { return /^https?:/i.test(u) ? u : ("https://" + u); }

  function renderFila(cat, it) {
    const key = cat + ":" + it.tipo;
    const busy = trabajando === key;
    const tiene = it.estado !== "pendiente";
    const verHref = it.es_link ? (it.enlace ? normLink(it.enlace) : null) : it.link;
    return (
      <div key={it.tipo} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid var(--borde)" }}>
        <div style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "center", color: it.estado === "aprobado" ? "#177A3B" : it.locked ? "#B9AFA4" : "var(--naranja-osc)" }}>
          <Ico n={it.estado === "aprobado" ? "check" : "documentos"} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, color: "var(--texto)", fontSize: 14.5 }}>{it.label}</div>
          {it.estado === "rechazado" && it.nota && <div style={{ fontSize: 12.5, color: "#B3261E", marginTop: 2 }}>Motivo: {it.nota}</div>}
          {it.locked && <div style={{ fontSize: 12.5, color: "var(--gris)", marginTop: 2 }}>Se habilita al aprobar evidencias, ficha, cotización y lista de asistencia.</div>}
        </div>
        <DocBadge estado={it.estado} locked={it.locked} />
        <div className="u-acts" style={{ minWidth: 150, justifyContent: "flex-end" }}>
          {verHref && <a className="u-mini" href={verHref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Ver ↗</a>}
          {!it.locked && (it.es_link
            ? <button className="u-mini" disabled={busy} onClick={() => { setLinkVal(it.enlace || ""); setError(""); setLinkModal({ tipo: it.tipo }); }}>{busy ? "…" : (tiene ? "Reemplazar" : "Subir")}</button>
            : <button className="u-mini" disabled={busy} onClick={() => pedirArchivo(cat, it.tipo)}>{busy ? "…" : (tiene ? "Reemplazar" : "Subir")}</button>)}
          {esAdmin && tiene && it.estado !== "aprobado" && <button className="u-mini" disabled={busy} style={{ color: "#177A3B", borderColor: "rgba(23,122,59,.4)", fontWeight: 700 }} onClick={() => decidir(it.id, "aprobar")}>Aprobar</button>}
          {esAdmin && tiene && it.estado !== "rechazado" && <button className="u-mini dan" disabled={busy} onClick={() => { setNotaVal(""); setRechazo({ id: it.id, label: it.label }); }}>Rechazar</button>}
        </div>
      </div>
    );
  }

  function renderSeccion(titulo, sub, cat, items) {
    const abierto = abiertos[cat];
    const lista = items || [];
    const ap = lista.filter((x) => x.estado === "aprobado").length;
    const full = lista.length > 0 && ap === lista.length;
    return (
      <div className="u-card" style={{ padding: "8px 18px", marginBottom: 16 }}>
        <button onClick={() => setAbiertos((a) => ({ ...a, [cat]: !a[cat] }))} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 0" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--negro)" }}>{titulo}</div>
            {sub && <div style={{ fontSize: 13, color: "var(--gris)", marginTop: 2 }}>{sub}</div>}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: full ? "rgba(27,122,61,.15)" : "rgba(241,139,17,0.14)", color: full ? "#177A3B" : "var(--naranja-osc)" }}>{ap}/{lista.length}</span>
            <span style={{ display: "inline-flex", transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s", color: "var(--gris)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </span>
        </button>
        {abierto && <div style={{ marginTop: 2, paddingBottom: 6 }}>{lista.map((it) => renderFila(cat, it))}</div>}
      </div>
    );
  }

  const pillVerde = { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, background: "rgba(27,122,61,.15)", color: "#177A3B", fontWeight: 800, fontSize: 13 };

  return (
    <div>
      <PageHead ico="documentos" title="Documentos"
        sub={esAdmin ? "Revisa y da el visto bueno a los documentos de cada maestro. La factura se habilita al aprobar los de honorarios." : "Sube tus documentos básicos y los de honorarios del periodo. La factura se habilita cuando administración aprueba los primeros."} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {esAdmin && vista === "detalle" && <button className="u-btn sec" onClick={() => setSel("")}>← Todos</button>}
        <Sel width={150} ariaLabel="Periodo" value={periodo} onChange={setPeriodo} options={periodos.map((p) => ({ value: p, label: p }))} />
        {esAdmin && vista === "detalle" && data && data.maestros && data.maestros.length > 0 &&
          <Sel width={220} ariaLabel="Maestro" value={sel} onChange={setSel} options={data.maestros.map((m) => ({ value: m.id, label: m.nombre }))} />}
      </div>

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}
      {ok && <div className="aca-ok" style={{ marginBottom: 14 }}><Ico n="check" size={16} /> {ok}</div>}

      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={alArchivo} />

      {cargando && !data ? (
        <div className="u-card" style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
      ) : vista === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {(data.maestros || []).map((m) => (
            <button key={m.id} className="u-card" onClick={() => setSel(m.id)} style={{ textAlign: "left", cursor: "pointer", padding: 16, font: "inherit", color: "inherit", display: "block", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DocAvatar nombre={m.nombre} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 750, color: "var(--negro)", fontSize: 15 }}>{m.nombre}</div>
                  <div style={{ fontSize: 12.5, color: m.por_revisar > 0 ? "#1C5A96" : "var(--gris)", fontWeight: m.por_revisar > 0 ? 700 : 400 }}>{m.por_revisar > 0 ? `${m.por_revisar} por revisar` : "Sin pendientes"}</div>
                </div>
                {m.listo_pago && <span style={pillVerde}><Ico n="check" size={13} /> Listo</span>}
              </div>
              <div style={{ marginTop: 10 }}>
                <DocBarra label="Básicos" ap={m.basicos_aprobados} tot={m.basicos_total} sub={m.basicos_subidos} />
                <DocBarra label={`Honorarios · ${periodo}`} ap={m.honorarios_aprobados} tot={m.honorarios_total} sub={m.honorarios_subidos} />
              </div>
            </button>
          ))}
        </div>
      ) : vista === "detalle" && data ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16, flexWrap: "wrap" }}>
            <DocAvatar nombre={data.maestro.nombre} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--negro)" }}>{data.maestro.nombre}</div>
              {data.maestro.correo && <div style={{ fontSize: 13, color: "var(--gris)" }}>{data.maestro.correo}</div>}
            </div>
            {data.listo_pago && <span style={{ ...pillVerde, fontSize: 14, padding: "7px 15px" }}><Ico n="check" size={15} /> Listo para pago</span>}
          </div>
          {renderSeccion("Documentos básicos", "Una sola vez por maestro.", "basico", data.basicos)}
          {renderSeccion(`Documentos de honorarios · ${periodo}`, "Por periodo · la factura se habilita al aprobar los primeros cuatro.", "honorarios", data.honorarios)}
        </div>
      ) : (
        <div className="u-card" style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Sin datos.</div>
      )}

      {linkModal && (
        <div className="u-modal-bg" onClick={() => setLinkModal(null)}>
          <div className="u-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Evidencias (links de Drive)</h3>
            <p style={{ fontSize: 13.5, color: "var(--gris)", marginTop: 4 }}>Pega uno o varios links de los videos grabados en Drive (uno por línea).</p>
            <textarea className="u-inp" style={{ minHeight: 110, resize: "vertical" }} value={linkVal} onChange={(e) => setLinkVal(e.target.value)} placeholder="https://drive.google.com/…" />
            {error && <div className="u-err" style={{ marginTop: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="u-btn sec" onClick={() => setLinkModal(null)}>Cancelar</button>
              <button className="u-btn" disabled={trabajando.startsWith("honorarios:")} onClick={guardarLink}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {rechazo && (
        <div className="u-modal-bg" onClick={() => setRechazo(null)}>
          <div className="u-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Rechazar documento</h3>
            <p style={{ fontSize: 13.5, color: "var(--gris)", marginTop: 4 }}>{rechazo.label}. Explica el motivo para que el maestro lo corrija.</p>
            <textarea className="u-inp" style={{ minHeight: 90, resize: "vertical" }} value={notaVal} onChange={(e) => setNotaVal(e.target.value)} placeholder="Ej. La credencial está borrosa, falta el reverso…" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="u-btn sec" onClick={() => setRechazo(null)}>Cancelar</button>
              <button className="u-btn dan" disabled={trabajando.startsWith("dec:")} onClick={() => decidir(rechazo.id, "rechazar", notaVal)}>Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default Documentos;
