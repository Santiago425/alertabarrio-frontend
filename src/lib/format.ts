import type { ReportStatus } from "../api/types";

export const STATUS_LABEL: Record<ReportStatus, string> = {
  created: "Creado",
  in_review: "En revisión",
  published: "Publicado",
  verified: "Verificado",
  rejected: "Rechazado",
};

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const HOUR_BLOCKS = ["00:00–06:00", "06:00–12:00", "12:00–18:00", "18:00–24:00"];


export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

export const pct = (v?: number | null) => (v === undefined || v === null ? "—" : `${Math.round(v * 100)}%`);

export const km = (m: number) => `${(m / 1000).toFixed(1)} km`;

/** Radio en metros para pintar cada celda del mapa de calor (segun la separacion de la grilla). */
export function heatRadius(cells: { latitude: number }[]): number {
  const lats = [...new Set(cells.map((c) => c.latitude))].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < lats.length; i++) step = Math.min(step, lats[i] - lats[i - 1]);
  return Number.isFinite(step) ? Math.max(60, Math.round(step * 111_000 * 1.1)) : 150;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export const longDate = (date = new Date()) =>
  date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

/** 60 -> "1 h", 90 -> "1 h 30 min", 2880 -> "2 días", 0 -> "No vence" */
export function duration(minutes?: number | null): string {
  if (!minutes) return "No vence";
  if (minutes % 1440 === 0) return `${minutes / 1440} día${minutes === 1440 ? "" : "s"}`;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Cuanto le falta a una alerta para salir del mapa. */
export function expiresIn(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 60000;
  if (diff <= 0) return "vencida";
  if (diff < 60) return `vence en ${Math.ceil(diff)} min`;
  if (diff < 1440) return `vence en ${Math.round(diff / 60)} h`;
  return `vence en ${Math.round(diff / 1440)} días`;
}
