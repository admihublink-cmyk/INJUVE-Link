"use client";
import { useEffect, useRef } from "react";

const CAPAS = 26;
const EXTRUSION = 0.16;

const VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  uniform float uH;
  uniform float uTime;
  void main() {
    vUv = uv;
    vNormalW = normalize(normalMatrix * normal);
    vec3 p = position * (1.0 + uH * ${EXTRUSION});
    float vaiven = uH * uH * 0.045;
    p.x += sin(uTime * 1.2 + position.y * 5.0 + position.x * 3.0) * vaiven;
    p.z += cos(uTime * 0.9 + position.x * 4.0 + position.y * 2.0) * vaiven;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  uniform sampler2D tNoise;
  uniform float uH;
  void main() {
    vec4 t = texture2D(tNoise, vUv * vec2(6.0, 3.0));
    if (t.r < uH) discard;
    float tono = t.g;
    vec3 raiz  = vec3(0.05, 0.20, 0.045);
    vec3 punta = vec3(0.45, 0.78, 0.22);
    vec3 c = mix(raiz, punta, uH) * (0.72 + 0.55 * tono);
    vec3 L = normalize(vec3(0.5, 0.7, 0.8));
    float luz = clamp(dot(vNormalW, L), 0.0, 1.0) * 0.45 + 0.65;
    float rim = pow(1.0 - abs(dot(vNormalW, vec3(0.0, 0.0, 1.0))), 2.5) * 0.35 * uH;
    gl_FragColor = vec4(c * luz + vec3(1.0, 0.62, 0.25) * rim, 1.0);
  }
`;

function crearRuido(THREE) {
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.fillRect(0, 0, N, N);
  for (let i = 0; i < 9000; i++) {
    const cx = Math.random() * N;
    const cy = Math.random() * N;
    const r = 2.5 + Math.random() * 4.5;
    const alto = 110 + Math.floor(Math.random() * 145);
    const tono = 40 + Math.floor(Math.random() * 215);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgb(${alto},${tono},0)`);
    g.addColorStop(0.7, `rgb(${(alto * 0.45) | 0},${tono},0)`);
    g.addColorStop(1, `rgb(0,${tono},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, r, 0, 6.2832);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export default function Globo3D({ size = 320, conTexto = true }) {
  const contRef = useRef(null);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    let vivo = true;
    let limpiar = () => {};

    // Three.js se carga bajo demanda (code-split) para no pesar en la carga inicial.
    import("three")
      .then((THREE) => {
        if (!vivo || contRef.current !== cont) return;

        const escena = new THREE.Scene();
        const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camara.position.z = 7.0;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(size, size);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        cont.appendChild(renderer.domElement);

        const grupo = new THREE.Group();
        grupo.rotation.x = 0.16;
        escena.add(grupo);

        const tNoise = crearRuido(THREE);
        const geo = new THREE.SphereGeometry(1.92, 56, 56);

        const nucleo = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({ color: 0x1d4715, roughness: 1 })
        );
        grupo.add(nucleo);

        const materiales = [];
        for (let i = 1; i <= CAPAS; i++) {
          const mat = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            uniforms: {
              uH: { value: i / CAPAS },
              uTime: { value: 0 },
              tNoise: { value: tNoise },
            },
          });
          materiales.push(mat);
          grupo.add(new THREE.Mesh(geo, mat));
        }

        escena.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sol = new THREE.DirectionalLight(0xfff3e0, 2.2);
        sol.position.set(4, 3.2, 5);
        escena.add(sol);

        const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const reloj = new THREE.Clock();
        let raf = null;
        const animar = () => {
          raf = requestAnimationFrame(animar);
          if (!reducir) {
            const dd = Math.min(reloj.getDelta(), 0.05);
            const t = reloj.elapsedTime;
            grupo.rotation.y += dd * 0.1;
            grupo.position.y = Math.sin(t * 0.5) * 0.04;
            for (const m of materiales) m.uniforms.uTime.value = t;
          }
          renderer.render(escena, camara);
        };
        const arrancar = () => { if (raf === null) { reloj.getDelta(); animar(); } };
        const parar = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };

        const observador = new IntersectionObserver(
          ([e]) => (e.isIntersecting && !document.hidden ? arrancar() : parar()),
          { threshold: 0.01 }
        );
        observador.observe(cont);
        const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());
        document.addEventListener("visibilitychange", alCambiarVisibilidad);

        limpiar = () => {
          observador.disconnect();
          document.removeEventListener("visibilitychange", alCambiarVisibilidad);
          parar();
          renderer.dispose();
          geo.dispose();
          nucleo.material.dispose();
          for (const m of materiales) m.dispose();
          tNoise.dispose();
          if (renderer.domElement.parentNode === cont) cont.removeChild(renderer.domElement);
        };
      })
      .catch(() => {});

    return () => {
      vivo = false;
      limpiar();
    };
  }, [size]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: "-7%",
          height: "22%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(22,19,16,0.38) 0%, rgba(22,19,16,0) 68%)",
        }}
      />
      <div ref={contRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
      {conTexto && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center", width: "74%" }}>
            <span
              style={{
                display: "inline-block",
                background: "var(--magenta)",
                color: "#fff",
                fontWeight: 800,
                fontSize: Math.max(11, size * 0.038),
                padding: `${size * 0.012}px ${size * 0.035}px`,
                borderRadius: 999,
                marginBottom: size * 0.02,
                boxShadow: "0 4px 14px rgba(22,19,16,0.35)",
              }}
            >
              HUB Educativo
            </span>
            <img
              src="/logos/injuve-link.png"
              alt="INJUVE Link, conectándote con el mundo"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                filter: "drop-shadow(0 4px 10px rgba(22,19,16,0.5))",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
