"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Globo3D from "../components/Globo3D";

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ correo, password }),
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
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            inputMode="email"
            aria-label="Correo"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-label="Contraseña"
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
        <p className="nota">Entra con tu correo. Si es tu primer acceso, usa la contraseña que te enviamos y crea la tuya.</p>
        <p className="nota">
          ¿Aún no eres parte? <Link href="/inscripcion">Inscríbete aquí</Link>
        </p>
      </div>
    </main>
  );
}
