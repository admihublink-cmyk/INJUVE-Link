"use client";
import { useState } from "react";
import Link from "next/link";

const CLAVE_RE = /^INJL-\d{2}-\d{4}$/i;

export default function Reinscripcion() {
  const [clave, setClave] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!CLAVE_RE.test(clave.trim().toUpperCase())) {
      setError("Escribe tu clave de alumno tal como la recibiste (ejemplo: INJL-26-0123).");
      return;
    }
    if (!/^\d{10}$/.test(whatsapp.replace(/\D/g, ""))) {
      setError("Escribe tu WhatsApp a 10 dígitos para enviarte la liga.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/reinscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: clave.trim().toUpperCase(), whatsapp: whatsapp.replace(/\D/g, "") }),
      });
      const data = await r.json().catch(() => ({ error: "El servidor no respondió correctamente. Intenta de nuevo en un momento." }));
      if (!r.ok) throw new Error(data.error || "No pudimos registrar tu solicitud.");
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="seccion" style={{ paddingTop: 130 }}>
      <div className="container">
        <div className="form-card" style={{ maxWidth: 560 }}>
          {listo ? (
            <div className="exito" style={{ padding: "20px 0" }}>
              <h1 style={{ color: "var(--naranja-osc)", fontSize: 26 }}>¡Solicitud recibida!</h1>
              <p style={{ color: "var(--gris)", margin: "14px 0 22px" }}>
                En un máximo de 2 días hábiles te enviaremos tu liga de reinscripción por WhatsApp.
                Al confirmarse tu pago, tu acceso a la plataforma continúa automáticamente.
              </p>
              <Link href="/" className="btn btn-cta">Volver al inicio</Link>
            </div>
          ) : (
            <>
              <h1 style={{ color: "var(--naranja-osc)", fontSize: 26, marginBottom: 6 }}>
                Reinscripción de alumnos
              </h1>
              <p style={{ color: "var(--gris)", marginBottom: 22 }}>
                Si ya eres alumno de INJUVE Link no necesitas llenar el formulario de nuevo.
                Pide tu liga de pago con tu clave de alumno y continúa en tu grupo.
              </p>
              {error && (
                <p style={{ background: "#FDECEA", color: "#B3261E", padding: 12, borderRadius: 12, marginBottom: 14, fontWeight: 600 }}>
                  {error}
                </p>
              )}
              <form onSubmit={enviar} noValidate>
                <div className="campo" style={{ marginBottom: 14 }}>
                  <label htmlFor="clave">Clave de alumno <span className="req">*</span></label>
                  <input
                    id="clave"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    maxLength={12}
                    placeholder="Ej. INJL-26-0123"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <div className="campo" style={{ marginBottom: 22 }}>
                  <label htmlFor="whatsapp">WhatsApp <span className="req">*</span></label>
                  <input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="numeric"
                    placeholder="10 dígitos"
                  />
                </div>
                <button type="submit" className="btn btn-cta" disabled={enviando} style={{ width: "100%", justifyContent: "center" }}>
                  {enviando ? "Enviando…" : "Pedir mi liga de reinscripción"}
                </button>
              </form>
              <p style={{ fontSize: 13, color: "var(--gris)", marginTop: 16 }}>
                Importante: si la fecha límite de inscripciones pasa sin tu solicitud, tu acceso a la
                plataforma se pausará hasta que el equipo del INJUVE lo reactive.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
