import "./globals.css";
import Link from "next/link";
import { Baloo_2, Nunito_Sans } from "next/font/google";

const titulo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-titulo" });
const cuerpo = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-cuerpo" });

export const metadata = {
  title: "INJUVE Link — Aprende inglés con beca del 95% | INJUVE Nuevo León",
  description:
    "Academia de inglés de La Nueva Escuela INJUVE. Becas del 95% para jóvenes de 15 a 29 años en Nuevo León. Llega al B2 presencial o en línea con Burlington English. Conectándote con el mundo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${titulo.variable} ${cuerpo.variable}`}>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/">
              <img src="/logos/injuve-link.png" alt="INJUVE Link" className="nav-logo" />
            </Link>
            <div className="nav-links">
              <Link href="/#programa">El programa</Link>
              <Link href="/#costos">Costos</Link>
              <Link href="/#faq">Preguntas</Link>
              <Link href="/login" className="entrar">Entrar</Link>
              <Link href="/inscripcion" className="btn btn-cta" style={{ padding: "10px 20px", fontSize: 15, minHeight: 0 }}>
                Inscríbete
              </Link>
            </div>
          </div>
        </nav>
        {children}
        <footer className="footer" style={{ textAlign: "center" }}>
          <div className="container">
            <div className="logos" style={{ justifyContent: "center" }}>
              <img src="/logos/injuve.png" alt="INJUVE Instituto Estatal de la Juventud" loading="lazy" />
              <img src="/logos/nueva-escuela.png" alt="La Nueva Escuela INJUVE" loading="lazy" />
              <img src="/logos/injuve-link.png" alt="INJUVE Link" loading="lazy" />
              <img src="/logos/burlington-h.png" alt="BurlingtonEnglish" style={{ background: "#fff", borderRadius: 10, padding: "7px 14px", height: 40 }} loading="lazy" />
            </div>
            <p>
              Instituto Estatal de la Juventud · Santiago Tapia 1129 Ote., Col. Centro, Monterrey, N.L., C.P. 64000
            </p>
            <p>WhatsApp: 81 1903 9372 · Tel: (81) 2020 4600</p>
            <p style={{ marginTop: 10 }}>
              <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
              {" · "}
              <Link href="/aviso-de-privacidad#arco">Derechos ARCO (acceso, rectificación, cancelación y oposición)</Link>
            </p>
            <p style={{ marginTop: 14, opacity: 0.7 }}>
              INJUVE Link es una línea de acción del Hub Educativo La Nueva Escuela INJUVE, en alianza con Burlington English.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
