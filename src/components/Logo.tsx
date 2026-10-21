import { useId } from "react";

/** Logo de AlertaBarrio: pin de ubicacion con escudo de alerta y ondas de aviso. */
export default function Logo({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset=".55" stopColor="#c026d3" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#lg${id})`} />
      <path d="M15.5 17.5a15 15 0 0 0-3.6 9.6M48.5 17.5a15 15 0 0 1 3.6 9.6" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2.6" strokeLinecap="round" className="logo-wave" />
      <path d="M10 12.8a21 21 0 0 0-5 13.6M54 12.8a21 21 0 0 1 5 13.6" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2.4" strokeLinecap="round" className="logo-wave far" />
      <path d="M32 12c-8.6 0-15.5 6.7-15.5 15.1 0 10.4 12.7 21.8 14.3 23.2a1.8 1.8 0 0 0 2.4 0c1.6-1.4 14.3-12.8 14.3-23.2C47.5 18.7 40.6 12 32 12Z" fill="#fff" />
      <path d="M32 19.5l-7.5 2.8v5.4c0 4.9 3.2 8.9 7.5 10.3 4.3-1.4 7.5-5.4 7.5-10.3v-5.4Z" fill={`url(#lg${id})`} />
      <path d="M32 23.8v6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="32" cy="33.6" r="1.7" fill="#fff" />
    </svg>
  );
}
