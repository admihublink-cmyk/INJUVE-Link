"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const DIAS = { "1": "Lun", "2": "Mar", "3": "Mié", "4": "Jue", "5": "Vie", "6": "Sáb", "7": "Dom" };
const fmtDias = (csv) => String(csv || "").split(",").map((s) => s.trim()).filter(Boolean).map((n) => DIAS[n] || "").filter(Boolean).join(" · ");

export default function Examen() {
  const [preguntas, setPreguntas] = useState(null);
  const [resp, setResp] = useState({});
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);

  useEffect(() => {
    fetch("/api/examen").then((r) => r.json()).then((d) => setPreguntas(d.preguntas || [])).catch(() => setPreguntas([]));
  }, []);

  const contestadas = Object.keys(resp).length;
  const listo = preguntas && contestadas === preguntas.length && preguntas.length > 0;

  async function enviar() {
    setEnviando(true); setError("");
    try {
      const r = await fetch("/api/examen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, respuestas: resp }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo calificar.");
      setRes(d);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(e.message); }
    setEnviando(false);
  }

  const wrap = { maxWidth: 720, margin: "0 auto", padding: "24px 18px 60px" };
  const card = { background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 18, padding: 22, boxShadow: "0 18px 40px -24px rgba(150,84,8,0.35)", marginBottom: 16 };
  const inp = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid rgba(0,0,0,0.15)", fontSize: 15, marginTop: 6, fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(900px 600px at 15% -10%, rgba(241,139,17,0.18), transparent 60%), #FEF5EA", fontFamily: "var(--font-cuerpo,-apple-system,Segoe UI,Roboto,Arial,sans-serif)", color: "#2B2118" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", maxWidth: 720, margin: "0 auto" }}>
        <img src="/logos/injuve-link.png" alt="INJUVE Link" style={{ height: 30 }} />
        <Link href="/" style={{ color: "#8A6A33", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>Inicio</Link>
      </header>

      <div style={wrap}>
        {res ? (
          <div style={card}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#B8650A" }}>Tu resultado</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "14px 0" }}>
              <div style={{ padding: "14px 22px", borderRadius: 14, background: "#FFF1DE", textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: "#B8650A", lineHeight: 1 }}>{res.puntaje}<span style={{ fontSize: 18 }}>/100</span></div>
                <div style={{ fontSize: 13, color: "#8A6A33" }}>{res.correctas} de {res.total} correctas</div>
              </div>
              <div style={{ padding: "14px 22px", borderRadius: 14, background: "#E7F5EC", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1B7A3D", lineHeight: 1.1 }}>Nivel {res.nivel}</div>
                <div style={{ fontSize: 13, color: "#1B7A3D" }}>tu nivel sugerido</div>
              </div>
            </div>
            {res.grupos?.length > 0 ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>Grupos a los que te puedes inscribir</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 8 }}>
                  {res.grupos.map((g, i) => (
                    <li key={i} style={{ background: "rgba(241,139,17,0.08)", borderRadius: 12, padding: "10px 14px" }}>
                      <b>{g.codigo || ("Nivel " + g.nivel)}</b>
                      <span style={{ color: "#8A6A33" }}>{fmtDias(g.dias) ? " · " + fmtDias(g.dias) : ""}{g.horario ? " · " + g.horario : ""}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p style={{ color: "#8A6A33" }}>Aún no hay grupos publicados para tu nivel. Al inscribirte, el equipo te asignará el grupo correcto.</p>
            )}
            <Link href="/inscripcion" style={{ display: "inline-block", marginTop: 18, background: "#F18B11", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, textDecoration: "none" }}>
              Continuar con mi inscripción →
            </Link>
          </div>
        ) : (
          <>
            <div style={card}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#B8650A" }}>Examen de ubicación</h1>
              <p style={{ color: "#6B5A44", marginTop: 6 }}>
                Responde todas las preguntas. Al terminar te damos tu puntaje, tu nivel sugerido y los grupos a los que te puedes inscribir. Es sin tiempo límite.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <label style={{ flex: "1 1 220px", fontSize: 13, color: "#6B5A44" }}>Nombre (opcional)
                  <input style={inp} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
                </label>
                <label style={{ flex: "1 1 220px", fontSize: 13, color: "#6B5A44" }}>Correo (opcional)
                  <input style={inp} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tucorreo@ejemplo.com" />
                </label>
              </div>
            </div>

            {preguntas === null ? (
              <div style={{ ...card, textAlign: "center", color: "#8A6A33" }}>Cargando…</div>
            ) : preguntas.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: "#8A6A33" }}>El examen aún no está disponible. Vuelve más tarde.</div>
            ) : (
              <>
                {preguntas.map((p, i) => (
                  <div key={p.id} style={card}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>{i + 1}. {p.pregunta}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {(p.opciones || []).map((op, j) => {
                        const sel = Number(resp[p.id]) === j;
                        return (
                          <button key={j} type="button" onClick={() => setResp((s) => ({ ...s, [p.id]: j }))}
                            style={{ textAlign: "left", padding: "11px 14px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontSize: 15,
                              border: sel ? "2px solid #F18B11" : "1px solid rgba(0,0,0,0.15)", background: sel ? "#FFF1DE" : "#fff", color: "#2B2118" }}>
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {error && <div style={{ ...card, background: "#FDECEC", color: "#B3261E", borderColor: "transparent" }}>{error}</div>}
                <div style={{ position: "sticky", bottom: 14 }}>
                  <button onClick={enviar} disabled={!listo || enviando}
                    style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: listo ? "pointer" : "default", fontFamily: "inherit",
                      fontSize: 16, fontWeight: 800, color: "#fff", background: listo ? "#F18B11" : "#D9C4A8", boxShadow: "0 12px 26px -12px rgba(241,139,17,0.9)" }}>
                    {enviando ? "Calificando…" : listo ? "Ver mi nivel" : `Contesta las ${preguntas.length} preguntas (${contestadas}/${preguntas.length})`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
