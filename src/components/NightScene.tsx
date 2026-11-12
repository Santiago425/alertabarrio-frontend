import { useEffect, useRef } from "react";

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
    </div>
  );
}
