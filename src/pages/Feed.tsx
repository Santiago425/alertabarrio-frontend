import { useState } from "react";
import { api } from "../api/client";
import type { Report } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ReportCard from "../components/ReportCard";
import { Card, DSTag, ErrorBox, Loading } from "../components/ui";
import { useAsync } from "../lib/useAsync";

export default function Feed() {
  const { user } = useAuth();
  const [hood, setHood] = useState<number | undefined>(user?.neighborhood?.id);
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const feed = useAsync(() => api.feed(hood), [hood]);
  const summary = useAsync(() => (hood ? api.dailySummary(hood) : Promise.resolve(null)), [hood]);

  const replace = (r: Report) => feed.setData((feed.data ?? []).map((x) => (x.id === r.id ? r : x)));

  return (
    <div className="stack-l">
      <div className="row space wrap gap-s">
        <div>
          <h2>Alertas activas</h2>
          <p className="muted">
            {hood ? (
              <>Feed del barrio, lo más reciente primero. <DSTag>LinkedList</DSTag></>
            ) : (
              <>Toda la ciudad ordenada por prioridad. <DSTag>merge sort</DSTag></>
            )}
          </p>
        </div>
        <select value={hood ?? ""} onChange={(e) => setHood(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Toda la ciudad</option>
          {neighborhoods.data?.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {hood && (
        <Card title="🤖 Resumen del día (IA)" actions={<small className="muted">{summary.data?.model}</small>}>
          {summary.loading ? <Loading text="Generando resumen…" /> : <p className="summary">{summary.data?.summary_text}</p>}
        </Card>
      )}

      <ErrorBox message={feed.error} />
      {feed.loading && <Loading />}
      {feed.data?.length === 0 && <p className="muted">No hay alertas activas aquí. 🎉</p>}
      <div className="stack-m">
        {feed.data?.map((r) => (
          <ReportCard key={r.id} report={r} onChanged={replace} />
        ))}
      </div>
    </div>
  );
}

export function MyReports() {
  const mine = useAsync(() => api.myReports(), []);
  return (
    <div className="stack-l">
      <h2>Mis reportes</h2>
      <ErrorBox message={mine.error} />
      {mine.loading && <Loading />}
      {mine.data?.length === 0 && <p className="muted">Aún no has hecho reportes.</p>}
      <div className="stack-m">
        {mine.data?.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  );
}
