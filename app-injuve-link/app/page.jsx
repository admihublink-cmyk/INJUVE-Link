import Link from "next/link";
import Globo3D from "./components/Globo3D";

const NIVELES = [
  ["1", "A1"], ["2", "A1"], ["3", "A2"], ["4", "A2"], ["5", "A2+"],
  ["6", "B1"], ["7", "B1"], ["8", "B1+"], ["9", "B2"], ["10", "B2"],
];

const PROGRAMA = [
  ["1", "A1", ["Getting Started", "Getting Started", "About Me", "About Me · School", "School · Time", "Time · Shopping", "Shopping · Food", "Food"]],
  ["2", "A1", ["Health", "Community", "Work", "Work · Personal Information", "Personal Information", "Personal Information · Education", "Education", "Education · Getting a Job"]],
  ["3", "A2", ["Getting a Job", "Getting a Job · Money Matters", "Money Matters", "Health", "Health · In the Workplace", "In the Workplace", "In the Workplace · Safety", "Safety"]],
  ["4", "A2", ["Safety · Housing", "Housing", "Housing · In the Community", "In the Community", "Personal Information", "Personal Information · Education", "Education", "Education · Getting a Job"]],
  ["5", "A2+", ["Getting a Job", "Getting a Job", "Money Matters", "Money Matters", "Money Matters · Health", "Health", "Health", "Health · In the Workplace"]],
  ["6", "B1", ["In the Workplace", "In the Workplace", "Safety", "Safety", "Safety", "Housing", "Housing", "Housing · In the Community"]],
  ["7", "B1", ["In the Community", "In the Community", "Government & Law", "Government & Law", "Government & Law", "Government & Law · Personal Information", "Personal Information", "Personal Information"]],
  ["8", "B1+", ["Education", "Education", "Education · Getting a Job", "Getting a Job", "Getting a Job", "Getting a Job · Money Matters", "Money Matters", "Money Matters"]],
  ["9", "B2", ["Health", "Health", "Health", "In the Workplace", "In the Workplace", "In the Workplace · Safety", "Safety", "Safety"]],
  ["10", "B2", ["Housing", "Housing", "Housing", "In the Community", "In the Community", "In the Community · Government & Law", "Government & Law", "Government & Law"]],
];

function resumenNivel(clases) {
  const vistos = [];
  for (const c of clases) {
    for (const t of c.split("·").map((s) => s.trim())) {
      if (t && !vistos.includes(t)) vistos.push(t);
    }
  }
  return vistos.join(" · ");
}

const RAZONES = [
  {
    t: "Gana más",
    d: "Los puestos bilingües pagan mejor y se ocupan primero. Con el nearshoring, las empresas globales ya están contratando en Nuevo León, y piden inglés.",
  },
  {
    t: "El mundo ya está aquí",
    d: "El Mundial 2026 puso a Monterrey en el mapa: turismo, eventos y visitantes de todos los continentes. Quien habla inglés, aprovecha; quien no, mira.",
  },
  {
    t: "Estudia donde quieras",
    d: "Becas, intercambios, certificaciones y la mayor parte del conocimiento en internet están en inglés. Dominarlo multiplica tus opciones de estudio.",
  },
  {
    t: "Conecta de verdad",
    d: "Música, series, juegos y amistades de otros países dejan de tener subtítulos. El inglés es la lengua en la que el mundo se habla entre sí.",
  },
  {
    t: "Confianza que se nota",
    d: "Aprender un idioma entrena tu memoria, tu disciplina y tu seguridad al hablar en público. Esa confianza se queda contigo para todo.",
  },
];

const TESTIMONIOS = [
  "La facilidad de inscripción, el costo y la calidad del aprendizaje.",
  "La Miss es muy amable, tiene mucha paciencia y de verdad se preocupa porque comprendamos.",
  "Es muy accesible, tiene horarios que se ajustan a tu jornada y las clases son dinámicas.",
  "Se graban las clases, así no me rezago con el resto de mis compañeros.",
];

