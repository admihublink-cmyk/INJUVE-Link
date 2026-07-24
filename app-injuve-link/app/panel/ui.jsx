"use client";
// build: panel/ui — primitivas compartidas (Ico, Sel, PageHead, formateadores, etiquetas de rol)
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Etiqueta corta para las insignias de rol en la tabla de usuarios.
const ROL_CORTO = {
  odp: "ODP · Super Admin",
  administracion: "Administración",
  coordinador_atencion: "Coordinador",
  maestro: "Maestro",
  agente_atencion: "Agente",
};

// —— Sistema de iconos (línea, un solo trazo, hereda el color) ——
const ICONS = {
  dashboard: (<><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /></>),
  misclases: (<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4" /><path d="M8 20h8" /><path d="M10.4 8.1l3.4 1.9-3.4 1.9z" /></>),
  inscripciones: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.8 19.4c0-3 2.3-5.2 5.2-5.2 1.2 0 2.3.35 3.2 1" /><path d="M18 7.5v5" /><path d="M15.5 10h5" /></>),
  grupos: (<><circle cx="8.5" cy="9" r="3" /><path d="M2.8 19c0-3.1 2.5-5.3 5.7-5.3 1.4 0 2.6.4 3.6 1.1" /><path d="M15.6 6.4a3 3 0 0 1 .3 5.8" /><path d="M16.6 14c2.6.3 4.6 2.4 4.6 5" /></>),
  maestros: (<><path d="M12 4L2.5 8.5 12 13l9.5-4.5L12 4z" /><path d="M6.5 10.6V15c0 1.6 2.5 2.8 5.5 2.8s5.5-1.2 5.5-2.8v-4.4" /><path d="M21.5 8.5V14" /></>),
  programa: (<><path d="M12 6.6C10.4 5.2 8 4.7 4.2 5.2v12.6c3.8-.5 6.2 0 7.8 1.4" /><path d="M12 6.6c1.6-1.4 4-1.9 7.8-1.4v12.6c-3.8-.5-6.2 0-7.8 1.4" /><path d="M12 6.6v12.4" /></>),
  academico: (<><rect x="5" y="4.5" width="14" height="16.5" rx="2.2" /><path d="M9 4.5V6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4.5" /><path d="M8.6 13.2l2.2 2.2 4.6-4.6" /></>),
  pagos: (<><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><circle cx="12" cy="12" r="2.7" /><path d="M6 9.5v5M18 9.5v5" /></>),
  atencion: (<><path d="M4 13.5v-2a8 8 0 0 1 16 0v2" /><rect x="2.5" y="13" width="4" height="6.2" rx="1.6" /><rect x="17.5" y="13" width="4" height="6.2" rx="1.6" /><path d="M20 19.2c0 1.9-1.8 2.8-4 2.8" /></>),
  solicitudes: (<><path d="M3 13l2.4-6.6A2 2 0 0 1 7.3 5h9.4a2 2 0 0 1 1.9 1.4L21 13" /><path d="M3 13h5l1.4 2.2h5.2L16 13h5v4.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  legal: (<><path d="M12 3.5v17" /><path d="M7 20.5h10" /><path d="M4.8 7h14.4" /><path d="M8.5 4.6L5 7 2.7 12a2.8 2.8 0 0 0 5.6 0L5 7" /><path d="M19 7l-2.3 5a2.8 2.8 0 0 0 5.6 0L19 7" /></>),
  reportes: (<><path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" /><path d="M7.5 15.4l3.2-3.7 2.8 2.3 4-5.1" /><path d="M17.5 6.4H21V10" /></>),
  reportes_pago: (<><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6 15h4" /></>),
  usuarios: (<><circle cx="8" cy="8" r="4.2" /><path d="M11 11.2l8 8" /><path d="M16.5 16.7l1.8-1.8" /><path d="M18.7 18.9l1.8-1.8" /></>),
  menu: (<><path d="M4 7h16M4 12h16M4 17h16" /></>),
  close: (<><path d="M6 6l12 12M18 6L6 18" /></>),
  external: (<><path d="M13.5 5H19v5.5" /><path d="M19 5l-8.5 8.5" /><path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" /></>),
  logout: (<><path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" /><path d="M10 12h10" /><path d="M16.5 8.5L20 12l-3.5 3.5" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>),
  download: (<><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M5 20h14" /></>),
  chevron: (<><path d="M6 9l6 6 6-6" /></>),
  check: (<><path d="M5 12.5l4.5 4.5L19 7" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2.4" /><path d="M3.5 10h17" /><path d="M8 3.2v3.6M16 3.2v3.6" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  documentos: (<><path d="M6 3h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v5h5" /><path d="M8.5 13h7M8.5 16.5h7M8.5 9.5h2.5" /></>),
  upload: (<><path d="M12 20V9" /><path d="M8 12.5l4-4 4 4" /><path d="M5 4.5h14" /></>),
  dot: (<><circle cx="12" cy="12" r="3" /></>),
  cotejo: (<><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path d="M13.5 3.5v4.5h4.5" /><path d="M8.3 13l1.6 1.6 3.2-3.4" /><path d="M8.5 17.5h6" /></>),
};

function Ico({ n, size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[n] || ICONS.dot}
    </svg>
  );
}

// Días de la semana (ISO 1-7) → etiquetas cortas, para el horario de los grupos.
const DIAS_CORTO = { "1": "Lun", "2": "Mar", "3": "Mié", "4": "Jue", "5": "Vie", "6": "Sáb", "7": "Dom" };
function fmtDias(csv) {
  return String(csv || "").split(",").map((s) => s.trim()).filter(Boolean).map((n) => DIAS_CORTO[n] || "").filter(Boolean).join(" · ");
}
// Horario por clase → "Mar 17:00 · Jue 17:00".
function fmtHorario(slots) {
  if (!Array.isArray(slots) || !slots.length) return "";
  return slots.map((s) => `${DIAS_CORTO[String(s.dia)] || ""} ${String(s.hora_inicio || "").slice(0, 5)}`.trim()).join(" · ");
}

// Encabezado de módulo: chip con icono + título + subtítulo (+ acciones a la derecha).
function PageHead({ ico, title, sub, right }) {
  return (
    <div className="pnl-head">
      <div className="pnl-head-l">
        {ico && <span className="pnl-head-ico"><Ico n={ico} size={22} /></span>}
        <div className="pnl-head-tt">
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {right && <div className="pnl-head-r">{right}</div>}
    </div>
  );
}

// Desplegable personalizado (glass, con teclado, no se recorta: el menú va en position:fixed).
function Sel({ value, onChange, options, placeholder = "Elige…", disabled, width, tone = "default", ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const cur = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const repos = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", repos);
    window.addEventListener("scroll", repos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", repos);
      window.removeEventListener("scroll", repos, true);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  }
  function pick(v) { onChange(v); setOpen(false); }

  let menuStyle = null;
  if (rect) {
    const abajo = window.innerHeight - rect.bottom;
    const up = abajo < 260 && rect.top > abajo;
    menuStyle = {
      position: "fixed", left: rect.left, minWidth: rect.width, zIndex: 2000,
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    };
  }

  // El menú va en un portal al <body> para no descolocarse dentro de modales/tarjetas
  // con backdrop-filter (que crean un containing block para position:fixed).
  const menu = open && rect ? (
    <div ref={menuRef} className="sel-menu" role="listbox" style={menuStyle}>
      {options.map((o) => (
        <button type="button" key={String(o.value)} role="option" aria-selected={String(o.value) === String(value)}
          className={"sel-opt" + (String(o.value) === String(value) ? " on" : "")} onClick={() => pick(o.value)}>
          <span>{o.label}</span>
          {String(o.value) === String(value) && <Ico n="check" size={15} />}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={"sel" + (tone === "naranja" ? " t-naranja" : tone === "alerta" ? " t-alerta" : "")} style={width ? { width } : undefined}>
      <button type="button" ref={btnRef} className={"sel-btn" + (open ? " open" : "")} onClick={toggle}
        disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span className={"sel-val" + (cur ? "" : " ph")}>{cur ? cur.label : placeholder}</span>
        <span className="sel-chev"><Ico n="chevron" size={16} /></span>
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}


export { Ico, PageHead, Sel, fmtDias, fmtHorario, ROL_CORTO };
