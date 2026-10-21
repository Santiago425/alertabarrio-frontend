import { CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardStats, Heatmap, RankingRow, Report } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import BaseMap from "../components/BaseMap";
import Icon, { type IconName } from "../components/Icon";
import { CITY_NAME, DAYS, greeting, longDate, timeAgo } from "../lib/format";
import { useAsync } from "../lib/useAsync";

export default function Home() {
  const { user } = useAuth();
  const stats = useAsync(() => api.stats(), []);
  const ranking = useAsync(() => api.ranking(), []);
  const feed = useAsync(() => api.feed(), []);
  const heat = useAsync(() => api.heatmap(), []);
  const ai = useAsync(() => api.aiStatus(), []);
  const hood = user?.neighborhood?.id ?? 1;
  const summary = useAsync(() => api.dailySummary(hood), [hood]);
  const s = stats.data;
  const change = s && s.last_week ? Math.round(((s.this_week - s.last_week) / s.last_week) * 100) : null;

  return (
    <div className="dash">
      <div className="dash-welcome">
        <div>
          <h2>
            {greeting()}
            {user ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
          </h2>
          <p className="muted">
            {longDate()} · {CITY_NAME}
          </p>
        </div>
        <span className={`live ${ai.data?.available ? "on" : ""}`}>
          <i /> {ai.data?.available ? "IA en línea" : ai.data ? "IA sin conexión" : "Conectando…"}
        </span>
      </div>

      {stats.error && <div className="alert-error">No hay conexión con el servidor. Si estaba dormido tarda un minuto; recarga en un momento.</div>}

      <div className="dash-top">
        <div className="tiles">
          <Tile tone="hot" icon="alert" title="Alertas activas" value={s?.active_alerts} sub={s ? `${s.by_status.verified} verificadas` : ""} to="/feed" />
          <Tile icon="shield" title="Por moderar" value={s?.pending_moderation} sub="en la cola" to="/moderacion" tint="#f59e0b" />
          <Tile
            icon="chart"
            title="Esta semana"
            value={s?.this_week}
            sub={change === null ? "reportes" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. anterior`}
            tint="#6366f1"
            to="/ia"
          />
        </div>
        <section className="panel stat-panel">
          <div className="panel-head">
            <h3>Estado de reportes</h3>
            <span className="tag">Total {s?.total_reports ?? "—"}</span>
          </div>
          {s ? <StatusRing stats={s} /> : <Skeleton lines={4} />}
        </section>
      </div>

      <section>
        <div className="panel-head">
          <h3>Alertas recientes</h3>
          <Link to="/feed" className="tag link">Ver todas</Link>
        </div>
        {feed.data ? <RecentCards reports={latest(feed.data)} /> : <Skeleton lines={3} />}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Horario de riesgo</h3>
            <span className="tag">Predicción IA</span>
          </div>
          {heat.data ? <RiskSchedule heat={heat.data} /> : <Skeleton lines={5} />}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>Barrios con más alertas</h3>
          </div>
          {ranking.data ? <TopHoods rows={ranking.data} /> : <Skeleton lines={4} />}
        </section>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Mapa</h3>
            <Link to="/mapa" className="tag link">Abrir</Link>
          </div>
          <BaseMap height={300} zoom={13}>
            {feed.data?.slice(0, 40).map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.latitude, r.longitude]}
                radius={4 + r.incident_type.severity_level * 1.6}
                pathOptions={{ color: "#fff", weight: 1.5, fillColor: r.incident_type.color, fillOpacity: 0.9 }}
              >
                <Popup>
                  <b>{r.title}</b>
                  <br />
                  {r.neighborhood.name}
                </Popup>
              </CircleMarker>
            ))}
          </BaseMap>
        </section>
        <section className="panel ai-panel">
          <div className="panel-head">
            <h3>
              <Icon name="sparkles" size={16} /> Resumen de hoy
            </h3>
            <span className="tag">{summary.data?.neighborhood.name ?? "…"}</span>
          </div>
          {summary.loading ? <Skeleton lines={4} /> : <p className="summary">{summary.data?.summary_text ?? "No disponible ahora."}</p>}
          {s && <MiniBars data={s.timeline} />}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- piezas

function Tile({
  icon,
  title,
  value,
  sub,
  tone,
  tint = "#e11d48",
  to,
}: {
  icon: IconName;
  title: string;
  value?: number;
  sub: string;
  tone?: "hot";
  tint?: string;
  to: string;
}) {
  return (
    <Link to={to} className={`tile ${tone ?? ""}`}>
      <span className="tile-icon" style={tone ? undefined : { background: `${tint}17`, color: tint }}>
        <Icon name={icon} size={22} />
      </span>
      <span className="tile-text">
        <b>{value ?? "—"}</b>
        <span>{title}</span>
        <small>{sub}</small>
      </span>
    </Link>
  );
}

function StatusRing({ stats }: { stats: DashboardStats }) {
  const rings = [
    { label: "Verificados", value: stats.by_status.verified, color: "#e11d48" },
    { label: "Publicados", value: stats.by_status.published, color: "#3b82f6" },
    { label: "En moderación", value: stats.by_status.created + stats.by_status.in_review, color: "#a855f7" },
  ];
  const total = Math.max(1, stats.total_reports);
  return (
    <div className="ring-wrap">
      <div className="ring-legend">
        {rings.map((r) => (
          <div key={r.label}>
            <b>
              {r.value}/{stats.total_reports}
            </b>
            <span style={{ borderColor: r.color }}>{r.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 120 120" width={150} height={150} role="img" aria-label="Estado de los reportes">
        {rings.map((r, i) => {
          const radius = 50 - i * 12;
          const c = 2 * Math.PI * radius;
          const len = (r.value / total) * c;
          return (
            <g key={r.label}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef1f6" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${len} ${c}`}
                transform="rotate(-90 60 60)"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function latest(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 3);
}

function RecentCards({ reports }: { reports: Report[] }) {
  if (!reports.length) return <p className="muted">No hay alertas activas 🎉</p>;
  return (
    <div className="recent">
      {reports.map((r) => {
        const confirmations = r.confirmations ?? (r.status === "verified" ? 2 : 0);
        const progress = Math.min(100, (confirmations / 2) * 100);
        return (
          <Link to="/feed" key={r.id} className="recent-card">
            <div className="recent-top">
              <span className="recent-icon" style={{ background: `${r.incident_type.color}1c`, color: r.incident_type.color }}>
                <Icon name="alert" size={20} />
              </span>
              <div>
                <b>{r.title}</b>
                <small>
                  <Icon name="pin" size={12} /> {r.neighborhood.name} · {timeAgo(r.occurred_at)}
                </small>
              </div>
            </div>
            <div className="progress">
              <span style={{ width: `${progress}%`, background: r.incident_type.color }} />
            </div>
            <div className="recent-foot">
              <span>{confirmations >= 2 ? "Verificada" : `${confirmations}/2 confirmaciones`}</span>
              <span className="tag" style={{ color: r.incident_type.color }}>
                {r.incident_type.name}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const BLOCK_COLORS = ["#a855f7", "#3b82f6", "#f59e0b", "#e11d48"];
const BLOCK_LABELS = ["Madrugada", "Mañana", "Tarde", "Noche"];

function RiskSchedule({ heat }: { heat: Heatmap }) {
  // Un renglon por barrio (los 4 mas riesgosos) y una barra por cada franja horaria caliente
  const hoods = heat.neighborhood_risk.slice(0, 4);
  if (!hoods.length) return <p className="muted">Aún no hay suficiente historial.</p>;
  return (
    <div className="schedule">
      {hoods.map((h) => {
        const spots = heat.hotspots.filter((x) => x.neighborhood_id === h.neighborhood_id).slice(0, 3);
        return (
          <div className="sched-row" key={h.neighborhood_id}>
            <span className="sched-name">{h.neighborhood_name}</span>
            <div className="sched-track">
              {spots.map((x, i) => (
                <span
                  key={i}
                  className="sched-bar"
                  title={`${DAYS[x.day_of_week]} · ${BLOCK_LABELS[x.hour_block]} · ${Math.round(x.risk_score * 100)}%`}
                  style={{
                    left: `${x.hour_block * 25 + 1}%`,
                    width: "23%",
                    top: `${i * 30}%`,
                    background: BLOCK_COLORS[x.hour_block],
                    opacity: 0.55 + x.risk_score * 0.45,
                  }}
                >
                  {DAYS[x.day_of_week].slice(0, 3)} · {Math.round(x.risk_score * 100)}%
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <div className="sched-axis">
        <span />
        <div>
          {["0:00", "6:00", "12:00", "18:00", "24:00"].map((t) => (
            <small key={t}>{t}</small>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopHoods({ rows }: { rows: RankingRow[] }) {
  const list = rows.filter((r) => r.active_alerts > 0).slice(0, 5);
  if (!list.length) return <p className="muted">No hay alertas activas 🎉</p>;
  return (
    <ol className="top-hoods">
      {list.map((r, i) => (
        <li key={r.neighborhood_id}>
          <span className="rank">{i + 1}</span>
          <span className="name">
            <b>{r.neighborhood}</b>
            <small>{r.subscribers} vecinos suscritos</small>
          </span>
          <span className="value">{r.active_alerts}</span>
        </li>
      ))}
    </ol>
  );
}

function MiniBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="minibars" title="Reportes por día (14 días)">
      {data.map((d, i) => (
        <span key={d.date} className={i === data.length - 1 ? "today" : ""} style={{ height: `${10 + (d.count / max) * 90}%` }} />
      ))}
    </div>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack-s">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 9}%` }} />
      ))}
    </div>
  );
}
