import { useEffect, useRef } from "react";
import type { Report } from "../api/types";
import { CITY_CENTER, CITY_NAME } from "../config";

/**
 * Pasto en 3D: el valle, el volcán Galeras y las alertas recientes como faros de luz.
 * Se dibuja en un canvas sin librerías. Arrastra para girar (con inercia) y toca para
 * lanzar una onda de aviso sobre el terreno. Pasa el mouse por un faro para ver la alerta.
 */

const N = 42; // vértices por lado de la malla
const SPAN = 0.04; // grados de lat/lng que cubre medio lado del terreno
const GALERAS = { x: -0.62, z: -0.5 };
const CITY = { x: 0.12, z: 0.16 };
const BUCKETS = 9;

type Pulse = { x: number; z: number; t0: number };
type Beacon = { x: number; z: number; color: string; title: string; place: string; sev: number; seed: number };
type Projected = { sx: number; sy: number; depth: number };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function baseHeight(x: number, z: number): number {
  const dg = (x - GALERAS.x) ** 2 + (z - GALERAS.z) ** 2;
  const volcano = 0.66 * Math.exp(-dg / 0.085) - 0.14 * Math.exp(-dg / 0.0035);
  const hills =
    0.055 * Math.sin(3.1 * x + 1.3) * Math.cos(2.7 * z - 0.4) +
    0.035 * Math.sin(5.7 * x * z + 2.1) +
    0.02 * Math.cos(8.3 * x - 6.1 * z);
  const rim = 0.2 * smooth(0.55, 1.15, Math.hypot(x, z));
  const dc = (x - CITY.x) ** 2 + (z - CITY.z) ** 2;
  const valley = 1 - 0.85 * Math.exp(-dc / 0.11);
  return volcano + (hills + rim + 0.04) * valley;
}

// la ciudad: puntos de luz fijos en el valle
const CITY_LIGHTS = Array.from({ length: 150 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.1234;
  const ang = (a - Math.floor(a)) * Math.PI * 2;
  const rad = Math.sqrt(b - Math.floor(b)) * 0.36;
  return { x: CITY.x + Math.cos(ang) * rad * 1.2, z: CITY.z + Math.sin(ang) * rad * 0.8, ph: (a - Math.floor(a)) * 6.28 };
});

function toBeacons(reports: Report[] | undefined): Beacon[] {
  if (!reports) return [];
  return reports.slice(0, 30).map((r, i) => ({
    x: Math.max(-0.95, Math.min(0.95, (r.longitude - CITY_CENTER[1]) / SPAN + CITY.x)),
    z: Math.max(-0.95, Math.min(0.95, -(r.latitude - CITY_CENTER[0]) / SPAN + CITY.z)),
    color: r.incident_type.color || "#e11d48",
    title: r.title,
    place: r.neighborhood.name,
    sev: r.incident_type.severity_level ?? 2,
    seed: i * 0.77,
  }));
}

