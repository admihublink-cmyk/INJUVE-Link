"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const EXAMEN = "__examen__";

function edadDe(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const f = new Date(fechaNac + "T00:00:00");
  let e = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) e--;
  return e;
}
const mayus = (s) => s.toUpperCase();

export default function Inscripcion() {
  const [v, setV] = useState({
    nombres: "", apellido_paterno: "", apellido_materno: "",
    correo: "", whatsapp: "", fecha_nacimiento: "", sexo: "",
    calle: "", colonia: "", municipio: "", entidad: "",
    grupo: "",
    tutor_nombre: "", tutor_parentesco: "", tutor_contacto: "",
    consentimiento: false,
  });
  const [grupos, setGrupos] = useState([]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState("");

  const edad = useMemo(() => edadDe(v.fecha_nacimiento), [v.fecha_nacimiento]);
  const esMenor = edad !== null && edad < 18;

  useEffect(() => {
    fetch("/api/inscripcion/grupos")
      .then((r) => r.json())
      .then((d) => setGrupos(Array.isArray(d.grupos) ? d.grupos : []))
      .catch(() => setGrupos([]));
  }, []);

  const set = (k, transform) => (e) => {
    const raw = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setV((s) => ({ ...s, [k]: transform ? transform(raw) : raw }));
  };

  function validar() {
    const er = {};
    if (v.nombres.trim().length < 2) er.nombres = "Escribe tu(s) nombre(s).";
    if (v.apellido_paterno.trim().length < 2) er.apellido_paterno = "Escribe tu apellido paterno.";
    if (v.apellido_materno.trim().length < 2) er.apellido_materno = "Escribe tu apellido materno.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)) er.correo = "Correo no válido.";
    if (!/^\d{10}$/.test(v.whatsapp.replace(/\D/g, ""))) er.whatsapp = "Escribe 10 dígitos.";
    if (!v.fecha_nacimiento) er.fecha_nacimiento = "Selecciona tu fecha de nacimiento.";
    else if (edad < 15) er.fecha_nacimiento = "El programa es a partir de los 15 años.";
    else if (edad > 99) er.fecha_nacimiento = "Revisa la fecha de nacimiento.";
    if (!v.sexo) er.sexo = "Selecciona una opción.";
    if (v.calle.trim().length < 3) er.calle = "Escribe tu calle y número.";
    if (v.colonia.trim().length < 2) er.colonia = "Escribe tu colonia.";
    if (v.municipio.trim().length < 2) er.municipio = "Escribe tu municipio.";
    if (v.entidad.trim().length < 2) er.entidad = "Escribe tu estado.";
    if (!v.grupo) er.grupo = "Selecciona tu horario o el examen de ubicación.";
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
      const nombre = `${v.nombres} ${v.apellido_paterno} ${v.apellido_materno}`.replace(/\s+/g, " ").trim();
      const examen_ubicacion = v.grupo === EXAMEN ? "Requiere examen de ubicación" : "No requiere (eligió grupo)";
      const grupo_solicitado = v.grupo === EXAMEN ? "" : v.grupo;
      const r = await fetch("/api/inscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, correo: v.correo, whatsapp: v.whatsapp, fecha_nacimiento: v.fecha_nacimiento,
          sexo: v.sexo, calle: v.calle, colonia: v.colonia, municipio: v.municipio, entidad: v.entidad,
          grupo_solicitado, examen_ubicacion, edad,
          tutor_nombre: v.tutor_nombre, tutor_parentesco: v.tutor_parentesco, tutor_contacto: v.tutor_contacto,
          consentimiento: v.consentimiento,
        }),
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
              En un máximo de 2 días hábiles te enviaremos por WhatsApp y correo tu <strong>liga de
              pago Banorte</strong>. Tu acceso al portal se activa <strong>una vez confirmado tu pago</strong>.
            </p>
            <Link href="/" className="btn btn-azul">Volver al inicio</Link>
          </div>
        </div>
      </main>
    );
  }

  const campo = (k, label, props = {}, ayuda, transform) => (
    <div className="campo">
      <label htmlFor={k}>{label} <span className="req">*</span></label>
      <input id={k} value={v[k]} onChange={set(k, transform)} {...props} />
      {ayuda && <span className="ayuda">{ayuda}</span>}
      {errores[k] && <span className="error">{errores[k]}</span>}
    </div>
  );

  const select = (k, label, opciones, ayuda) => (
    <div className="campo">
      <label htmlFor={k}>{label} <span className="req">*</span></label>
      <select id={k} value={v[k]} onChange={set(k)}>
        <option value="">Selecciona…</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {ayuda && <span className="ayuda">{ayuda}</span>}
      {errores[k] && <span className="error">{errores[k]}</span>}
    </div>
  );

  const opcionesGrupo = [
    ...grupos.map((g) => ({
      value: g.codigo,
      label: `${g.codigo} · Nivel ${g.nivel || "?"}${g.horario ? " · " + g.horario : ""}`,
    })),
    { value: EXAMEN, label: "Requiero examen de ubicación (niveles superiores)" },
  ];

  return (
    <main className="seccion" style={{ paddingTop: 130 }}>
      <div className="container">
        <img src="/fotos/escritorio.jpg" alt="Escritorio de estudio con audífonos, libreta y café" className="form-banner" />
        <div className="form-card" style={{ maxWidth: 660 }}>
          <h1 style={{ color: "var(--naranja-osc)", fontSize: 26, marginBottom: 6 }}>Inscripción a INJUVE Link</h1>
          <p style={{ color: "var(--gris)", marginBottom: 8 }}>
            Formulario para <strong>nuevo ingreso</strong>. Los campos con <span style={{ color: "var(--magenta)" }}>*</span> son obligatorios.
            Tu <strong>acceso al portal se crea al confirmar tu pago</strong>.
          </p>
          {Object.keys(errores).length > 0 && (
            <p className="error" style={{ color: "#C62828", fontWeight: 600, marginBottom: 8 }}>Revisa los campos marcados en rojo.</p>
          )}
          {errorEnvio && (
            <p style={{ background: "#FDECEA", color: "#C62828", padding: 12, borderRadius: 8, marginBottom: 8 }}>{errorEnvio}</p>
          )}

          <form onSubmit={enviar} noValidate>
            <fieldset>
              <legend>Datos del alumno</legend>
              <div className="form-grid">
                {campo("nombres", "Nombre(s)", { placeholder: "MAYÚSCULAS Y SIN ACENTOS", autoComplete: "given-name" }, null, mayus)}
                {campo("apellido_paterno", "Apellido paterno", { placeholder: "MAYÚSCULAS Y SIN ACENTOS" }, null, mayus)}
                {campo("apellido_materno", "Apellido materno", { placeholder: "MAYÚSCULAS Y SIN ACENTOS" }, null, mayus)}
                {campo("fecha_nacimiento", "Fecha de nacimiento", { type: "date" },
                  edad !== null ? `Edad: ${edad} años` : "Tu edad se calcula sola; define tu cuota.")}
                {select("sexo", "Sexo", [
                  { value: "Mujer", label: "Mujer" }, { value: "Hombre", label: "Hombre" }, { value: "Prefiero no decir", label: "Prefiero no decir" },
                ], "Solo para estadística del programa.")}
                {campo("whatsapp", "Celular (WhatsApp)", { placeholder: "10 dígitos", inputMode: "numeric", autoComplete: "tel" },
                  "Te agregaremos al grupo de WhatsApp de tu clase.")}
                {campo("correo", "Correo electrónico", { type: "email", placeholder: "tucorreo@ejemplo.com", autoComplete: "email" },
                  "Será tu usuario para entrar al portal. No puede repetirse en otro alumno.")}
              </div>
            </fieldset>

            <fieldset>
              <legend>Domicilio</legend>
              <div className="form-grid">
                {campo("calle", "Calle y número", { placeholder: "Ej. Av. Juárez 123" })}
                {campo("colonia", "Colonia", { placeholder: "Colonia" })}
                {campo("municipio", "Municipio", { placeholder: "Municipio" })}
                {campo("entidad", "Estado", { placeholder: "Ej. Nuevo León" })}
              </div>
            </fieldset>

            <fieldset>
              <legend>Horario / grupo</legend>
              <div className="form-grid">
                {select("grupo", "Horario de clase en línea", opcionesGrupo,
                  "Elige el horario que mejor te acomode. Para niveles superiores al 1, selecciona “Requiero examen de ubicación”.")}
              </div>
            </fieldset>

            {esMenor && (
              <fieldset>
                <legend>Datos de tu padre, madre o tutor</legend>
                <div className="aviso-tutor">
                  Como tienes entre 15 y 17 años, tu papá, mamá o tutor debe autorizar tu inscripción y el tratamiento de tus datos personales.
                </div>
                <div className="form-grid">
                  {campo("tutor_nombre", "Nombre completo del tutor", { placeholder: "Nombre(s) y apellidos" })}
                  {select("tutor_parentesco", "Parentesco", [
                    { value: "Madre", label: "Madre" }, { value: "Padre", label: "Padre" },
                    { value: "Tutor(a) legal", label: "Tutor(a) legal" }, { value: "Otro", label: "Otro" },
                  ])}
                  {campo("tutor_contacto", "Teléfono o correo del tutor", { placeholder: "Para contactarle" })}
                </div>
              </fieldset>
            )}

            <div className="consentimiento">
              <p style={{ marginBottom: 10 }}>
                El Instituto Estatal de la Juventud (INJUVE) usará tus datos únicamente para gestionar tu inscripción y tu grupo,
                crear tu cuenta de Burlington English, generar tus referencias de pago y mantener contacto contigo sobre tus clases.
                Consulta el <Link href="/aviso-de-privacidad" target="_blank">aviso de privacidad integral</Link>.
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
