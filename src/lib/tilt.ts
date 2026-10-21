const TILT = ".tile, .recent-card, .show-fotos, .features li, .stat-panel, .seg-card";

/** Inclina en 3D la tarjeta que esta bajo el mouse (solo con mouse y si el usuario acepta animaciones). */
export function activarInclinacion(): void {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let last: HTMLElement | null = null;
  document.addEventListener("pointermove", (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>(TILT) ?? null;
    if (last && last !== el) {
      last.style.removeProperty("--rx");
      last.style.removeProperty("--ry");
      last.classList.remove("tilting");
    }
    last = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.classList.add("tilting");
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  });
}
