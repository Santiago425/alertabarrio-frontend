import { useEffect, useState } from "react";

/** Anima un numero desde 0 hasta su valor. */
export function useCountUp(target?: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return target === undefined ? undefined : value;
}
