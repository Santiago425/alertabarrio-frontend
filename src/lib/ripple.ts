const TARGETS = ".btn, .chip, .segmented button, .role-switch button";

/** Onda de luz que sale desde el punto donde se toca un botón (como la onda del mapa 3D). */
export function enableRipple(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.addEventListener("pointerdown", (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>(TARGETS);
    if (!el || (el as HTMLButtonElement).disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const wave = document.createElement("span");
    wave.className = "ripple";
    wave.style.width = wave.style.height = `${size}px`;
    wave.style.left = `${e.clientX - r.left - size / 2}px`;
    wave.style.top = `${e.clientY - r.top - size / 2}px`;
    el.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove());
  });
}
