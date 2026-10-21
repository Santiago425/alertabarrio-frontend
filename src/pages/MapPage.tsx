import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Circle, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Heatmap, Report } from "../api/types";
import BaseMap from "../components/BaseMap";
import Icon from "../components/Icon";
import { ErrorBox, StatusBadge } from "../components/ui";
import { CITY_CENTER, CITY_ZOOM, heatRadius, timeAgo } from "../lib/format";
import { useAsync } from "../lib/useAsync";

const RANGES = [
  { key: "24h", label: "Hoy", hours: 24 },
  { key: "7d", label: "7 días", hours: 24 * 7 },
  { key: "all", label: "Todo", hours: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

// Icono propio: punto de color con tamano segun gravedad y un pulso si la alerta es reciente
function markerIcon(r: Report, selected: boolean) {
  const size = 14 + r.incident_type.severity_level * 3 + (selected ? 6 : 0);
  const recent = hoursAgo(r.occurred_at) < 6;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<span class="pin${recent ? " recent" : ""}${selected ? " selected" : ""}" style="--c:${r.incident_type.color};width:${size}px;height:${size}px"></span>`,
  });
}

function FlyTo({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target[0], target[1]], target[2], { duration: 0.8 });
  }, [map, target]);
  return null;
}

export default function MapPage() {
  const reports = useAsync(() => api.mapReports(), []);
  const types = useAsync(() => api.incidentTypes(), []);
  const [heat, setHeat] = useState<Heatmap | null>(null);
  const [showHeat, setShowHeat] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [range, setRange] = useState<RangeKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [target, setTarget] = useState<[number, number, number] | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const markers = useRef<Record<number, L.Marker | null>>({});

  // Refresco automatico cada 30 s para ver alertas "en tiempo real"
  useEffect(() => {
    const t = setInterval(() => reports.reload(), 30000);
    return () => clearInterval(t);
  }, [reports.reload]);

  const visible = useMemo(() => {
    const hours = RANGES.find((r) => r.key === range)!.hours;
    const q = query.trim().toLowerCase();
    return (reports.data ?? [])
      .filter((r) => !hidden.has(r.incident_type.id))
      .filter((r) => hoursAgo(r.occurred_at) <= hours)
      .filter((r) => !q || `${r.title} ${r.neighborhood.name} ${r.incident_type.name}`.toLowerCase().includes(q))
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }, [reports.data, hidden, range, query]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const r of reports.data ?? []) c[r.incident_type.id] = (c[r.incident_type.id] ?? 0) + 1;
    return c;
  }, [reports.data]);

  const toggleType = (id: number) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  };

  const toggleHeat = async () => {
    if (!heat) setHeat(await api.heatmap());
    setShowHeat(!showHeat);
  };

  const focus = (r: Report) => {
    setSelected(r.id);
    setTarget([r.latitude, r.longitude, 17]);
    setTimeout(() => markers.current[r.id]?.openPopup(), 850);
  };

  const locate = () => {
    setLocError(null);
    if (!navigator.geolocation) return setLocError("Tu navegador no permite ubicación.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setMe(pos);
        setTarget([pos[0], pos[1], 16]);
      },
      () => setLocError("No pudimos obtener tu ubicación."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mapx">
      <ErrorBox message={reports.error} />

      <div className="mapx-filters">
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r.key} className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="chips">
          {types.data?.map((t) => (
            <button
              key={t.id}
              className={`chip ${hidden.has(t.id) ? "off" : ""}`}
              style={{ "--c": t.color } as CSSProperties}
              onClick={() => toggleType(t.id)}
            >
              <i /> {t.name} <small>{counts[t.id] ?? 0}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="mapx-body">
        <div className="mapx-map">
          <BaseMap height={620}>
            <FlyTo target={target} />
            {showHeat &&
              heat?.cells.map((c, i) => (
                <Circle
                  key={`h${i}`}
                  center={[c.latitude, c.longitude]}
                  radius={heatRadius(heat.cells)}
                  pathOptions={{ stroke: false, fillColor: c.intensity > 0.6 ? "#dc2626" : c.intensity > 0.3 ? "#f97316" : "#facc15", fillOpacity: 0.05 + c.intensity * 0.3 }}
                />
              ))}
            {me && (
              <Marker position={me} icon={L.divIcon({ className: "", iconSize: [18, 18], html: '<span class="me-dot"></span>' })}>
                <Popup>Estás aquí</Popup>
              </Marker>
            )}
            {visible.map((r) => (
              <Marker
                key={r.id}
                position={[r.latitude, r.longitude]}
                icon={markerIcon(r, selected === r.id)}
                ref={(m) => {
                  markers.current[r.id] = m;
                }}
                eventHandlers={{ click: () => setSelected(r.id) }}
              >
                <Popup>
                  <div className="pop">
                    <span className="pop-type" style={{ background: `${r.incident_type.color}1f`, color: r.incident_type.color }}>
                      {r.incident_type.name}
                    </span>
                    <b>{r.title}</b>
                    <small>
                      {r.neighborhood.name} · {timeAgo(r.occurred_at)}
                    </small>
                    <p>{r.description}</p>
                    <div className="pop-foot">
                      <StatusBadge status={r.status} />
                      <Link to="/feed">Ver en alertas</Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </BaseMap>

          <div className="map-tools">
            <button className={`map-tool ${showHeat ? "on" : ""}`} onClick={toggleHeat} title="Mapa de calor de la IA">
              <Icon name="sparkles" size={18} />
              <span>Zonas de riesgo</span>
            </button>
            <button className="map-tool" onClick={locate} title="Ir a mi ubicación">
              <Icon name="pin" size={18} />
              <span>Mi ubicación</span>
            </button>
            <button className="map-tool" onClick={() => setTarget([CITY_CENTER[0], CITY_CENTER[1], CITY_ZOOM])} title="Ver toda la ciudad">
              <Icon name="map" size={18} />
              <span>Toda la ciudad</span>
            </button>
          </div>
          <div className="map-count">
            <b>{visible.length}</b> alertas en el mapa
          </div>
          {locError && <div className="map-toast">{locError}</div>}
        </div>

        <aside className="mapx-list">
          <div className="field mapx-search">
            <Icon name="list" size={18} className="field-icon" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar barrio o incidente" aria-label="Buscar" />
          </div>
          <div className="mapx-items">
            {reports.loading && !reports.data && <p className="muted">Cargando alertas…</p>}
            {reports.data && !visible.length && <p className="muted">No hay alertas con estos filtros.</p>}
            {visible.map((r) => (
              <button key={r.id} className={`mapx-item ${selected === r.id ? "on" : ""}`} onClick={() => focus(r)}>
                <span className="dot" style={{ background: r.incident_type.color }} />
                <span className="mapx-text">
                  <b>{r.title}</b>
                  <small>
                    {r.incident_type.name} · {r.neighborhood.name}
                  </small>
                </span>
                <small className="mapx-time">{timeAgo(r.occurred_at)}</small>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {showHeat && heat && (
        <section className="panel">
          <div className="panel-head">
            <h3>
              <Icon name="sparkles" size={16} /> Lo que detectó la IA
            </h3>
          </div>
          <ul className="insights">
            {heat.insights.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
