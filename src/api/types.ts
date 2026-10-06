// Tipos que devuelve la API del backend (mismos nombres que los esquemas Pydantic)

export type ReportStatus = "created" | "in_review" | "published" | "verified" | "rejected";

export interface Neighborhood {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface IncidentType {
  id: number;
  code: string;
  name: string;
  severity_level: number;
  color: string;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "citizen" | "moderator" | "admin";
  neighborhood?: Neighborhood | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Report {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  occurred_at: string;
  created_at: string;
  status: ReportStatus;
  priority_score: number;
  neighborhood: Neighborhood;
  incident_type: IncidentType;
  reporter_name: string;
  photos: string[];
  ai_suggested_type?: IncidentType | null;
  ai_confidence?: number | null;
  ai_zone_risk?: number | null;
  confirmations?: number | null;
}

export interface AIResult {
  available: boolean;
  model?: string | null;
  suggested_type?: IncidentType | null;
  confidence?: number | null;
  zone_risk?: number | null;
  matches_user_choice?: boolean | null;
  top_predictions: { code: string; probability: number }[];
}

export interface ReportCreated {
  report: Report;
  ai: AIResult;
  queue_position: number;
  queue_size: number;
}

export interface StatusEntry {
  id: number;
  previous_status: ReportStatus | null;
  new_status: ReportStatus;
  changed_by: number | null;
  note: string | null;
  changed_at: string;
}

export interface ModerationQueue {
  size: number;
  reports: Report[];
  heap_array: { priority: number; id: number }[];
}

export interface UndoResult {
  report: Report;
  undone_status: ReportStatus;
  current_status: ReportStatus;
  stack: StatusEntry[];
}

export interface Notification {
  id: number;
  report_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Subscription {
  neighborhood: Neighborhood;
  created_at: string;
}

export interface HeatCell {
  latitude: number;
  longitude: number;
  intensity: number;
}

export interface Hotspot {
  neighborhood_id: number;
  neighborhood_name: string;
  day_of_week: number;
  hour_block: number;
  risk_score: number;
}

export interface Heatmap {
  available: boolean;
  model: string;
  reports_analyzed: number;
  cells: HeatCell[];
  hotspots: Hotspot[];
  neighborhood_risk: { neighborhood_id: number; neighborhood_name: string; risk_score: number }[];
  insights: string[];
}

export interface DailySummary {
  available: boolean;
  neighborhood: Neighborhood;
  summary_date: string;
  reports_count: number;
  summary_text: string;
  model: string;
  cached: boolean;
}

export interface Connection {
  from_id: number;
  to_id: number;
  distance_meters: number;
  road_name?: string | null;
}

export interface SafeRoute {
  from_neighborhood: Neighborhood;
  to_neighborhood: Neighborhood;
  safe_path: Neighborhood[];
  safe_path_meters: number;
  shortest_path: Neighborhood[];
  shortest_path_meters: number;
  fewest_hops_path: Neighborhood[];
  avoided: { neighborhood: string; active_severity: number }[];
  explanation: string;
}

export interface RankingRow {
  neighborhood_id: number;
  neighborhood: string;
  active_alerts: number;
  active_severity: number;
  subscribers: number;
}
