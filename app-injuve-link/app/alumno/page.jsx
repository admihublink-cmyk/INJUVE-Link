"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Globo3D from "../components/Globo3D";

const ESTADO_LABEL = {
  nueva: "En revisión",
  validada: "Validada",
  liga_enviada: "Liga de pago enviada",
  pagada: "Pago confirmado",
  asignada: "Lista para clases",
  baja: "Baja",
};

export default function Alumno() {
  const router = useRouter();
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function cargar() {
    setEstado("cargando");
    try {
      const r = await fetch("/api/alumno/data");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "No pudimos cargar tu información.");
        setEstado("error");
        return;
      }
      setData(d);
      setEstado("ok");
    } catch {
      setError("Problema de conexión. Revisa tu internet e intenta de nuevo.");
      setEstado("error");
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salir() {
    try {
      await fetch("/api/alumno/login", { method: "DELETE" });
    } catch {}
    router.replace("/login");
  }

  if (estado === "cargando") {
    return (
      <main className="al-fondo">
        <div className="al-cargando">
          <Globo3D size={150} conTexto />
        </div>
      </main>
    );
  }

  if (estado === "error") {
    return (
      <main className="al-fondo">
        <div className="al-card al-error-box">
          <p style={{ color: "var(--texto)", fontSize: 16 }}>{error}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn btn-cta" onClick={cargar}>Reintentar</button>
            <Link className="btn btn-negro" href="/login">Volver a entrar</Link>
          </div>
        </div>
      </main>
    );
  }

  const a = data.alumno;
  if (a && a.password_cambiada === false) {
    return <CambiarClave nombre={a.nombre} onListo={cargar} onSalir={salir} />;
  }
  const g = data.grupo;
  const primer = (a.nombre || "").trim().split(/\s+/)[0] || "alumno(a)";
  const tieneClase = Boolean(g && g.liga_meet);

  return (
    <main className="al-fondo">
      <header className="al-top">
        <img src="/logos/injuve-link.png" alt="INJUVE Link" className="al-logo" />
        <button className="al-salir" onClick={salir}>Salir</button>
      </header>

      <div className="al-wrap">
        <div className="al-hola entra">
          <h1>¡Hola, {primer}! 👋</h1>
          <p>
            Tu clave de alumno: <strong className="al-clave">{a.folio}</strong>
          </p>
        </div>

        <section className={"al-clase entra d1" + (tieneClase ? "" : " pendiente")}>
          {tieneClase ? (
            <>
              <div className="al-clase-info">
                <span className="al-pill">Tu clase en vivo</span>
                <h2>{g.nivel ? "Nivel " + g.nivel : "Tu grupo"} · {g.codigo}</h2>
                <p>
                  {g.horario || "Horario por confirmar"}
                  {g.maestro ? " · " + g.maestro : ""}
                </p>
              </div>
              <a className="btn btn-cta al-meet" href={g.liga_meet} target="_blank" rel="noopener noreferrer">
                ▶ Tomar clase
              </a>
            </>
          ) : (
            <>
              <div className="al-clase-info">
                <span className="al-pill">Tu clase en vivo</span>
                <h2>Tu grupo se asignará muy pronto</h2>
                <p>
                  En cuanto el equipo te asigne grupo, aquí aparecerá tu botón para entrar
                  a Google Meet. Te avisaremos por WhatsApp.
                </p>
              </div>
              <button className="btn al-meet" disabled>Pendiente</button>
            </>
          )}
        </section>

        <div className="al-grid">
          <section className="al-card entra d2">
            <h3>Mi grupo</h3>
            {g ? (
              <dl className="al-datos">
                <div><dt>Grupo</dt><dd>{g.codigo}</dd></div>
                <div><dt>Nivel</dt><dd>{g.nivel || "—"}</dd></div>
                <div><dt>Maestro(a)</dt><dd>{g.maestro || "Por asignar"}</dd></div>
                <div><dt>Horario</dt><dd>{g.horario || "Por confirmar"}</dd></div>
                <div><dt>Plataforma</dt><dd>Google Meet</dd></div>
              </dl>
            ) : (
              <p className="al-vacio">Todavía no tienes grupo asignado. Te avisaremos por WhatsApp en cuanto esté listo.</p>
            )}
          </section>

          <section className="al-card entra d3">
            <h3>Mi información</h3>
            <dl className="al-datos">
              <div><dt>Nombre</dt><dd>{a.nombre}</dd></div>
              <div><dt>Correo</dt><dd>{a.correo}</dd></div>
              <div><dt>WhatsApp</dt><dd>{a.whatsapp}</dd></div>
              <div><dt>Edad</dt><dd>{a.edad} años</dd></div>
              <div>
                <dt>Estado</dt>
                <dd><span className={"al-estado e-" + a.estado}>{ESTADO_LABEL[a.estado] || a.estado}</span></dd>
              </div>
            </dl>
          </section>
        </div>

        {Array.isArray(data.sesiones) && data.sesiones.length > 0 && (
          <section className="al-card entra d3" style={{ marginTop: 14 }}>
            <h3>Próximas clases</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {data.sesiones.map((s, i) => {
                const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
                const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                const dt = new Date(s.fecha + "T00:00:00");
                const fechaTxt = DIAS[dt.getDay()] + " " + dt.getDate() + " " + MES[dt.getMonth()];
                const reprog = s.estado === "reprogramada" || s.reprogramada_de;
                let antes = "";
                if (s.reprogramada_de) { const o = new Date(s.reprogramada_de + "T00:00:00"); antes = " (antes " + o.getDate() + " " + MES[o.getMonth()] + ")"; }
                return (
                  <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: reprog ? "rgba(241,139,17,0.13)" : "rgba(0,0,0,0.035)", borderRadius: 12, padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{fechaTxt}</div>
                      <div style={{ fontSize: 13, color: "var(--gris)" }}>{(s.hora || "").slice(0, 5)} h{reprog ? " · Reprogramada" + antes : ""}</div>
                    </div>
                    {s.link_meet && <a className="btn btn-cta" style={{ padding: "7px 14px", fontSize: 13 }} href={s.link_meet} target="_blank" rel="noopener noreferrer">Entrar</a>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="al-ayuda">
          ¿Algo no cuadra? Escríbenos por WhatsApp al{" "}
          <a href="https://wa.me/528119039372" target="_blank" rel="noopener noreferrer">81 1903 9372</a>.
        </p>
      </div>
    </main>
  );
}

// Primer acceso: el alumno debe crear su propia contraseña (reemplaza la genérica) antes de entrar.
function CambiarClave({ nombre, onListo, onSalir }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const primer = (nombre || "").trim().split(/\s+/)[0] || "alumno(a)";
  const inpStyle = { width: "100%", padding: "13px 15px", borderRadius: 12, border: "1px solid var(--borde)", background: "#fff", fontSize: 16, marginTop: 10, fontFamily: "inherit", boxSizing: "border-box" };

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (p1.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (p1 !== p2) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      const r = await fetch("/api/alumno/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: p1 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No pudimos guardar tu contraseña.");
      onListo();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="al-fondo">
      <header className="al-top">
        <img src="/logos/injuve-link.png" alt="INJUVE Link" className="al-logo" />
        <button className="al-salir" onClick={onSalir}>Salir</button>
      </header>
      <div className="al-wrap">
        <div className="al-card entra" style={{ maxWidth: 460, margin: "5vh auto 0" }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>¡Bienvenido(a), {primer}! 👋</h1>
          <p style={{ color: "var(--gris)", marginBottom: 6 }}>
            Por tu seguridad, crea tu propia contraseña para entrar al portal. La usarás cada vez que ingreses.
          </p>
          <form onSubmit={guardar}>
            <input type="password" style={inpStyle} placeholder="Nueva contraseña (mín. 8)" value={p1}
              onChange={(e) => setP1(e.target.value)} autoComplete="new-password" aria-label="Nueva contraseña" />
            <input type="password" style={inpStyle} placeholder="Repite tu contraseña" value={p2}
              onChange={(e) => setP2(e.target.value)} autoComplete="new-password" aria-label="Repite tu contraseña" />
            <button type="submit" className="btn btn-cta" style={{ width: "100%", marginTop: 14 }} disabled={busy}>
              {busy ? "Guardando…" : "Guardar y entrar"}
            </button>
          </form>
          {error && (
            <p className="nota" role="status" style={{ background: "rgba(179,38,30,0.35)", borderRadius: 12, padding: "10px 14px" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
