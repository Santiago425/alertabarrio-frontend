import { useEffect, useRef } from "react";

/** Escudo de seguridad en 3D con ondas de radar (gira con el mouse junto con el fondo). */
function SecurityEmblem() {
  return (
    <div className="sec-emblem">
      <span className="sec-ring r1" />
      <span className="sec-ring r2" />
      <span className="sec-ring r3" />
      <span className="sec-sweep" />
      <svg className="sec-shield" viewBox="0 0 200 230" role="presentation">
        <defs>
          <linearGradient id="shieldFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb7185" />
            <stop offset=".45" stopColor="#e11d48" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="shieldRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="shieldShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M100 6 186 38v62c0 62-38 106-86 124C52 206 14 162 14 100V38z" fill="url(#shieldRim)" />
        <path d="M100 20 172 47v53c0 53-32 91-72 107-40-16-72-54-72-107V47z" fill="url(#shieldFace)" />
        <path d="M100 20 172 47v53c0 20-4 38-12 54L100 20z" fill="#000" opacity=".12" />
        <path d="M100 20 28 47v53c0 30 10 56 28 75L100 20z" fill="url(#shieldShine)" />
        <path d="m100 62 11.8 24 26.5 3.9-19.2 18.7 4.5 26.4L100 122.5 76.4 135l4.5-26.4-19.2-18.7 26.5-3.9z" fill="#fff7ed" />
        <text x="100" y="175" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff7ed" letterSpacing="2">
          SEGURIDAD
        </text>
      </svg>
    </div>
  );
}

/** Fondo de Pasto de noche en capas que se mueven con el mouse (efecto 3D). */
const LAYERS = [
  { img: "sky", depth: 6 },
  { img: "volcano", depth: 14 },
  { img: "hills", depth: 26 },
  { img: "city", depth: 44 },
];

export default function NightScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let tx = 0, ty = 0, x = 0, y = 0;
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--mx", x.toFixed(4));
      el.style.setProperty("--my", y.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="night-scene" ref={ref} aria-hidden="true">
      {LAYERS.map((l) => (
        <div
          key={l.img}
          className={`night-layer night-${l.img}`}
          style={{ backgroundImage: `url(/photos/night-${l.img}.svg)`, ["--d" as string]: l.depth }}
        />
      ))}
      <div className="night-shade" />
      <SecurityEmblem />
    </div>
  );
}
