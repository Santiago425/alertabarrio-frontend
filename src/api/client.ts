// Cliente HTTP: todas las llamadas al backend pasan por aqui.
import type {
  Connection,
  DailySummary,
  Heatmap,
  IncidentType,
  ModerationQueue,
  Neighborhood,
  Notification,
  RankingRow,
  Report,
  ReportCreated,
  SafeRoute,
  StatusEntry,
  Subscription,
  TokenResponse,
  UndoResult,
  User,
} from "./types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "alertabarrio_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join(". ");
    } catch {
      /* respuesta sin JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  hello: () => request<{ message: string; project: string; team: string[]; server_time: string }>("/api/v1/hello"),

  // auth
  login: (email: string, password: string) => post<TokenResponse>("/api/v1/auth/login", { email, password }),
  register: (data: { full_name: string; email: string; password: string; phone?: string; neighborhood_id?: number | null }) =>
    post<TokenResponse>("/api/v1/auth/register", data),
  me: () => request<User>("/api/v1/auth/me"),

  // catalogo
  neighborhoods: () => request<Neighborhood[]>("/api/v1/neighborhoods"),
  connections: () => request<Connection[]>("/api/v1/neighborhoods/connections"),
  ranking: () => request<RankingRow[]>("/api/v1/neighborhoods/ranking"),
  incidentTypes: () => request<IncidentType[]>("/api/v1/incident-types"),

  // reportes
  createReport: (data: unknown) => post<ReportCreated>("/api/v1/reports", data),
  feed: (neighborhoodId?: number) => request<Report[]>(`/api/v1/feed${qs({ neighborhood_id: neighborhoodId, limit: 100 })}`),
  mapReports: () => request<Report[]>("/api/v1/reports/map"),
  myReports: () => request<Report[]>("/api/v1/reports/mine"),
  reportsByRange: (from: string, to: string, neighborhoodId?: number) =>
    request<Report[]>(`/api/v1/reports${qs({ from, to, neighborhood_id: neighborhoodId })}`),
  history: (id: number) => request<StatusEntry[]>(`/api/v1/reports/${id}/history`),
  verify: (id: number) => post<Report>(`/api/v1/reports/${id}/verify`, { is_confirmed: true }),

  // moderacion
  queue: () => request<ModerationQueue>("/api/v1/moderation/queue"),
  inReview: () => request<Report[]>("/api/v1/moderation/in-review"),
  takeNext: () => post<Report>("/api/v1/moderation/next"),
  publish: (id: number) => post<{ report: Report; notifications_queued: number }>(`/api/v1/moderation/reports/${id}/publish`),
  reject: (id: number, note?: string) => post<Report>(`/api/v1/moderation/reports/${id}/reject`, { note }),
  undo: (id: number) => post<UndoResult>(`/api/v1/moderation/reports/${id}/undo`),

  // suscripciones y notificaciones
  mySubscriptions: () => request<Subscription[]>("/api/v1/subscriptions/me"),
  subscribe: (nid: number) => post<{ subscribed: boolean }>(`/api/v1/subscriptions/${nid}`),
  unsubscribe: (nid: number) => request<{ subscribed: boolean }>(`/api/v1/subscriptions/${nid}`, { method: "DELETE" }),
  notifications: () => request<Notification[]>("/api/v1/notifications/me"),
  markRead: (id: number) => post<Notification>(`/api/v1/notifications/${id}/read`),

  // IA
  aiStatus: () => request<Record<string, unknown>>("/api/v1/ai/status"),
  heatmap: (days = 120) => request<Heatmap>(`/api/v1/ai/heatmap${qs({ days })}`),
  dailySummary: (neighborhoodId: number, refresh = false) =>
    request<DailySummary>(`/api/v1/ai/daily-summary${qs({ neighborhood_id: neighborhoodId, refresh })}`),

  // rutas y estructuras
  safeRoute: (fromId: number, toId: number) => request<SafeRoute>(`/api/v1/routes/safe${qs({ from_id: fromId, to_id: toId })}`),
  dsState: () => request<Record<string, unknown>>("/api/v1/ds/state"),
};
