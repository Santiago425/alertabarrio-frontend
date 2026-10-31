// Configuracion de la app: todo sale de variables de entorno (archivo .env, ver .env.example).
// Los valores de respaldo solo sirven para correr en local sin .env.
const env = import.meta.env;

const numbers = (value: string | undefined, fallback: number[]) => {
  const parsed = (value ?? "").split(",").map(Number);
  return parsed.length === fallback.length && parsed.every(Number.isFinite) ? parsed : fallback;
};

export const API_URL = (env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
// Servicio de IA (solo se usa para despertarlo en Render; si no se define, lo despierta el backend)
export const AI_URL = (env.VITE_AI_URL ?? "").replace(/\/$/, "");

export const CITY_NAME = env.VITE_CITY_NAME ?? "Pasto";
export const CITY_REGION = env.VITE_CITY_REGION ?? "Nariño";
export const CITY_CENTER = numbers(env.VITE_CITY_CENTER, [1.2125, -77.2805]) as [number, number];
export const CITY_ZOOM = Number(env.VITE_CITY_ZOOM ?? 14);

// Nombre del asistente de IA
export const ASSISTANT_NAME = env.VITE_ASSISTANT_NAME ?? "Vigía";
