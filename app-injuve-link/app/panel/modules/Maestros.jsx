"use client";
import { useState, useEffect } from "react";
import { PageHead, Ico } from "../ui";

// Barra recurrentes (verde) vs nuevos, para la retención.
function BarraRet({ recurrentes, alumnos }) {
  const pct = alumnos ? Math.round((recurrentes / alumnos) * 100) : 0;
  return (
    <div title={`${recurrentes} de ${alumnos} regresan (${pct}%)`} style={{ height: 8, borderRadius: 999, background: "#EFE9E1", overflow: "hidden", minWidth: 70 }}>
      <div style={{ width: pct + "%", height: "100%", background: "var(--exito)", borderRadius: 999 }} />
    </div>
  );
}

// Sección de retención de alumnos (recurrentes vs nuevos) por maestro y por nivel.
function Retencion({ rows, global, niveles }) {
  const [abierto, setAbierto] = useState(false);
  if (!global) return null;
  const g = global;
  const conRet = (rows || []).filter((m) => m.alumnos > 0).slice().sort((a, b) => b.retencion_pct - a.retencion_pct);

  return (
    <div className="u-card" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Retención de alumnos</div>
          <p style={{ fontSize: 12.5, color: "var(--gris)", marginTop: 3, maxWidth: 520 }}>
            Un alumno es <b>recurrente</b> si ya pagó en una generación anterior. Los grupos de <b>nivel 1 y 2</b> son de ingreso nuevo, por eso su retención es baja (es normal).
          </p>
        </div>
        <button className="u-btn sec" onClick={() => setAbierto((v) => !v)}>{abierto ? "Ocultar desglose" : "Ver desglose"}</button>
      </div>

      {!g.hay_historial ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--gris)", background: "#FAF7F2", borderRadius: 10, padding: "12px 14px" }}>
          Aún no hay historial de pagos cargado. Sube el cotejo de una generación anterior en <b>Cotejo y pagos → Solo registrar historial</b> para calcular la retención.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <div className="u-card" style={{ padding: "12px 18px", minWidth: 130 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--exito)", lineHeight: 1.1 }}>{g.pct}%</div>
              <div style={{ fontSize: 12.5, color: "var(--gris)" }}>Retención global</div>
            </div>
            <div className="u-card" style={{ padding: "12px 18px", minWidth: 130 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--negro)", lineHeight: 1.1 }}>{g.recurrentes}</div>
              <div style={{ fontSize: 12.5, color: "var(--gris)" }}>Alumnos que regresan</div>
            </div>
            <div className="u-card" style={{ padding: "12px 18px", minWidth: 130 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--naranja-osc)", lineHeight: 1.1 }}>{g.nuevos}</div>
              <div style={{ fontSize: 12.5, color: "var(--gris)" }}>Alumnos nuevos</div>
            </div>
          </div>

          {abierto && (
            <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Por maestro</div>
                <div className="u-tablewrap">
                  <table className="u-table">
                    <thead>
                      <tr>
                        <th>Maestro</th><th>Grupos</th>
                        <th style={{ textAlign: "center" }}>Alumnos</th>
                        <th style={{ textAlign: "center" }}>Regresan</th>
                        <th style={{ textAlign: "center" }}>Nuevos</th>
                        <th>Retención</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conRet.map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                          <td style={{ color: "var(--gris)" }}>{m.grupos.map((x) => x.codigo).join(", ") || "—"}</td>
                          <td style={{ textAlign: "center" }}>{m.alumnos}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "var(--exito)" }}>{m.recurrentes}</td>
                          <td style={{ textAlign: "center", color: "var(--gris)" }}>{m.nuevos}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <BarraRet recurrentes={m.recurrentes} alumnos={m.alumnos} />
                              <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 34 }}>{m.retencion_pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {niveles && niveles.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Por nivel</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {niveles.map((n) => (
                      <div key={n.nivel} className="u-card" style={{ padding: "10px 14px", minWidth: 120 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Nivel {n.nivel}</div>
                        <div style={{ fontSize: 12.5, color: "var(--gris)", margin: "3px 0 6px" }}>{n.recurrentes} regresan · {n.nuevos} nuevos</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BarraRet recurrentes={n.recurrentes} alumnos={n.alumnos} />
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{n.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Maestros() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch("/api/panel/maestros");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudieron cargar los maestros.");
      setData(d);
    } catch (e) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  const rows = data?.rows || [];

  return (
    <div>
      <PageHead ico="maestros" title="Maestros" sub="Carga docente, teléfono y cotización por nivel. Los maestros se dan de alta en Usuarios y roles." />

      {error && <div className="u-err" style={{ marginBottom: 14 }}>{error}</div>}

      {!cargando && rows.length > 0 && (
        <Retencion rows={rows} global={data?.retencion_global} niveles={data?.retencion_niveles} />
      )}

      <div className="u-card">
        {cargando ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Cargando…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gris)" }}>Aún no hay maestros. Créalos en Usuarios y roles.</div>
        ) : (
          <div className="u-tablewrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th>Maestro</th><th>Teléfono</th><th>Grupos</th>
                  <th style={{ textAlign: "center" }}>Alumnos</th>
                  <th style={{ textAlign: "center" }}>Retención</th>
                  <th>Niveles</th><th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} style={{ opacity: m.activo ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>{m.nombre}<div style={{ fontSize: 12, color: "var(--gris)", fontWeight: 400 }}>{m.correo}</div></td>
                    <td style={{ color: "var(--gris)" }}>{m.telefono || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{m.grupos.length ? m.grupos.map((g) => g.codigo).join(", ") : <span style={{ color: "var(--gris)", fontWeight: 400 }}>—</span>}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{m.alumnos}</td>
                    <td style={{ textAlign: "center" }}>
                      {m.alumnos ? (
                        <span title={`${m.recurrentes} regresan · ${m.nuevos} nuevos`}>
                          <span style={{ fontWeight: 700, color: "var(--exito)" }}>{m.retencion_pct}%</span>
                          <div style={{ fontSize: 11.5, color: "var(--gris)" }}>{m.recurrentes}/{m.alumnos}</div>
                        </span>
                      ) : <span style={{ color: "var(--gris)" }}>—</span>}
                    </td>
                    <td>{m.niveles.length ? m.niveles.map((n) => <span key={n} className="u-rol" style={{ marginRight: 4 }}>{n}</span>) : <span style={{ color: "var(--gris)" }}>—</span>}</td>
                    <td><span className={"u-badge " + (m.activo ? "on" : "off")}>{m.activo ? "Activo" : "Inactivo"}</span></td>
                    <td><div className="u-acts"><button className="u-mini" onClick={() => setModal(m)}>Ver perfil</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <MaestroModal
          maestro={modal}
          niveles={data?.niveles || []}
          puedeEditar={data?.puede_editar}
          puedeCotizar={data?.puede_cotizar}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function MaestroModal({ maestro, niveles, puedeEditar, puedeCotizar, onClose, onDone }) {
  const [tel, setTel] = useState(maestro.telefono || "");
  const [cot, setCot] = useState(() => {
    const o = {};
    (niveles || []).forEach((n) => { o[n] = maestro.cotizaciones && maestro.cotizaciones[n] != null ? String(maestro.cotizaciones[n]) : ""; });
    return o;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setNivel = (n) => (e) => setCot((s) => ({ ...s, [n]: e.target.value }));

  async function guardar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = { id: maestro.id };
      if (puedeEditar) body.telefono = tel;
      if (puedeCotizar) {
        const c = {};
        for (const n of niveles) { const v = cot[n]; if (v !== "" && v != null) c[n] = Number(v); }
        body.cotizaciones = c;
      }
      const r = await fetch("/api/panel/maestros", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  const totalMensual = niveles.reduce((s, n) => { const v = Number(cot[n]); return s + (isNaN(v) ? 0 : v); }, 0);

  return (
    <div className="u-modal-bg" onClick={onClose}>
      <form className="u-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h3>{maestro.nombre}</h3>
        <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 2 }}>{maestro.correo}</p>

        <div style={{ marginTop: 14, marginBottom: 6, fontWeight: 700, fontSize: 13.5 }}>Grupos que imparte</div>
        {maestro.grupos.length === 0 ? (
          <p style={{ color: "var(--gris)", fontSize: 13.5 }}>Sin grupos asignados.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {maestro.grupos.map((g) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "#FAF7F2", borderRadius: 8, padding: "7px 11px", fontSize: 13.5 }}>
                <span><b>{g.codigo}</b> · Nivel {g.nivel}</span>
                <span style={{ color: "var(--gris)" }}>{g.inscritos} alumnos{g.recurrentes != null ? ` · ${g.recurrentes} regresan` : ""}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, marginBottom: 2, fontWeight: 700, fontSize: 13.5 }}>Teléfono / WhatsApp</div>
        <input className="u-inp" style={{ marginTop: 4 }} placeholder="Teléfono" value={tel} onChange={(e) => setTel(e.target.value)} disabled={!puedeEditar} />

        {puedeCotizar && niveles.length > 0 && (
          <>
            <div style={{ marginTop: 16, marginBottom: 2, fontWeight: 700, fontSize: 13.5 }}>Cotización por nivel (mensual)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 6 }}>
              {niveles.map((n) => (
                <label key={n} style={{ fontSize: 12.5, color: "var(--gris)" }}>Nivel {n}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <span style={{ color: "var(--gris)" }}>$</span>
                    <input className="u-inp" style={{ marginTop: 0 }} type="number" min="0" step="0.01" placeholder="0" value={cot[n]} onChange={setNivel(n)} />
                  </div>
                </label>
              ))}
            </div>
            <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--gris)" }}>Suma de todos los niveles: <b>${totalMensual.toLocaleString("es-MX")}</b></p>
          </>
        )}

        {error && <div className="u-err">{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="u-btn sec" onClick={onClose}>Cerrar</button>
          {(puedeEditar || puedeCotizar) && <button type="submit" className="u-btn" disabled={busy}>{busy ? "…" : "Guardar"}</button>}
        </div>
      </form>
    </div>
  );
}


export default Maestros;
