import { useId } from "react";

/** Sol de los Pastos: estrella de ocho puntas de la orfebreria y ceramica de los Pastos. */
export function SolPastos({ size = 120, className = "", tone = "gold" }: { size?: number; className?: string; tone?: "gold" | "light" | "terra" }) {
  const c = TONES[tone];
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={`sol-pastos ${className}`} aria-hidden="true">
      <g className="sol-rays">
        {rays.map((a, i) => (
          <path key={a} d="M0-47 L7-30 L0-18 L-7-30Z" transform={`rotate(${a})`} fill={i % 2 ? c.b : c.a} />
        ))}
        {rays.map((a) => (
          <path key={`s${a}`} d="M0-26 L3-21 L0-17 L-3-21Z" transform={`rotate(${a + 22.5})`} fill={c.a} opacity=".8" />
        ))}
      </g>
      <circle r="16" fill="none" stroke={c.a} strokeWidth="2.4" />
      <rect x="-8.5" y="-8.5" width="17" height="17" fill={c.b} />
      <rect x="-8.5" y="-8.5" width="17" height="17" fill={c.a} transform="rotate(45)" opacity=".85" />
      <circle r="4" fill={c.core} />
    </svg>
  );
}

const TONES = {
  gold: { a: "#c79a2c", b: "#b5452b", core: "#1f5f4a" },
  light: { a: "#f3ecd9", b: "#e2c26f", core: "#b5452b" },
  terra: { a: "#b5452b", b: "#1f5f4a", core: "#c79a2c" },
};

/** Franja con rombos escalonados y dientes, al estilo del barniz de Pasto (mopa-mopa). */
export function Franja({ className = "", height = 14 }: { className?: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`franja ${className}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={`fr${id}`} width="36" height="14" patternUnits="userSpaceOnUse">
          <rect width="36" height="14" fill="#1f1c17" />
          <path d="M0 0h6l-3 3.5Z M12 0h6l-3 3.5Z M24 0h6l-3 3.5Z" fill="#b5452b" />
          <path d="M6 14h6l-3-3.5Z M18 14h6l-3-3.5Z M30 14h6l-3-3.5Z" fill="#2c7458" />
          <path d="M18 2.5 22.5 7 18 11.5 13.5 7Z" fill="#c79a2c" />
          <path d="M18 5 20 7 18 9 16 7Z" fill="#1f1c17" />
          <rect x="3" y="6" width="3" height="2" fill="#f3ecd9" />
          <rect x="30" y="6" width="3" height="2" fill="#f3ecd9" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#fr${id})`} />
    </svg>
  );
}
