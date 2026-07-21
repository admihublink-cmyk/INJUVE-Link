"use client";
import { useState } from "react";

export default function Globo({ size = 240, rapido = false, className = "" }) {
  const [conLogo, setConLogo] = useState(true);
  const clase = `globo-giro${rapido ? " rapido" : ""} ${className}`;

  if (conLogo) {
    return (
      <img
        src="/logos/logo-oficial-2.webp"
        alt="INJUVE Link"
        width={size}
        height={size}
        className={clase}
        style={{ width: size, height: size, objectFit: "contain", filter: "drop-shadow(0 24px 40px rgba(22,19,16,0.45))" }}
        onError={() => setConLogo(false)}
      />
    );
  }

  return (
    <svg
      className={clase}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Globo INJUVE Link"
    >
      <circle cx="100" cy="100" r="92" fill="none" stroke="#FFFFFF" strokeWidth="7" />
      <ellipse cx="100" cy="100" rx="92" ry="38" fill="none" stroke="#FFFFFF" strokeWidth="5" opacity="0.85" />
      <ellipse cx="100" cy="100" rx="58" ry="90" fill="none" stroke="#FCE4EC" strokeWidth="5" opacity="0.9" />
      <line x1="8" y1="100" x2="192" y2="100" stroke="#FFFFFF" strokeWidth="5" opacity="0.7" />
      <line x1="100" y1="8" x2="100" y2="192" stroke="#FFFFFF" strokeWidth="5" opacity="0.7" />
      <circle cx="100" cy="100" r="14" fill="#D81B60" />
      <circle cx="158" cy="62" r="9" fill="#FFFFFF" />
      <circle cx="46" cy="138" r="9" fill="#FFFFFF" />
    </svg>
  );
}
