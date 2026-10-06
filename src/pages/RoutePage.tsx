import { useState } from "react";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { api } from "../api/client";
import type { SafeRoute } from "../api/types";
import BaseMap from "../components/BaseMap";
import { Card, DSTag, ErrorBox } from "../components/ui";
import { km } from "../lib/format";
import { useAsync } from "../lib/useAsync";

export default function RoutePage() {
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const connections = useAsync(() => api.connections(), []);
  const ranking = useAsync(() => api.ranking(), []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [route, setRoute] = useState<SafeRoute | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(neighborhoods.data?.map((n) => [n.id, n]));
  const severity = new Map(ranking.data?.map((r) => [r.neighborhood_id, r.active_severity]));
  const maxSev = Math.max(1, ...(ranking.data?.map((r) => r.active_severity) ?? [1]));

  const calc = async () => {
    setError(null);
    try {
      setRoute(await api.safeRoute(Number(from), Number(to)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <div className="stack-l">
      <div>
        <h2>Ruta más segura</h2>
        <p className="muted">
          Cada barrio es un vértice y cada vía una arista con su distancia. Dijkstra busca el camino de menor costo, castigando
          los barrios con alertas activas. <DSTag>Graph + Dijkstra + BFS</DSTag>
        </p>
      </div>
      <div className="row gap-s wrap">
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">Desde…</option>
          {neighborhoods.data?.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Hasta…</option>
          {neighborhoods.data?.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <button className="btn" disabled={!from || !to || from === to} onClick={calc}>
          Calcular
        </button>
      </div>
      <ErrorBox message={error} />
      {route && (
        <Card title="Resultado">
          <p>{route.explanation}</p>
          <p>
            <b className="green-text">Segura ({km(route.safe_path_meters)}):</b> {route.safe_path.map((n) => n.name).join(" → ")}
          </p>
          <p>
            <b className="gray-text">Más corta ({km(route.shortest_path_meters)}):</b> {route.shortest_path.map((n) => n.name).join(" → ")}
          </p>
          <p className="muted">Menos barrios (BFS): {route.fewest_hops_path.map((n) => n.name).join(" → ")}</p>
        </Card>
      )}
      <BaseMap height={520}>
        {connections.data?.map((c, i) => {
          const a = byId.get(c.from_id);
          const b = byId.get(c.to_id);
          if (!a || !b) return null;
          return <Polyline key={i} positions={[[a.latitude, a.longitude], [b.latitude, b.longitude]]} pathOptions={{ color: "#94a3b8", weight: 2, dashArray: "4 6" }} />;
        })}
        {route && (
          <Polyline positions={route.shortest_path.map((n) => [n.latitude, n.longitude])} pathOptions={{ color: "#64748b", weight: 6, opacity: 0.6 }} />
        )}
        {route && <Polyline positions={route.safe_path.map((n) => [n.latitude, n.longitude])} pathOptions={{ color: "#16a34a", weight: 5 }} />}
        {neighborhoods.data?.map((n) => {
          const s = severity.get(n.id) ?? 0;
          return (
            <CircleMarker
              key={n.id}
              center={[n.latitude, n.longitude]}
              radius={8 + (s / maxSev) * 12}
              pathOptions={{ color: "#fff", weight: 2, fillColor: s ? "#dc2626" : "#2563eb", fillOpacity: 0.25 + (s / maxSev) * 0.6 }}
            >
              <Tooltip>
                {n.name} · gravedad activa {s}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </BaseMap>
    </div>
  );
}
