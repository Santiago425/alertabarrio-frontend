import { useId } from "react";

/** Emblema: estrella de ocho puntas que gira despacio (logo de fondo). */
export function SunEmblem({ size = 120, className = "", tone = "gold" }: { size?: number; className?: string; tone?: "gold" | "light" | "terra" }) {
  const c = TONES[tone];
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={`sun-emblem ${className}`} aria-hidden="true">
      <g className="sun-rays">
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
  gold: { a: "#2563eb", b: "#60a5fa", core: "#1e40af" },
  light: { a: "#e5e7eb", b: "#93c5fd", core: "#60a5fa" },
  terra: { a: "#0b0d12", b: "#2563eb", core: "#60a5fa" },
};

/** Franja decorativa con rombos escalonados y dientes. */
export function Stripe({ className = "", height = 14 }: { className?: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`stripe ${className}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={`fr${id}`} width="36" height="14" patternUnits="userSpaceOnUse">
          <rect width="36" height="14" fill="#0b0d12" />
          <path d="M0 0h6l-3 3.5Z M12 0h6l-3 3.5Z M24 0h6l-3 3.5Z" fill="#e11d48" />
          <path d="M6 14h6l-3-3.5Z M18 14h6l-3-3.5Z M30 14h6l-3-3.5Z" fill="#3b82f6" />
          <path d="M18 2.5 22.5 7 18 11.5 13.5 7Z" fill="#2563eb" />
          <path d="M18 5 20 7 18 9 16 7Z" fill="#0b0d12" />
          <rect x="3" y="6" width="3" height="2" fill="#e5e7eb" />
          <rect x="30" y="6" width="3" height="2" fill="#e5e7eb" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#fr${id})`} />
    </svg>
  );
}
