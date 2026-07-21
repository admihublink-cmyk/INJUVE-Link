"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Globo3D from "../components/Globo3D";

export default function Login() {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const r = await fetch("/api/alumno/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, whatsapp }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No pudimos iniciar tu sesión.");
      router.push("/alumno");
    } catch (err) {
      setError(err.message);
      setCargando(false);
    }
  }

  return (
    <main className="login-fondo">
      <div className="login-card entra">
        <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
          <Globo3D size={190} conTexto />
        </div>
        <p className="sub">La Nueva Escuela INJUVE · Portal del alumno</p>
        <form onSubmit={entrar}>
          <input
            type="text"
            placeholder="Clave de alumno (INJL-26-0000)"
            value={clave}
            onChange={(e) => setClave(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="username"
            aria-label="Clave de alumno"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="WhatsApp (10 dígitos)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
            autoComplete="tel"
            aria-label="WhatsApp"
          />
          <button type="submit" className="btn btn-negro" disabled={cargando}>
            {cargando ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
        {error && (
          <p className="nota" role="status" style={{ background: "rgba(179,38,30,0.35)", borderRadius: 12, padding: "10px 14px" }}>
            {error}
          </p>
        )}
        <p className="nota">Usa la clave que te llegó por correo y WhatsApp al inscribirte.</p>
        <p className="nota">
          ¿Aún no eres parte? <Link href="/inscripcion">Inscríbete aquí</Link>
        </p>
      </div>
    </main>
  );
}
