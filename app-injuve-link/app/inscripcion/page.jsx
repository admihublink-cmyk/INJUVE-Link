"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

function edadDe(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const f = new Date(fechaNac + "T00:00:00");
  let e = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) e--;
  return e;
}

export default function Inscripcion() {
  const [v, setV] = useState({
    nombre: "", correo: "", whatsapp: "", fecha_nacimiento: "", sexo: "", examen_ubicacion: "",
    tutor_nombre: "", tutor_parentesco: "", tutor_contacto: "",
    consentimiento: false,
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState("");

  const edad = useMemo(() => edadDe(v.fecha_nacimiento), [v.fecha_nacimiento]);
  const esMenor = edad !== null && edad < 18;

  const set = (k) => (e) =>
    setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function validar() {
    const er = {};
    if (v.nombre.trim().length < 5) er.nombre = "Escribe tu nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) er.correo = "Correo no válido.";
    if (!/^\d{10}$/.test(v.whatsapp.replace(/\D/g, ""))) er.whatsapp = "Escribe 10 dígitos.";
    if (!v.fecha_nacimiento) er.fecha_nacimiento = "Selecciona tu fecha de nacimiento.";
    else if (edad < 15) er.fecha_nacimiento = "El programa es a partir de los 15 años.";
    else if (edad > 99) er.fecha_nacimiento = "Revisa la fecha de nacimiento.";
    if (!v.sexo) er.sexo = "Selecciona una opción.";
    if (!v.examen_ubicacion) er.examen_ubicacion = "Selecciona una opción.";
    if (esMenor) {
      if (v.tutor_nombre.trim().length < 5) er.tutor_nombre = "Nombre completo del tutor.";
      if (!v.tutor_parentesco) er.tutor_parentesco = "Selecciona el parentesco.";
      if (v.tutor_contacto.trim().length < 8) er.tutor_contacto = "Teléfono o correo del tutor.";
    }
    if (!v.consentimiento) er.consentimiento = "Es necesario aceptar el aviso de privacidad.";
    setErrores(er);
    return Object.keys(er).length === 0;
  }

  async function enviar(e) {
    e.preventDefault();
    setErrorEnvio("");
    if (!validar()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, edad }),
      });
      const data = await r.json().catch(() => ({ error: "El servidor no respondió correctamente. Intenta de nuevo en un momento." }));
      if (!r.ok) throw new Error(data.error || "No se pudo enviar la inscripción.");
      setResultado(data);
    } catch (err) {
      setErrorEnvio(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <main className="seccion" style={{ paddingTop: 130 }}>
        <div className="container">
          <div className="form-card exito">
            <h1 style={{ color: "var(--naranja-osc)" }}>¡Inscripción recibida!</h1>
            <p>Tu clave de alumno es:</p>
            <div className="folio">{resultado.clave}</div>
            <p style={{ maxWidth: 520, margin: "0 auto 22px", color: "var(--gris)" }}>
              Guárdala bien: con ella consultarás tu grupo y harás tus reinscripciones.
              En un máximo de 2 días hábiles te enviaremos por WhatsApp y correo tu liga de
              pago Banorte y los siguientes pasos.
            </p>
            <Link href="/" className="btn btn-azul">Volver al inicio</Link>
          </div>
        </div>
      </main>
    );
  }

  const campo = (k, label, props = {}, ayuda) => (
    <div className="campo">
      <label htmlFor={k}>
        {label} <span className="req">*</span>
      </label>
      <input id={k} value={v[k]} onChange={set(k)} {...props} />
      {ayuda && <span className="ayuda">{ayuda}</span>}
      {errores[k] && <span className="error">{errores[k]}</span>}
    </div>
  );

  const select = (k, label, opciones, ayuda) => (
    <div className="campo">
      <label htmlFor={k}>
        {label} <span className="req">*</span>
      </label>
      <select id={k} value={v[k]} onChange={set(k)}>
        <option value="">Selecciona…</option>
        {opciones.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {ayuda && <span className="ayuda">{ayuda}</span>}
      {errores[k] && <span className="error">{errores[k]}</span>}
    </div>
  );

  return (
    <main className="seccion" style={{ paddingTop: 130 }}>
      <div className="container">
        <img
          src="/fotos/escritorio.jpg"
          alt="Escritorio de estudio con audífonos, libreta y café"
          className="form-banner"
        />
        <div className="form-card" style={{ maxWidth: 640 }}>
          <h1 style={{ color: "var(--naranja-osc)", fontSize: 26, marginBottom: 6 }}>
            Inscripción a INJUVE Link
          </h1>
          <p style={{ color: "var(--gris)", marginBottom: 8 }}>
            Solo te pedimos lo indispensable; toma menos de 3 minutos. Los campos con{" "}
            <span style={{ color: "var(--magenta)" }}>*</span> son obligatorios.
          </p>
          {Object.keys(errores).length > 0 && (
            <p className="error" style={{ color: "#C62828", fontWeight: 600, marginBottom: 8 }}>
              Revisa los campos marcados en rojo.
            </p>
          )}
          {errorEnvio && (
            <p style={{ background: "#FDECEA", color: "#C62828", padding: 12, borderRadius: 8, marginBottom: 8 }}>
              {errorEnvio}
            </p>
          )}

          <form onSubmit={enviar} noValidate>
            <fieldset>
              <legend>Tus datos</legend>
              <div className="form-grid">
                {campo("nombre", "Nombre completo del alumno", { placeholder: "Nombre(s) y apellidos", autoComplete: "name" })}
                {campo("correo", "Correo electrónico", { type: "email", placeholder: "tucorreo@ejemplo.com", autoComplete: "email" },
                  "Aquí te enviaremos tu clave de alumno y tus accesos.")}
                {campo("whatsapp", "Celular (WhatsApp)", { placeholder: "10 dígitos", inputMode: "numeric", autoComplete: "tel" },
                  "Te agregaremos al grupo de WhatsApp de tu clase.")}
                {campo("fecha_nacimiento", "Fecha de nacimiento", { type: "date" },
                  edad !== null ? `Edad: ${edad} años` : "Tu edad se calcula sola; define tu cuota.")}
                {select("sexo", "Sexo", ["Mujer", "Hombre", "Prefiero no decir"],
                  "Solo para estadística del programa.")}
                {select("examen_ubicacion", "¿Quieres tomar el examen de ubicación gratuito?", [
                  "Sí, quiero tomar el examen de ubicación",
                  "No, ubícame en el Nivel 1 (soy principiante)",
                  "No, ya conozco mi nivel",
                ])}
              </div>
            </fieldset>

            {esMenor && (
              <fieldset>
                <legend>Datos de tu padre, madre o tutor</legend>
                <div className="aviso-tutor">
                  Como tienes entre 15 y 17 años, tu papá, mamá o tutor debe autorizar tu inscripción
                  y el tratamiento de tus datos personales.
                </div>
                <div className="form-grid">
                  {campo("tutor_nombre", "Nombre completo del tutor", { placeholder: "Nombre(s) y apellidos" })}
                  {select("tutor_parentesco", "Parentesco", ["Madre", "Padre", "Tutor(a) legal", "Otro"])}
                  {campo("tutor_contacto", "Teléfono o correo del tutor", { placeholder: "Para contactarle" })}
                </div>
              </fieldset>
            )}

            <div className="consentimiento">
              <p style={{ marginBottom: 10 }}>
                El Instituto Estatal de la Juventud (INJUVE) usará tus datos únicamente para gestionar
                tu inscripción y tu grupo, crear tu cuenta de Burlington English, generar tus referencias
                de pago y mantener contacto contigo sobre tus clases. Consulta el{" "}
                <Link href="/aviso-de-privacidad" target="_blank">aviso de privacidad integral</Link>.
              </p>
              <label>
                <input type="checkbox" checked={v.consentimiento} onChange={set("consentimiento")} />
                <span>
                  {esMenor
                    ? "Soy el padre, madre o tutor del solicitante; he leído el aviso de privacidad y otorgo mi consentimiento para el tratamiento de sus datos personales."
                    : "He leído el aviso de privacidad y otorgo mi consentimiento para el tratamiento de mis datos personales."}
                </span>
              </label>
              {errores.consentimiento && <p className="error" style={{ marginTop: 8 }}>{errores.consentimiento}</p>}
            </div>

            <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
              <button type="submit" className="btn btn-cta" disabled={enviando} style={{ minWidth: 240 }}>
                {enviando ? "Enviando…" : "Enviar inscripción"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
