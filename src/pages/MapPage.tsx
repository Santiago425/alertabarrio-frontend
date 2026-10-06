import { useEffect, useState } from "react";
import { Circle, CircleMarker, Popup } from "react-leaflet";
import { api } from "../api/client";
import type { Heatmap } from "../api/types";
import BaseMap from "../components/BaseMap";
import { Card, DSTag, ErrorBox, StatusBadge } from "../components/ui";
import { formatDate } from "../lib/format";
import { useAsync } from "../lib/useAsync";

export default function MapPage() {
  const reports = useAsync(() => api.mapReports(), []);
  const types = useAsync(() => api.incidentTypes(), []);
  const [heat, setHeat] = useState<Heatmap | null>(null);
  const [showHeat, setShowHeat] = useState(false);

  // Refresco automatico cada 30 s para ver alertas "en tiempo real"
  useEffect(() => {
    const t = setInterval(() => reports.reload(), 30000);
    return () => clearInterval(t);
  }, [reports.reload]);

  const toggleHeat = async () => {
    if (!heat) setHeat(await api.heatmap());
    setShowHeat(!showHeat);
  };

  return (
    <div className="stack-l">
      <div className="row space wrap gap-s">
        <div>
          <h2>Mapa de alertas en vivo</h2>
          <p className="muted">
            Alertas publicadas y verificadas, coloreadas por gravedad. <DSTag>HashTable → LinkedList por barrio</DSTag>
          </p>
        </div>
        <button className="btn" onClick={toggleHeat}>
          {showHeat ? "Ocultar mapa de calor" : "🤖 Mapa de calor predictivo (IA)"}
        </button>
      </div>
      <ErrorBox message={reports.error} />
      <BaseMap height={560}>
        {showHeat &&
          heat?.cells.map((c, i) => (
            <Circle
              key={`h${i}`}
              center={[c.latitude, c.longitude]}
              radius={420}
              pathOptions={{ stroke: false, fillColor: c.intensity > 0.6 ? "#dc2626" : c.intensity > 0.3 ? "#f97316" : "#facc15", fillOpacity: 0.12 + c.intensity * 0.45 }}
            />
          ))}
        {reports.data?.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.latitude, r.longitude]}
            radius={5 + r.incident_type.severity_level * 2}
            pathOptions={{ color: "#fff", weight: 1.5, fillColor: r.incident_type.color, fillOpacity: 0.9 }}
          >
            <Popup>
              <b>{r.title}</b>
              <br />
              {r.incident_type.name} · {r.neighborhood.name}
              <br />
              {formatDate(r.occurred_at)} <StatusBadge status={r.status} />
              <p style={{ margin: "6px 0 0" }}>{r.description}</p>
            </Popup>
          </CircleMarker>
        ))}
      </BaseMap>
      <div className="legend">
        {types.data?.map((t) => (
          <span key={t.id}>
            <i style={{ background: t.color }} /> {t.name}
          </span>
        ))}
      </div>
      {showHeat && heat && (
        <Card title={`Patrones detectados por la IA (${heat.model})`}>
          <ul>
            {heat.insights.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <small className="muted">{heat.reports_analyzed} reportes analizados de los últimos 120 días.</small>
        </Card>
      )}
    </div>
  );
}
