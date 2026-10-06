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

export const BOGOTA_CENTER: [number, number] = [4.655, -74.1];

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
