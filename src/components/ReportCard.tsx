import { useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Report, StatusEntry } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { pct, timeAgo } from "../lib/format";
import { StackView, StatusBadge, TypeBadge } from "./ui";

interface Props {
  report: Report;
  onChanged?: (r: Report) => void;
  actions?: ReactNode;
}

export default function ReportCard({ report, onChanged, actions }: Props) {
  const { user } = useAuth();
  const [history, setHistory] = useState<StatusEntry[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const toggleHistory = async () => {
    if (history) return setHistory(null);
    setHistory(await api.history(report.id));
  };

  const verify = async () => {
    try {
      const updated = await api.verify(report.id);
      setMsg("¡Gracias por confirmar!");
      onChanged?.(updated);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  };

  const canVerify =
    user && (report.status === "published" || report.status === "verified") && report.reporter_name !== user.full_name;

  return (
    <article className="report" style={{ borderLeftColor: report.incident_type.color }}>
      <div className="row space wrap gap-s">
        <div className="row gap-s wrap">
          <TypeBadge type={report.incident_type} />
          <StatusBadge status={report.status} />
          <span className="badge">Prioridad {report.priority_score}</span>
        </div>
        <small className="muted">
          {report.neighborhood.name} · {timeAgo(report.occurred_at)}
        </small>
      </div>
      <h4>{report.title}</h4>
      <p>{report.description}</p>
      {report.photos[0] && <img className="report-photo" src={report.photos[0]} alt="foto del reporte" />}
      {report.ai_suggested_type && (
        <p className="ai-line">
          🤖 IA: parece <b>{report.ai_suggested_type.name}</b> ({pct(report.ai_confidence)}) · riesgo de la zona a esa
          hora {pct(report.ai_zone_risk)}
        </p>
      )}
      <div className="row space wrap gap-s">
        <small className="muted">
          Reportado por {report.reporter_name}
          {report.confirmations ? ` · ${report.confirmations} vecino(s) confirmaron` : ""}
        </small>
        <div className="row gap-s">
          {canVerify && (
            <button className="btn small" onClick={verify}>
              ✔ Yo también lo vi
            </button>
          )}
          <button className="btn small ghost" onClick={toggleHistory}>
            {history ? "Ocultar historial" : "Historial (pila)"}
          </button>
          {actions}
        </div>
      </div>
      {msg && <small className="muted">{msg}</small>}
      {history && <StackView entries={history} />}
    </article>
  );
}
