import type { ReactNode } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardStats, RankingRow, Report } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import BaseMap from "../components/BaseMap";
import { Card, StatusBadge } from "../components/ui";
import { CITY_NAME, greeting, longDate, timeAgo } from "../lib/format";
import { useAsync } from "../lib/useAsync";

const TEAM = (import.meta.env.VITE_TEAM_MEMBERS ?? "Integrante 1,Integrante 2").split(",").map((s: string) => s.trim());

const STRUCTURES = [
  ["Cola de prioridad (heap)", "Los reportes nuevos se moderan por gravedad: un robo armado antes que una sospecha."],
  ["Pila", "Historial de estados de cada reporte. Permite deshacer una publicación errónea."],
  ["Lista enlazada", "Feed de alertas activas por barrio y lista de vecinos suscritos."],
  ["Cola (FIFO)", "Notificaciones pendientes que se despachan en orden de llegada."],
  ["Tabla hash", "Acceso O(1) al feed, suscriptores y pila de cada barrio o reporte."],
  ["Árbol AVL", "Historial de reportes por fecha para consultas por rango."],
  ["Grafo + Dijkstra", "Barrios conectados para sugerir la ruta más segura."],
  ["Merge / Quick sort, búsqueda binaria", "Feed general, ranking de barrios y búsqueda en el catálogo."],
];