export default function Pasto3D({ reports }: { reports?: Report[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beaconsRef = useRef<Beacon[]>([]);
  beaconsRef.current = toBeacons(reports);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let yaw = -0.5, pitch = 0.62, yawVel = 0, pitchVel = 0;
    let dragging = false, moved = 0, lastX = 0, lastY = 0;
    let hover = -1;
    let visible = true;
    let frame = 0;
    const pulses: Pulse[] = [];
    const heights = new Float32Array(N * N);
    const proj: Projected[] = Array.from({ length: N * N }, () => ({ sx: 0, sy: 0, depth: 0 }));
    let beaconScreen: { sx: number; sy: number; gx: number; gy: number; depth: number; i: number }[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(loop);
    });
    io.observe(canvas);

    const project = (x: number, y: number, z: number, out: Projected) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const depth = z2 + 3.1;
      const f = Math.min(w * 1.3, h * 2.1);
      out.sx = w / 2 + (f * x1) / depth;
      out.sy = h * 0.56 - (f * y2) / depth;
      out.depth = depth;
      return out;
    };

    const heightAt = (x: number, z: number, now: number) => {
      let y = baseHeight(x, z);
      for (const p of pulses) {
        const age = (now - p.t0) / 1000;
        const d = Math.hypot(x - p.x, z - p.z);
        const front = age * 0.9;
        if (d > front) continue;
        y += 0.07 * Math.sin((d - front) * 18) * Math.exp(-age * 1.1) * Math.exp(-(front - d) * 2.2);
      }
      return y;
    };

    const tmp: Projected = { sx: 0, sy: 0, depth: 0 };
    let last = performance.now();

    function loop(now: number) {
      frame = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(50, now - last);
      last = now;
      if (!dragging) {
        yaw += yawVel;
        pitch = Math.max(0.28, Math.min(1.1, pitch + pitchVel));
        yawVel *= 0.94;
        pitchVel *= 0.9;
        if (!reduce && Math.abs(yawVel) < 0.0004) yaw += dt * 0.00009;
      }
      while (pulses.length && now - pulses[0].t0 > 4200) pulses.shift();

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      // malla del terreno
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const x = (i / (N - 1)) * 2 - 1;
          const z = (j / (N - 1)) * 2 - 1;
          const y = heightAt(x, z, now);
          heights[j * N + i] = y;
          project(x, y * 0.9 - 0.12, z, proj[j * N + i]);
        }
      const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      const seg = (a: number, b: number) => {
        const hy = (heights[a] + heights[b]) / 2;
        const k = Math.max(0, Math.min(BUCKETS - 1, Math.floor((hy / 0.6) * BUCKETS)));
        paths[k].moveTo(proj[a].sx, proj[a].sy);
        paths[k].lineTo(proj[b].sx, proj[b].sy);
      };
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const a = j * N + i;
          if (i < N - 1) seg(a, a + 1);
          if (j < N - 1) seg(a, a + N);
        }
      ctx!.lineWidth = 1;
      for (let k = 0; k < BUCKETS; k++) {
        const t = k / (BUCKETS - 1);
        const r = Math.round(37 + t * 180), g = Math.round(99 + t * 140), b = Math.round(235 + t * 20);
        ctx!.strokeStyle = `rgba(${r},${g},${b},${0.28 + t * 0.5})`;
        ctx!.stroke(paths[k]);
      }

      // luces de la ciudad
      for (const l of CITY_LIGHTS) {
        project(l.x, heightAt(l.x, l.z, now) * 0.9 - 0.12, l.z, tmp);
        const a = 0.55 + 0.45 * Math.sin(now * 0.002 + l.ph * 3);
        ctx!.fillStyle = `rgba(251, 191, 36, ${(a * 0.8).toFixed(3)})`;
        ctx!.fillRect(tmp.sx - 1, tmp.sy - 1, 2, 2);
      }

      // nombres
      ctx!.font = "600 11px Inter, system-ui, sans-serif";
      ctx!.textAlign = "center";
      project(GALERAS.x, baseHeight(GALERAS.x, GALERAS.z) * 0.9 - 0.02, GALERAS.z, tmp);
      ctx!.fillStyle = "rgba(226, 232, 240, 0.75)";
      ctx!.fillText("Volcán Galeras", tmp.sx, tmp.sy - 10);
      project(CITY.x, 0.12, CITY.z, tmp);
      ctx!.fillStyle = "rgba(254, 243, 199, 0.85)";
      ctx!.fillText(CITY_NAME, tmp.sx, tmp.sy);

      // faros de alerta
      const beacons = beaconsRef.current;
      beaconScreen = beacons
        .map((b, i) => {
          const gy = heightAt(b.x, b.z, now) * 0.9 - 0.12;
          const g = project(b.x, gy, b.z, { sx: 0, sy: 0, depth: 0 });
          const top = project(b.x, gy + 0.2 + b.sev * 0.035, b.z, { sx: 0, sy: 0, depth: 0 });
          return { sx: top.sx, sy: top.sy, gx: g.sx, gy: g.sy, depth: g.depth, i };
        })
        .sort((a, b) => b.depth - a.depth);
      for (const s of beaconScreen) {
        const b = beacons[s.i];
        const ph = ((now * 0.0006 + b.seed) % 1 + 1) % 1;
        ctx!.strokeStyle = b.color;
        ctx!.globalAlpha = (1 - ph) * 0.8;
        ctx!.beginPath();
        ctx!.ellipse(s.gx, s.gy, 4 + ph * 22, (4 + ph * 22) * 0.42, 0, 0, Math.PI * 2);
        ctx!.stroke();
        const grad = ctx!.createLinearGradient(s.gx, s.gy, s.sx, s.sy);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.globalAlpha = 0.9;
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = s.i === hover ? 3 : 2;
        ctx!.beginPath();
        ctx!.moveTo(s.gx, s.gy);
        ctx!.lineTo(s.sx, s.sy);
        ctx!.stroke();
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = 1;
        ctx!.shadowColor = b.color;
        ctx!.shadowBlur = 12;
        ctx!.fillStyle = b.color;
        ctx!.beginPath();
        ctx!.arc(s.gx, s.gy, s.i === hover ? 5 : 3.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // etiqueta de la alerta bajo el mouse
      if (hover >= 0 && beacons[hover]) {
        const s = beaconScreen.find((x) => x.i === hover);
        if (s) {
          const b = beacons[hover];
          const title = b.title.length > 34 ? b.title.slice(0, 33) + "…" : b.title;
          ctx!.font = "600 12px Inter, system-ui, sans-serif";
          const tw = Math.max(ctx!.measureText(title).width, ctx!.measureText(b.place).width) + 22;
          const bx = Math.max(6, Math.min(w - tw - 6, s.sx - tw / 2));
          const by = Math.max(6, s.sy - 52);
          ctx!.fillStyle = "rgba(11, 13, 18, 0.88)";
          ctx!.strokeStyle = "rgba(255,255,255,0.14)";
          ctx!.beginPath();
          ctx!.roundRect(bx, by, tw, 42, 10);
          ctx!.fill();
          ctx!.stroke();
          ctx!.textAlign = "left";
          ctx!.fillStyle = "#fff";
          ctx!.fillText(title, bx + 11, by + 18);
          ctx!.font = "500 11px Inter, system-ui, sans-serif";
          ctx!.fillStyle = b.color;
          ctx!.fillText(b.place, bx + 11, by + 33);
        }
      }

      frame = requestAnimationFrame(loop);
    }

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      [lastX, lastY] = pos(e);
      yawVel = pitchVel = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const [x, y] = pos(e);
      if (dragging) {
        const dx = x - lastX, dy = y - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        yawVel = dx * 0.008;
        pitchVel = dy * 0.004;
        yaw += yawVel;
        pitch = Math.max(0.28, Math.min(1.1, pitch + pitchVel));
        lastX = x;
        lastY = y;
        return;
      }
      hover = nearestBeacon(x, y);
      canvas.style.cursor = hover >= 0 ? "pointer" : "grab";
    };
    const nearestBeacon = (x: number, y: number) => {
      let best = -1, bestD = 18 * 18;
      for (const s of beaconScreen) {
        for (const [px, py] of [[s.sx, s.sy], [s.gx, s.gy]]) {
          const d = (px - x) ** 2 + (py - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = s.i;
          }
        }
      }
      return best;
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        // toque: onda de aviso desde el punto más cercano del terreno
        const [x, y] = pos(e);
        hover = nearestBeacon(x, y);
        let best = 0, bestD = Infinity;
        for (let k = 0; k < proj.length; k++) {
          const d = (proj[k].sx - x) ** 2 + (proj[k].sy - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        }
        pulses.push({ x: ((best % N) / (N - 1)) * 2 - 1, z: (Math.floor(best / N) / (N - 1)) * 2 - 1, t0: performance.now() });
        if (pulses.length > 4) pulses.shift();
      }
    };
    const leave = () => {
      hover = -1;
    };
    const vis = () => {
      if (!document.hidden && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);
    // una onda de bienvenida desde el centro de la ciudad
    pulses.push({ x: CITY.x, z: CITY.z, t0: performance.now() });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pasto3d"
      role="img"
      aria-label={`Vista 3D de ${CITY_NAME} con el volcán Galeras y ${reports?.length ?? 0} alertas recientes`}
    />
  );
}
