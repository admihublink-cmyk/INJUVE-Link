"use client";
import { useState, useEffect } from "react";
import { Ico, PageHead, fmtHorario } from "../ui";

function Dashboard({ u }) {
  const primer = (u.nombre || "").trim().split(/\s+/)[0] || "equipo";
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/panel/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setErr(true));
  }, []);
  const num = (v) => (d ? Number(v).toLocaleString("es-MX") : err ? "—" : "…");
  const cards = [
    ["Alumnos activos", d && d.alumnos, d ? `${d.en_grupo} en grupo · ${d.sin_grupo} sin grupo` : null],
    ["Grupos activos", d && d.grupos, null],
    ["Maestros", d && d.maestros, null],
    ["Casos por resolver", d && d.casos, null],
  ];
  const driveMsg = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("drive") : null;
  return (
    <div>
      <PageHead ico="dashboard" title="Dashboard general" sub={`Hola, ${primer}. Este es el resumen del programa.`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
        {cards.map(([t, v, sub]) => (
          <div key={t} className="u-glass" style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "var(--naranja-osc)", lineHeight: 1, fontFamily: "var(--font-titulo),sans-serif" }}>{num(v)}</div>
            <div style={{ fontSize: 13.5, color: "var(--gris)", marginTop: 6 }}>{t}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--gris)", marginTop: 4, opacity: 0.85 }}>{sub}</div>}
          </div>
        ))}
      </div>
      {err && <p style={{ marginTop: 16, fontSize: 13, color: "#B3261E" }}>No se pudieron cargar las métricas.</p>}

      {driveMsg && (
        <div className={driveMsg === "ok" ? "aca-ok" : "u-err"} style={{ marginTop: 16 }}>
          {driveMsg === "ok" ? "✓ Google Drive conectado correctamente." : driveMsg === "noenv" ? "Faltan las credenciales de Google en Vercel (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." : driveMsg === "noauth" ? "Necesitas permisos de administrador para conectar Drive." : "No se pudo conectar con Google Drive. Intenta de nuevo."}
        </div>
      )}

      {d && d.puede_drive && (
        <div className="u-glass" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap", padding: "13px 16px", borderRadius: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 11, background: d.drive_conectado ? "#E7F5EC" : "var(--naranja-claro)", color: d.drive_conectado ? "#1B7A3D" : "var(--naranja-osc)", flexShrink: 0 }}><Ico n={d.drive_conectado ? "check" : "download"} size={20} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, color: "var(--negro)", fontSize: 14.5 }}>Google Drive{d.drive_conectado ? " · conectado" : ""}</div>
            <div style={{ fontSize: 13, color: "var(--gris)" }}>
              {d.drive_conectado ? `Los archivos se guardan en el Drive de ${d.drive_email || "tu cuenta"}.` : d.drive_configurado ? "Conéctalo una vez para guardar entregas y formatos en tu Drive." : "Falta poner GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel."}
            </div>
          </div>
          {d.drive_configurado && <a className="u-btn sec" href="/api/drive/connect">{d.drive_conectado ? "Reconectar" : "Conectar Google Drive"}</a>}
        </div>
      )}

      {d && Array.isArray(d.proximas) && d.proximas.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--negro)", marginTop: 34, marginBottom: 2 }}>Próximas clases</h2>
          <p style={{ color: "var(--gris)", marginBottom: 16, fontSize: 14 }}>La siguiente clase de cada grupo, según su horario semanal.</p>
          <div className="u-card">
            <div className="u-tablewrap">
              <table className="u-table">
                <thead><tr><th>Cuándo</th><th>Grupo</th><th>Hora</th><th>Maestro</th><th>Clase</th></tr></thead>
                <tbody>
                  {d.proximas.map((c, i) => {
                    const DIAS_L = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                    const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                    const dt = new Date(c.fecha + "T00:00:00");
                    const hoyMx = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
                    const esHoy = c.fecha === hoyMx;
                    return (
                      <tr key={i} style={esHoy ? { background: "#FFF8EE" } : undefined}>
                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{`${DIAS_L[dt.getDay()]} ${dt.getDate()} ${MES[dt.getMonth()]}`}{esHoy && <span style={{ color: "var(--naranja-osc)", fontSize: 11, marginLeft: 6, fontWeight: 800 }}>HOY</span>}</td>
                        <td><b>{c.codigo}</b> <span className="u-rol">N{c.nivel}</span></td>
                        <td style={{ color: "var(--gris)" }}>{(c.hora || "").slice(0, 5) || "—"}</td>
                        <td>{c.maestro || "—"}</td>
                        <td>{c.liga_meet ? <a href={c.liga_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a> : <span style={{ color: "var(--gris)" }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {d && Array.isArray(d.grupos_lista) && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--negro)", marginTop: 34, marginBottom: 2 }}>Grupos del programa</h2>
          <p style={{ color: "var(--gris)", marginBottom: 16, fontSize: 14 }}>Maestro, horario e inscritos por grupo activo.</p>
          <div className="u-card">
            <div className="u-tablewrap">
              <table className="u-table">
                <thead>
                  <tr>
                    <th>Grupo</th><th>Nivel</th><th>Maestro</th><th>Horario</th>
                    <th style={{ textAlign: "center" }}>Inscritos</th><th>Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {d.grupos_lista.map((g) => (
                    <tr key={g.codigo}>
                      <td style={{ fontWeight: 700 }}>{g.codigo}</td>
                      <td><span className="u-rol">Nivel {g.nivel}</span></td>
                      <td>{g.maestro || "—"}</td>
                      <td style={{ color: "var(--gris)" }}>
                        {fmtHorario(g.horario_slots)
                          ? <div style={{ color: "var(--texto)", fontWeight: 600 }}>{fmtHorario(g.horario_slots)}</div>
                          : <div style={{ fontSize: 13 }}>{g.horario || "—"}</div>}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {g.inscritos}<span style={{ color: "var(--gris)", fontWeight: 400 }}> / {g.cupo}</span>
                      </td>
                      <td>
                        {g.liga_meet
                          ? <a href={g.liga_meet} target="_blank" rel="noopener noreferrer" style={{ color: "var(--naranja-osc)", fontWeight: 700 }}>Meet ↗</a>
                          : <span style={{ color: "var(--gris)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default Dashboard;
