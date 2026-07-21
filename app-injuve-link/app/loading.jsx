import Globo3D from "./components/Globo3D";

export default function Loading() {
  return (
    <div className="loader-overlay" role="status" aria-label="Cargando">
      <div style={{ textAlign: "center", display: "grid", placeItems: "center" }}>
        <Globo3D size={190} conTexto />
        <p>Conectándote con el mundo…</p>
      </div>
    </div>
  );
}
