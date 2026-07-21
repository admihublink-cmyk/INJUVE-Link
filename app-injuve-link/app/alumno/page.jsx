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

        <p className="al-ayuda">
          ¿Algo no cuadra? Escríbenos por WhatsApp al{" "}
          <a href="https://wa.me/528119039372" target="_blank" rel="noopener noreferrer">81 1903 9372</a>.
        </p>
      </div>
    </main>
  );
}
