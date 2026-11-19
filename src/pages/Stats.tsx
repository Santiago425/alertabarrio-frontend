import { useState } from "react";
import { api } from "../api/client";
import type { ZoneStats } from "../api/types";
import TypeOptions from "../components/TypeOptions";
import HoodOptions from "../components/HoodOptions";
import HeatMap from "../components/HeatMap";
import { Card, ErrorBox, Loading } from "../components/ui";
import { CITY_NAME } from "../config";
import { DAYS } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { exportExcel, exportPdf, slug } from "../lib/exportReport";

/**
 * Estadisticas con TODOS los reportes guardados (tambien los que ya vencieron
 * y salieron del mapa): cuantos incidentes hubo por mes, por barrio, por
 * comuna, por hora y por dia. Ej: cuantos accidentes hubo en el Centro cada mes.
 */
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Los ultimos 12 meses como opciones: "2026-11" -> "Noviembre 2026". */
function lastMonths() {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const name = MONTH_NAMES[d.getMonth()];
    out.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${name[0].toUpperCase()}${name.slice(1)} ${d.getFullYear()}` });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export default function Stats() {
  // "6" = ultimos 6 meses; "2026-11" = solo noviembre de 2026
  const [period, setPeriod] = useState("6");
  const month = period.includes("-") ? period : undefined;
  const months = month ? 1 : Number(period);
  const [hood, setHood] = useState("");
  const [comuna, setComuna] = useState("");
  const [type, setType] = useState("");
  const hoods = useAsync(() => api.neighborhoods(), []);
  const types = useAsync(() => api.incidentTypes(), []);
  const stats = useAsync(
    () =>
      api.zoneStats({
        months: month ? undefined : months,
        month,
        neighborhood_id: hood ? Number(hood) : undefined,
        comuna: comuna ? Number(comuna) : undefined,
        incident_type_id: type ? Number(type) : undefined,
      }),
    [period, hood, comuna, type],
  );
  const s = stats.data;
  const comunas = [...new Set(hoods.data?.map((h) => h.comuna).filter((c): c is number => !!c))].sort((a, b) => a - b);
  const zone = hood ? hoods.data?.find((h) => String(h.id) === hood)?.name : comuna ? `la comuna ${comuna}` : CITY_NAME;
  const typeName = type ? types.data?.find((t) => String(t.id) === type)?.name : null;
  const monthLabel = month ? lastMonths().find((m) => m.value === month)?.label.toLowerCase() : null;
  const periodText = monthLabel ? `en ${monthLabel}` : `últimos ${s?.months ?? months} meses`;
  const reportTitle = `${typeName ?? "Incidentes"} en ${zone}, ${monthLabel ?? `últimos ${months} meses`}`;
  const [exporting, setExporting] = useState<"" | "xlsx" | "pdf">("");
  const [exportError, setExportError] = useState<string | null>(null);
  const doExport = async (kind: "xlsx" | "pdf") => {
    if (!s) return;
    setExporting(kind);
    setExportError(null);
    try {
      const info = { title: reportTitle, fileName: `alertabarrio-${slug(reportTitle)}` };
      await (kind === "xlsx" ? exportExcel(s, info) : exportPdf(s, info));
    } catch {
      setExportError("No se pudo generar el archivo. Intenta de nuevo.");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="stack-l">
      <div className="stats-filters card">
        <label>
          Periodo
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último año</option>
            <optgroup label="Un solo mes">
              {lastMonths().map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </optgroup>
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
            <TypeOptions types={types.data} />
          </select>
        </label>
        <div className="stats-export">
          <span className="muted small-text">
            Exportar <b>{reportTitle}</b>
          </span>
          <div className="row gap-s">
            <button className="btn small" disabled={!s?.records || !!exporting} onClick={() => doExport("xlsx")}>
              {exporting === "xlsx" ? "Generando…" : "Excel"}
            </button>
            <button className="btn small ghost" disabled={!s?.records || !!exporting} onClick={() => doExport("pdf")}>
              {exporting === "pdf" ? "Generando…" : "PDF"}
            </button>
          </div>
        </div>
      </div>

      <ErrorBox message={stats.error || exportError} />
      {stats.loading && !s && <Loading text="Calculando estadísticas…" />}
      {s && (
        <>
          <div className="stats-kpis">
            <Kpi value={s.total} label={`${typeName ?? "Incidentes"} en ${zone}`} hint={periodText} />
            <Kpi value={Math.round(s.total / Math.max(1, s.months))} label="Promedio por mes" hint="reportes aprobados" />
            <Kpi value={s.active_now} label="En el mapa ahora" hint="no han vencido" />
            <Kpi value={s.expired} label="Vencidas" hint="salieron del mapa, siguen guardadas" />
          </div>

          {s.points && (
            <Card title="Mapa de calor: zonas con más incidentes">
              {s.points.length ? (
                <>
                  <HeatMap points={s.points} />
                  {s.top_neighborhoods[0] && (
                    <p className="heat-hot">
                      Zona más caliente {periodText}: <b>{s.top_neighborhoods[0].name}</b>
                      {s.top_neighborhoods[0].comuna ? ` (comuna ${s.top_neighborhoods[0].comuna})` : ""} con{" "}
                      {s.top_neighborhoods[0].count} {s.top_neighborhoods[0].count === 1 ? "incidente" : "incidentes"}.
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">Sin incidentes para este filtro.</p>
              )}
            </Card>
          )}

          {!month && (
            <Card title="Incidentes por mes">
              <MonthBars stats={s} />
            </Card>
          )}

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
