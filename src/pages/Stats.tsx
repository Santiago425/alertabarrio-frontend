import { useState } from "react";
import { api } from "../api/client";
import type { ZoneStats } from "../api/types";
import HoodOptions from "../components/HoodOptions";
import { Card, ErrorBox, Loading } from "../components/ui";
import { CITY_NAME } from "../config";
import { DAYS } from "../lib/format";
import { useAsync } from "../lib/useAsync";

/**
 * Estadisticas con TODOS los reportes guardados (tambien los que ya vencieron
 * y salieron del mapa): cuantos incidentes hubo por mes, por barrio, por
 * comuna, por hora y por dia. Ej: cuantos accidentes hubo en el Centro cada mes.
 */
export default function Stats() {
  const [months, setMonths] = useState(6);
  const [hood, setHood] = useState("");
  const [comuna, setComuna] = useState("");
  const [type, setType] = useState("");
  const hoods = useAsync(() => api.neighborhoods(), []);
  const types = useAsync(() => api.incidentTypes(), []);
  const stats = useAsync(
    () =>
      api.zoneStats({
        months,
        neighborhood_id: hood ? Number(hood) : undefined,
        comuna: comuna ? Number(comuna) : undefined,
        incident_type_id: type ? Number(type) : undefined,
      }),
    [months, hood, comuna, type],
  );
  const s = stats.data;
  const comunas = [...new Set(hoods.data?.map((h) => h.comuna).filter((c): c is number => !!c))].sort((a, b) => a - b);
  const zone = hood ? hoods.data?.find((h) => String(h.id) === hood)?.name : comuna ? `la comuna ${comuna}` : CITY_NAME;
  const typeName = type ? types.data?.find((t) => String(t.id) === type)?.name : null;

  return (
    <div className="stack-l">
      <div className="stats-filters card">
        <label>
          Periodo
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último año</option>
          </select>
        </label>
        <label>
          Comuna
          <select value={comuna} onChange={(e) => { setComuna(e.target.value); setHood(""); }}>
            <option value="">Todas</option>
            {comunas.map((c) => (
              <option key={c} value={c}>
                Comuna {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Barrio
          <select value={hood} onChange={(e) => setHood(e.target.value)}>
            <option value="">Todos</option>
            <HoodOptions hoods={hoods.data?.filter((h) => !comuna || String(h.comuna) === comuna)} />
          </select>
        </label>
        <label>
          Tipo de alerta
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {types.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBox message={stats.error} />
      {stats.loading && !s && <Loading text="Calculando estadísticas…" />}
      {s && (
        <>
          <div className="stats-kpis">
            <Kpi value={s.total} label={`${typeName ?? "Incidentes"} en ${zone}`} hint={`últimos ${s.months} meses`} />
            <Kpi value={Math.round(s.total / Math.max(1, s.months))} label="Promedio por mes" hint="reportes aprobados" />
            <Kpi value={s.active_now} label="En el mapa ahora" hint="no han vencido" />
            <Kpi value={s.expired} label="Vencidas" hint="salieron del mapa, siguen guardadas" />
          </div>

          <Card title="Incidentes por mes">
            <MonthBars stats={s} />
          </Card>

          <div className="two-col">
            <Card title="Por tipo de alerta">
              <Donut stats={s} />
            </Card>
            <Card title={hood ? "Barrio seleccionado" : "Barrios con más incidentes"}>
              <HBars rows={s.top_neighborhoods.map((h) => ({ label: h.name, sub: h.comuna ? `Comuna ${h.comuna}` : "", value: h.count }))} />
            </Card>
          </div>

          <div className="two-col">
            <Card title="¿A qué hora pasan más?">
              <HourArea data={s.by_hour} />
            </Card>
            <Card title="Por día de la semana">
              <HBars rows={s.by_weekday.map((v, i) => ({ label: DAYS[i], sub: "", value: v }))} keepOrder />
            </Card>
          </div>

          {!hood && s.by_comuna.length > 1 && (
            <Card title="Por comuna">
              <ComunaBars data={s.by_comuna} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ value, label, hint }: { value: number; label: string; hint: string }) {
  return (
    <div className="card kpi">
      <b>{value.toLocaleString("es-CO")}</b>
      <span>{label}</span>
      <small className="muted">{hint}</small>
    </div>
  );
}

/** Barras apiladas por mes: cada color es un tipo de alerta. */
function MonthBars({ stats }: { stats: ZoneStats }) {
  const max = Math.max(1, ...stats.by_month.map((m) => m.total));
  const W = 640;
  const H = 230;
  const pad = { l: 34, b: 28, t: 16 };
  const bw = (W - pad.l) / stats.by_month.length;
  const y = (v: number) => ((H - pad.b - pad.t) * v) / max;
  const ticks = [0, Math.round(max / 2), max];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Incidentes por mes">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W} y1={H - pad.b - y(t)} y2={H - pad.b - y(t)} className="grid-line" />
            <text x={pad.l - 6} y={H - pad.b - y(t) + 4} textAnchor="end" className="axis">
              {t}
            </text>
          </g>
        ))}
        {stats.by_month.map((m, i) => {
          let acc = 0;
          const x = pad.l + i * bw + bw * 0.18;
          return (
            <g key={m.month}>
              {stats.by_type.map((t) => {
                const v = m.by_type[t.code] ?? 0;
                if (!v) return null;
                const h = y(v);
                acc += h;
                return (
                  <rect key={t.code} x={x} width={bw * 0.64} y={H - pad.b - acc} height={h} fill={t.color} rx={2}>
                    <title>
                      {m.label}: {v} {t.name}
                    </title>
                  </rect>
                );
              })}
              <text x={x + bw * 0.32} y={H - pad.b - acc - 5} textAnchor="middle" className="bar-value">
                {m.total || ""}
              </text>
              <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" className="axis">
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend items={stats.by_type.map((t) => ({ color: t.color, label: t.name }))} />
    </>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <span className="dot" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Dona: porcentaje de cada tipo. */
function Donut({ stats }: { stats: ZoneStats }) {
  const total = Math.max(1, stats.by_type.reduce((a, t) => a + t.count, 0));
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  if (!stats.by_type.length) return <p className="muted">Sin datos para este filtro.</p>;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width={170} height={170} role="img" aria-label="Incidentes por tipo">
        <circle cx={70} cy={70} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={20} />
        {stats.by_type.map((t) => {
          const len = (t.count / total) * C;
          const el = (
            <circle
              key={t.code}
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke={t.color}
              strokeWidth={20}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            >
              <title>
                {t.name}: {t.count}
              </title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={70} y={68} textAnchor="middle" className="donut-total">
          {total}
        </text>
        <text x={70} y={86} textAnchor="middle" className="axis">
          incidentes
        </text>
      </svg>
      <ul className="donut-list">
        {stats.by_type.map((t) => (
          <li key={t.code}>
            <span className="dot" style={{ background: t.color }} />
            <span>{t.name}</span>
            <b>{Math.round((t.count / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontales (barrios o dias). */
function HBars({ rows, keepOrder = false }: { rows: { label: string; sub: string; value: number }[]; keepOrder?: boolean }) {
  const list = keepOrder ? rows : [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...list.map((r) => r.value));
  if (!list.length) return <p className="muted">Sin datos para este filtro.</p>;
  return (
    <div className="hbars">
      {list.map((r) => (
        <div key={r.label} className="hbar">
          <span className="hbar-label">
            {r.label}
            {r.sub && <small className="muted"> · {r.sub}</small>}
          </span>
          <span className="hbar-track">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Curva de incidentes por hora del dia (0 a 23). */
function HourArea({ data }: { data: number[] }) {
  const W = 480;
  const H = 180;
  const pad = 22;
  const max = Math.max(1, ...data);
  const x = (i: number) => pad + (i * (W - pad * 2)) / 23;
  const y = (v: number) => H - pad - ((H - pad * 2) * v) / max;
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const peak = data.indexOf(Math.max(...data));
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Incidentes por hora">
        <path d={`${line} L${x(23)},${H - pad} L${x(0)},${H - pad} Z`} className="area-fill" />
        <path d={line} className="area-line" />
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 4} textAnchor="middle" className="axis">
            {h}h
          </text>
        ))}
        <circle cx={x(peak)} cy={y(data[peak])} r={4} className="area-peak" />
      </svg>
      <p className="muted small-text">
        Hora con más incidentes: <b>{peak}:00 a {peak + 1}:00</b>
      </p>
    </>
  );
}

function ComunaBars({ data }: { data: { comuna: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="vbars">
      {data.map((d) => (
        <div key={d.comuna} className="vbar" title={`Comuna ${d.comuna}: ${d.count}`}>
          <b>{d.count}</b>
          <span style={{ height: `${8 + (d.count / max) * 92}%` }} />
          <small>C{d.comuna}</small>
        </div>
      ))}
    </div>
  );
}
