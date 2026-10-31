import { useState } from "react";
import { Circle } from "react-leaflet";
import { api } from "../api/client";
import AssistantChat from "../components/Assistant";
import BaseMap from "../components/BaseMap";
import { Card, ErrorBox, Loading } from "../components/ui";
import { DAYS, HOUR_BLOCKS, heatRadius, pct } from "../lib/format";
import { useAiOnline } from "../lib/useAiOnline";
import { useAsync } from "../lib/useAsync";
import { ASSISTANT_NAME } from "../config";

export default function VigiaPage() {
  const ai = useAiOnline();
  const aiOnline = ai === "on";
  const heat = useAsync(() => api.heatmap(), [ai]);
  const ranking = useAsync(() => api.ranking(), []);
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const [hood, setHood] = useState<number>(1);
  const [refresh, setRefresh] = useState(0);
  const summary = useAsync(() => api.dailySummary(hood, refresh > 0), [hood, refresh, ai]);

  const radius = heatRadius(heat.data?.cells ?? []);

  const top = heat.data?.hotspots?.[0];
  const topHood = top?.neighborhood_id;
  const matrix = DAYS.map((_, d) =>
    HOUR_BLOCKS.map((_, b) => heat.data?.hotspots?.find((h) => h.neighborhood_id === topHood && h.day_of_week === d && h.hour_block === b)?.risk_score ?? 0),
  );

  return (
    <div className="stack-l">
      <AssistantChat />

      <div className="toolbar left">
        {ai !== "off" && (
          <span className={`live ${ai}`}>
            <i /> {aiOnline ? `${ASSISTANT_NAME} en línea` : `Activando ${ASSISTANT_NAME}…`}
          </span>
        )}
      </div>

      <Card title="Mapa de calor predictivo">
        <ErrorBox message={heat.error} />
        {heat.loading ? (
          <Loading text="La IA está analizando el histórico…" />
        ) : (
          <>
            <BaseMap height={420}>
              {heat.data?.cells?.map((c, i) => (
                <Circle
                  key={i}
                  center={[c.latitude, c.longitude]}
                  radius={radius}
                  pathOptions={{ stroke: false, fillColor: c.intensity > 0.6 ? "#dc2626" : c.intensity > 0.3 ? "#f97316" : "#facc15", fillOpacity: 0.05 + c.intensity * 0.3 }}
                />
              ))}
            </BaseMap>
            <ul>
              {heat.data?.available && heat.data.insights?.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="two-col">
        <Card title={`Riesgo por día y hora · ${top?.neighborhood_name ?? ""}`}>
          <table className="matrix">
            <thead>
              <tr>
                <th />
                {HOUR_BLOCKS.map((b) => (
                  <th key={b}>{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, d) => (
                <tr key={d}>
                  <th>{DAYS[d]}</th>
                  {row.map((v, b) => (
                    <td key={b} style={{ background: `rgba(220, 38, 38, ${v * 0.85})`, color: v > 0.5 ? "#fff" : undefined }}>
                      {v ? pct(v) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={<>Barrios con más alertas activas</>}>
          <table className="table">
            <thead>
              <tr>
                <th>Barrio</th>
                <th>Alertas</th>
                <th>Gravedad</th>
                <th>Riesgo IA</th>
              </tr>
            </thead>
            <tbody>
              {ranking.data?.map((r) => (
                <tr key={r.neighborhood_id}>
                  <td>{r.neighborhood}</td>
                  <td>{r.active_alerts}</td>
                  <td>{r.active_severity}</td>
                  <td>{pct(heat.data?.neighborhood_risk?.find((n) => n.neighborhood_id === r.neighborhood_id)?.risk_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        title="Resumen diario en lenguaje natural"
        actions={
          <>
            <select value={hood} onChange={(e) => setHood(Number(e.target.value))}>
              {neighborhoods.data?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <button className="btn small ghost" onClick={() => setRefresh((x) => x + 1)}>
              Regenerar
            </button>
          </>
        }
      >
        {summary.loading || (ai === "waking" && summary.data?.available === false) ? <Loading text="Generando…" /> : <p className="summary">{summary.data?.summary_text}</p>}
      </Card>
    </div>
  );
}