export default function Home() {
  const { user } = useAuth();
  const hello = useAsync(() => api.hello(), []);
  const stats = useAsync(() => api.stats(), []);
  const ai = useAsync(() => api.aiStatus(), []);
  const ranking = useAsync(() => api.ranking(), []);
  const feed = useAsync(() => api.feed(), []);
  const summaryHood = user?.neighborhood?.id ?? 1;
  const summary = useAsync(() => api.dailySummary(summaryHood), [summaryHood]);

  const aiUp = ai.data?.available === true;
  const s = stats.data;

  return (
    <div className="stack-l">
      <section className="dash-hero">
        <div>
          <p className="eyebrow">
            {longDate()} · {CITY_NAME}, Nariño
          </p>
          <h1>
            {greeting()}
            {user ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p>
            Así está la seguridad en los barrios de {CITY_NAME} hoy: alertas verificadas por los vecinos, priorizadas por
            gravedad y analizadas por la inteligencia artificial.
          </p>
          <div className="services">
            <Service label="Backend" up={hello.data ? true : hello.error ? false : undefined} />
            <Service label="Base de datos" up={s ? true : stats.error ? false : undefined} />
            <Service label={aiUp ? `IA · ${String(ai.data?.classifier ?? "")}` : "IA"} up={ai.data ? aiUp : ai.error ? false : undefined} />
          </div>
        </div>
        <div className="row gap-s wrap">
          <Link className="btn" to={user ? "/reportar" : "/registro"}>
            {user ? "＋ Reportar incidente" : "Crear cuenta"}
          </Link>
          <Link className="btn ghost" to="/mapa">
            Ver mapa en vivo
          </Link>
        </div>
      </section>

      {hello.error && (
        <div className="alert-error">
          No hay conexión con el backend ({hello.error}). Si está en el plan gratis de Render puede tardar un minuto en
          despertar; recarga la página en un momento.
        </div>
      )}

      <Kpis stats={s} ranking={ranking.data} />

      <div className="dash-grid">
        <Card title="Reportes de los últimos 14 días" actions={<small className="muted">por fecha del incidente</small>}>
          {s ? <Bars data={s.timeline} /> : <Skeleton lines={5} />}
        </Card>
        <Card title="Por tipo de incidente" actions={<small className="muted">14 días</small>}>
          {s ? <Donut data={s.by_type} /> : <Skeleton lines={5} />}
        </Card>
      </div>

      <div className="dash-grid">
        <Card title="Alertas en el mapa" actions={<Link to="/mapa" className="btn small ghost">Abrir mapa</Link>}>
          <BaseMap height={340} zoom={13}>
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
                  {r.incident_type.name} · {r.neighborhood.name}
                </Popup>
              </CircleMarker>
            ))}
          </BaseMap>
        </Card>
        <Card title="Últimas alertas" actions={<Link to="/feed" className="btn small ghost">Ver todas</Link>}>
          {feed.data ? <AlertList reports={latest(feed.data)} /> : <Skeleton lines={6} />}
        </Card>
      </div>

      <div className="dash-grid even">
        <section className="card ai-card">
          <header className="card-head">
            <h3>Resumen del día · {summary.data?.neighborhood.name ?? "…"}</h3>
            <span className="pill-ai">🤖 IA</span>
          </header>
          {summary.loading ? (
            <Skeleton lines={4} />
          ) : summary.data ? (
            <>
              <p className="summary">{summary.data.summary_text}</p>
              <small className="muted">Modelo: {summary.data.model}</small>
            </>
          ) : (
            <p className="muted">El resumen no está disponible ahora.</p>
          )}
          <div className="row gap-s wrap" style={{ marginTop: 12 }}>
            <Link to="/ia" className="btn small dark">
              Mapa de calor e insights
            </Link>
            {!aiUp && ai.data && (
              <small className="muted">El componente de IA no responde: el resumen sale con la plantilla de respaldo.</small>
            )}
          </div>
        </section>
        <Card title="Barrios con más alertas activas" actions={<small className="muted">quick sort</small>}>
          {ranking.data ? <RankingBars rows={ranking.data} /> : <Skeleton lines={6} />}
        </Card>
      </div>

      <section>
        <div className="section-title">
          <h2>Sobre el proyecto</h2>
          <Link to="/estructuras">Ver estructuras en vivo →</Link>
        </div>
        <div className="dash-grid">
          <div className="grid-cards">
            {STRUCTURES.map(([t, d]) => (
              <div className="card mini" key={t}>
                <h4>{t}</h4>
                <p className="muted">{d}</p>
              </div>
            ))}
          </div>
          <div className="stack-m">
            <div className="card team">
              <h3>Integrantes</h3>
              <ul>
                {TEAM.map((m: string) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <small className="muted">{hello.data?.message ?? "Conectando con el backend…"}</small>
            </div>
            <div className="card mini">
              <h4>Ciclo completo</h4>
              <div className="flow">
                {["Vecino", "Frontend", "Backend", "Base de datos", "IA", "Backend", "Vecinos"].map((step, i) => (
                  <span key={i} className="flow-step">
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- piezas

function Service({ label, up }: { label: string; up?: boolean }) {
  return (
    <span className={`service ${up === true ? "up" : up === false ? "down" : ""}`}>
      <i /> {label} {up === undefined ? "· conectando" : up ? "· en línea" : "· sin conexión"}
    </span>
  );
}

function Kpi({ label, value, foot, icon, tint, text }: { label: string; value: ReactNode; foot?: ReactNode; icon: string; tint: string; text?: boolean }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" style={{ background: `${tint}18`, color: tint }}>
          {icon}
        </span>
      </div>
      <div className={`kpi-value ${text ? "text" : ""}`}>{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

function Kpis({ stats, ranking }: { stats: DashboardStats | null; ranking: RankingRow[] | null }) {
  const change = stats && stats.last_week ? Math.round(((stats.this_week - stats.last_week) / stats.last_week) * 100) : null;
  const top = ranking?.[0];
  return (
    <div className="kpis">
      <Kpi
        label="Alertas activas"
        icon="🚨"
        tint="#e11d48"
        value={stats?.active_alerts ?? "—"}
        foot={stats ? `${stats.by_status.verified} verificadas por vecinos` : " "}
      />
      <Kpi
        label="Por moderar"
        icon="🛡️"
        tint="#d97706"
        value={stats?.pending_moderation ?? "—"}
        foot="en la cola de prioridad (heap)"
      />
      <Kpi
        label="Reportes esta semana"
        icon="📈"
        tint="#4f46e5"
        value={stats?.this_week ?? "—"}
        foot={
          change === null ? (
            "últimos 7 días"
          ) : (
            <>
              <span className={change > 0 ? "trend-up" : "trend-down"}>
                {change > 0 ? "▲" : "▼"} {Math.abs(change)}%
              </span>{" "}
              vs. semana anterior
            </>
          )
        }
      />
      <Kpi
        label="Barrio más afectado"
        icon="📍"
        tint="#0f172a"
        text
        value={top?.neighborhood ?? "—"}
        foot={top ? `${top.active_alerts} alertas · gravedad ${top.active_severity}` : " "}
      />
    </div>
  );
}

function Bars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bars">
      {data.map((d, i) => {
        const day = new Date(`${d.date}T12:00:00`);
        return (
          <div className="bar" key={d.date} title={`${d.count} reportes`}>
            <b>{d.count || ""}</b>
            <span className={i === data.length - 1 ? "today" : ""} style={{ height: `${(d.count / max) * 100}%` }} />
            <small>{day.toLocaleDateString("es-CO", { weekday: "narrow" })}</small>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ data }: { data: DashboardStats["by_type"] }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  if (!total) return <p className="muted">Sin reportes en estos días.</p>;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width={150} height={150} role="img" aria-label="Reportes por tipo">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eef1f6" strokeWidth="18" />
        {data.map((d) => {
          const len = (d.count / total) * c;
          const el = (
            <circle
              key={d.code}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0b1220">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#64748b">
          reportes
        </text>
      </svg>
      <ul className="donut-legend">
        {data.slice(0, 6).map((d) => (
          <li key={d.code}>
            <i style={{ background: d.color }} /> {d.name} <b>{d.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankingBars({ rows }: { rows: RankingRow[] }) {
  const list = rows.filter((r) => r.active_alerts > 0).slice(0, 7);
  if (!list.length) return <p className="muted">No hay alertas activas. 🎉</p>;
  const max = Math.max(...list.map((r) => r.active_severity), 1);
  return (
    <div className="hbars">
      {list.map((r) => (
        <div className="hbar" key={r.neighborhood_id} title={`Gravedad acumulada ${r.active_severity}`}>
          <span className="name">{r.neighborhood}</span>
          <div className="track">
            <span style={{ width: `${(r.active_severity / max) * 100}%` }} />
          </div>
          <b>{r.active_alerts}</b>
        </div>
      ))}
    </div>
  );
}

function latest(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 6);
}

function AlertList({ reports }: { reports: Report[] }) {
  if (!reports.length) return <p className="muted">No hay alertas activas. 🎉</p>;
  return (
    <ul className="alert-list">
      {reports.map((r) => (
        <li key={r.id}>
          <span className="sev" style={{ background: `${r.incident_type.color}1a`, color: r.incident_type.color }}>
            {r.incident_type.severity_level}
          </span>
          <div className="body">
            <b>{r.title}</b>
            <small>
              {r.incident_type.name} · {r.neighborhood.name} · {timeAgo(r.occurred_at)}
            </small>
          </div>
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
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
