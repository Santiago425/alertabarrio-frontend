import { useState, type FormEvent } from "react";
import { CircleMarker, useMapEvents } from "react-leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ReportCreated } from "../api/types";
import { ShieldArt } from "../components/Art";
import BaseMap, { FlyTo } from "../components/BaseMap";
import Icon from "../components/Icon";
import { Card, ErrorBox, TypeBadge } from "../components/ui";
import { pct } from "../lib/format";
import { currentPosition } from "../lib/geo";
import { useAsync } from "../lib/useAsync";

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Formulario clasico para reportar (alternativa a contarselo a Vigia). */
export default function NewReport() {
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const types = useAsync(() => api.incidentTypes(), []);
  const [form, setForm] = useState({ title: "", description: "", incident_type_id: "", neighborhood_id: "", photo_url: "" });
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [target, setTarget] = useState<[number, number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportCreated | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // elegir el barrio mueve el punto al barrio, para que mapa y barrio siempre coincidan
    if (k === "neighborhood_id") {
      const n = neighborhoods.data?.find((x) => x.id === Number(e.target.value));
      if (n) {
        setPoint([n.latitude, n.longitude]);
        setTarget([n.latitude, n.longitude, 15]);
      }
    }
  };

  // marcar un punto en el mapa elige solo el barrio al que pertenece
  const placeAt = async (lat: number, lng: number) => {
    setPoint([lat, lng]);
    try {
      const n = await api.nearestNeighborhood(lat, lng);
      setForm((f) => ({ ...f, neighborhood_id: String(n.id) }));
    } catch {
      /* si falla, el vecino elige el barrio a mano */
    }
  };

  const useMyLocation = async () => {
    const pos = await currentPosition();
    if (!pos) return setError("No pudimos obtener tu ubicación. Revisa el permiso de ubicación.");
    setTarget([pos[0], pos[1], 16]);
    placeAt(pos[0], pos[1]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!point) return setError("Marca en el mapa dónde ocurrió");
    setBusy(true);
    setError(null);
    try {
      const res = await api.createReport({
        title: form.title,
        description: form.description,
        incident_type_id: Number(form.incident_type_id),
        neighborhood_id: Number(form.neighborhood_id),
        latitude: point[0],
        longitude: point[1],
        photo_url: form.photo_url || null,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const { report, ai } = result;
    return (
      <div className="stack-l narrow">
        <div className="success-head">
          <ShieldArt size={96} />
          <h2>Reporte enviado</h2>
        </div>
        <Card title="Lo que hizo el sistema con tu reporte">
          <ol className="steps">
            <li>Se guardó en la base de datos con estado <b>Creado</b> (reporte #{report.id}).</li>
            <li>
              {ai.available ? (
                <>
                  La IA (<code>{ai.model}</code>) lo clasificó como <TypeBadge type={ai.suggested_type ?? report.incident_type} /> con
                  confianza {pct(ai.confidence)}
                  {ai.matches_user_choice === false && " (distinto a lo que elegiste, el moderador lo revisará)"}. Riesgo de la zona a
                  esa hora: <b>{pct(ai.zone_risk)}</b>.
                </>
              ) : (
                "El componente de IA no respondió; el reporte se guardó igual."
              )}
            </li>
            <li>
              Entró a la <b>cola de prioridad</b> de moderación con prioridad <b>{report.priority_score}</b>: está en la posición{" "}
              <b>{result.queue_position}</b> de {result.queue_size}.
            </li>
            <li>Cuando un moderador lo publique, se notificará a los vecinos suscritos al barrio.</li>
          </ol>
        </Card>
        <div className="row gap-s">
          <button className="btn" onClick={() => { setResult(null); setForm({ title: "", description: "", incident_type_id: "", neighborhood_id: "", photo_url: "" }); setPoint(null); }}>
            Hacer otro reporte
          </button>
          <Link className="btn ghost" to="/mis-reportes">Ver mis reportes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="two-col">
      <form onSubmit={submit} className="form card">
        <label>
          ¿Qué pasó? (título corto)
          <input value={form.title} onChange={set("title")} required minLength={4} maxLength={150} placeholder="Ej: Atraco en la esquina de la panadería" />
        </label>
        <label>
          Descripción
          <textarea value={form.description} onChange={set("description")} required minLength={10} rows={4} placeholder="Cuéntanos qué viste: cuántas personas, si había armas, hacia dónde huyeron…" />
        </label>
        <label>
          Tipo de incidente
          <select value={form.incident_type_id} onChange={set("incident_type_id")} required>
            <option value="">— Elegir —</option>
            {types.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (gravedad {t.severity_level})
              </option>
            ))}
          </select>
        </label>
        <label>
          Barrio <small className="muted">(sale solo del punto en el mapa)</small>
          <select value={form.neighborhood_id} onChange={set("neighborhood_id")} required>
            <option value="">— Elegir —</option>
            {neighborhoods.data?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Foto (URL, opcional)
          <input value={form.photo_url} onChange={set("photo_url")} placeholder="https://…" />
        </label>
        <ErrorBox message={error} />
        <button className="btn" disabled={busy}>
          {busy ? "Enviando y analizando con IA…" : "Enviar reporte"}
        </button>
      </form>
      <div className="stack-s">
        <div className="row space">
          <p className="muted">Toca el mapa donde ocurrió.</p>
          <button type="button" className="btn small ghost" onClick={useMyLocation}>
            <Icon name="pin" size={14} /> Usar mi ubicación
          </button>
        </div>
        <BaseMap height={520}>
          <ClickToPlace onPick={placeAt} />
          <FlyTo target={target} />
          {point && <CircleMarker center={point} radius={10} pathOptions={{ color: "#dc2626", fillOpacity: 0.7 }} />}
        </BaseMap>
      </div>
    </div>
  );
}