const FAQS = [
  {
    q: "¿Quién puede inscribirse?",
    a: "Cualquier persona de 15 a 29 años que viva en Nuevo León accede a la cuota joven de $500 al bimestre. A partir de los 30 años también puedes inscribirte con el paquete Plus de $600 al bimestre: mismo programa completo.",
  },
  {
    q: "¿Necesito saber inglés para empezar?",
    a: "No. El programa inicia desde cero (nivel A1). Si ya tienes conocimientos, te aplicamos un examen de ubicación gratuito para colocarte en el nivel correcto.",
  },
  {
    q: "¿Cómo son las clases?",
    a: "En vivo por Zoom, con tu maestro y tu grupo: 8 clases de 2 horas al mes. Las sesiones se graban, así que si un día no puedes conectarte, no te rezagas.",
  },
  {
    q: "¿Qué incluye la plataforma Burlington English?",
    a: "Acceso personal a la plataforma digital con inteligencia artificial de Burlington English: material interactivo, práctica de pronunciación y seguimiento de tu avance. El material tiene un costo de $375 cada 4 meses.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Después de inscribirte recibirás una liga de pago segura de Banorte por WhatsApp o correo. La cuota se cubre cada bimestre y puedes pagar con tarjeta o en ventanilla.",
  },
  {
    q: "Soy menor de edad, ¿puedo inscribirme?",
    a: "Sí, desde los 15 años. Tu papá, mamá o tutor deberá otorgar su consentimiento en el formulario de inscripción y compartir un dato de contacto.",
  },
  {
    q: "Ya soy alumno, ¿cómo me reinscribo?",
    a: "No necesitas llenar el formulario otra vez. Solicita tu liga de reinscripción con tu clave de alumno, realiza tu pago y tu acceso continúa automáticamente.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge entra">Convenio INJUVE · Desde $500 al bimestre</span>
            <h1 className="entra d1">
              Aprende inglés y <span className="acento">conéctate con el mundo</span>
            </h1>
            <p className="sub entra d2">
              Clases 100% en línea y en vivo con maestros reales y la plataforma inteligente de
              Burlington English, a una cuota al alcance gracias a los convenios que el INJUVE
              gestiona para las juventudes de Nuevo León. Llega al nivel B2 en 10 meses.
            </p>
            <div className="hero-acciones entra d3">
              <Link href="/inscripcion" className="btn btn-negro">Inscríbete ahora</Link>
              <Link href="/reinscripcion" className="btn btn-fantasma">Ya soy alumno</Link>
            </div>
          </div>
          <div className="hero-globo entra d2">
            <Globo3D size={390} />
          </div>
        </div>
      </section>

      <section className="seccion" id="por-que">
        <div className="container">
          <h2>El inglés dejó de ser un extra: <span className="resalte">es la llave</span></h2>
          <p className="intro">
            Nuevo León se convirtió en uno de los motores industriales de México y sede del Mundial 2026.
            Las oportunidades ya llegaron; el idioma es lo único que falta. Cinco razones para empezar hoy:
          </p>
          <div className="razones">
            {RAZONES.map((r, i) => (
              <div className="razon" key={r.t}>
                <div className="razon-num">{i + 1}</div>
                <div>
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion oscuro" id="programa">
        <div className="container">
          <h2>Así se estudia <span className="resalte">en INJUVE Link</span></h2>
          <p className="intro">
            Todo en línea, todo en vivo, sin traslados: solo necesitas internet y ganas.
          </p>
          <div className="grid grid-3">
            <div className="modo">
              <img src="/fotos/alumna.jpg" alt="Alumna sonriendo durante su clase en vivo" loading="lazy" decoding="async" />
              <div className="modo-info">
                <h3>Clases en vivo por Zoom</h3>
                <p>
                  8 clases de 2 horas al mes con tu maestro y tu grupo. Hablas, practicas y
                  resuelves dudas en tiempo real, desde cualquier municipio.
                </p>
              </div>
            </div>
            <div className="modo">
              <img src="/fotos/alumno.jpg" alt="Alumno repasando una clase grabada" loading="lazy" decoding="async" />
              <div className="modo-info">
                <h3>Se graban para ti</h3>
                <p>
                  ¿Se te cruzó el trabajo o la escuela? Cada sesión queda grabada para que
                  repases y nunca te rezagues de tu grupo.
                </p>
              </div>
            </div>
            <div className="modo">
              <img src="/fotos/en-linea.jpg" alt="Alumna practicando en la plataforma Burlington English" loading="lazy" decoding="async" />
              <div className="modo-info">
                <h3>Plataforma con IA</h3>
                <p style={{ marginBottom: 12 }}>
                  Entre clases, Burlington English te pone a practicar pronunciación y
                  ejercicios interactivos que se adaptan a tu avance.
                </p>
                <img
                  src="/logos/burlington-h.png"
                  alt="BurlingtonEnglish, the publisher that cares"
                  style={{ height: 34, width: "auto", background: "#fff", borderRadius: 8, padding: "5px 10px" }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 56 }}>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>Tu ruta al <span className="resalte">B2</span></h2>
            <div className="ruta">
              {NIVELES.map(([n, m], i) => (
                <div className={`paso${m.startsWith("B2") ? " b1" : ""}`} key={n}>
                  <div>
                    <div className="nodo">{n}</div>
                    <div className="mcer">{m}</div>
                  </div>
                  {i < NIVELES.length - 1 && <div className="linea" />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)" }}>El programa, <span className="resalte">nivel por nivel</span></h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              Temas del plan Burlington English que verás en cada nivel:
            </p>
            <div className="programa-lista">
              {PROGRAMA.map(([n, m, clases]) => (
                <details className="prog-item" key={n}>
                  <summary>
                    <span className="prog-nivel">Nivel {n}</span>
                    <span className="prog-mcer">{m}</span>
                    <span className="prog-temas">{resumenNivel(clases)}</span>
                  </summary>
                  <ol className="prog-clases">
                    {clases.map((c, i) => (
                      <li key={i}>
                        <span className="prog-clase-num">Clase {i + 1}</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>

            <div className="prog-fuente">
              <p className="prog-fuente-titulo">Fuente del plan de estudios</p>
              <p>
                Syllabus oficial del programa INJUVE Link, basado en el currículo{" "}
                <a href="https://www.burlingtonenglish.com/" target="_blank" rel="noopener noreferrer">
                  Burlington English
                </a>
                , editorial internacional de enseñanza del inglés con presencia en Estados Unidos,
                México, España, Italia, Alemania, Grecia, Turquía, Israel, India, Rumania y Chipre.
              </p>
              <ul>
                <li>Currículo alineado al Marco Común Europeo de Referencia (MCER), del nivel A1 al B2.</li>
                <li>Socio oficial de CASAS: sus materiales de evaluación están correlacionados con este sistema internacional de medición de competencias en inglés.</li>
                <li>Tecnología SpeechTrainer para práctica y corrección de pronunciación.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion canva" id="costos">
        <div className="container">
          <h2>Una oportunidad <span className="resalte">gestionada para ti</span></h2>
          <p className="intro">
            Un curso con maestros en vivo y plataforma internacional normalmente cuesta varias veces más.
            Gracias a las gestiones y convenios del INJUVE con Burlington English, las juventudes de
            Nuevo León pueden acceder a él por una fracción de su valor: cada clase de 2 horas te sale
            en menos de lo que cuesta una ida al cine.
          </p>
          <div className="grid grid-3">
            <div className="card destacada">
              <span className="pill rosa">Cuota joven · 15 a 29 años</span>
              <p className="precio">$500 <small>/ bimestre</small></p>
              <p>16 clases en vivo por bimestre: menos de $32 por clase.</p>
            </div>
            <div className="card destacada" style={{ borderColor: "var(--naranja)" }}>
              <span className="pill">Paquete Plus · 30 años o más</span>
              <p className="precio">$600 <small>/ bimestre</small></p>
              <p>El mismo programa completo, sin límite de edad. Nunca es tarde para conectarte.</p>
            </div>
            <div className="card">
              <span className="pill azul">Material Burlington</span>
              <p className="precio">$375 <small>/ cada 4 meses</small></p>
              <p>Tu licencia personal de la plataforma con inteligencia artificial.</p>
            </div>
          </div>

          <div className="reins" style={{ marginTop: 40 }}>
            <div>
              <h3>¿Ya eres alumno de INJUVE Link?</h3>
              <p>
                No vuelvas a llenar el formulario: pide tu liga de reinscripción con tu clave
                de alumno y sigue exactamente donde te quedaste.
              </p>
            </div>
            <Link href="/reinscripcion" className="btn btn-cta">Pedir mi liga de reinscripción</Link>
          </div>
        </div>
      </section>

      <section className="seccion" id="testimonios">
        <div className="container">
          <h2>Lo que dicen <span className="resalte">nuestros becarios</span></h2>
          <p className="intro">
            Respuestas reales de la evaluación académica de abril 2026:
          </p>
          <div className="testi-grid">
            <div className="testi-quotes">
              {TESTIMONIOS.map((t) => (
                <figure className="testimonio" key={t}>
                  <blockquote>“{t}”</blockquote>
                  <figcaption>Becario del programa · Evaluación abril 2026</figcaption>
                </figure>
              ))}
            </div>
            <div className="testi-fotowrap">
              <div className="testi-blob" aria-hidden="true" />
              <img
                src="/fotos/teacher.webp"
                alt="Maestra de INJUVE Link sonriendo con los brazos cruzados"
                className="testi-foto"
                loading="lazy"
                decoding="async"
              />
              <span className="testi-tag">Maestros en vivo, en cada clase</span>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion alt" id="faq" style={{ background: "var(--blanco)" }}>
        <div className="container">
          <h2>Preguntas <span className="resalte">frecuentes</span></h2>
          <div style={{ display: "grid", gap: 12, marginTop: 28, maxWidth: 820 }}>
            {FAQS.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p className="resp">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion rosa-drench">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff" }}>¿Listo para conectarte con el mundo?</h2>
          <p style={{ color: "#FFE3EE", marginBottom: 28, fontSize: 17 }}>
            La inscripción toma menos de 3 minutos: solo tu nombre, correo y WhatsApp.
          </p>
          <Link href="/inscripcion" className="btn btn-blanco">Inscríbete ahora</Link>
        </div>
      </section>
    </main>
  );
}
