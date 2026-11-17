import { useEffect, useState } from "react";
import Logo from "./Logo";
import { CITY_NAME, CITY_REGION } from "../config";

const KEY = "ab-intro-vista";
const DURATION = 2400;

function yaVista(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Intro de entrada: el logo se abre, un anillo carga de 000 a 100 y se desvanece. Solo una vez por sesión. */
export default function Intro() {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [show, setShow] = useState(() => !reduce && !yaVista());
  const [pct, setPct] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else close();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function close() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* sin almacenamiento: la intro simplemente vuelve a salir */
    }
    setLeaving(true);
    window.setTimeout(() => setShow(false), 650);
  }

  if (!show) return null;
  const r = 54;
  const c = 2 * Math.PI * r;

  return (
    <div className={`intro ${leaving ? "leaving" : ""}`} role="status" aria-label="Cargando AlertaBarrio">
      <div className="intro-stage">
        <svg className="intro-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={r} className="intro-track" />
          <circle cx="60" cy="60" r={r} className="intro-bar" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
        </svg>
        <span className="intro-wave w1" />
        <span className="intro-wave w2" />
        <span className="intro-wave w3" />
        <div className="intro-logo" style={{ ["--p" as string]: pct / 100 }}>
          <Logo size={72} />
        </div>
      </div>
      <b className="intro-brand">
        {"AlertaBarrio".split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
            {ch}
          </span>
        ))}
      </b>
      <small className="intro-city">
        {CITY_NAME} · {CITY_REGION}
      </small>
      <span className="intro-count">{String(pct).padStart(3, "0")}</span>
      <button type="button" className="intro-skip" onClick={close}>
        Saltar intro
      </button>
    </div>
  );
}
