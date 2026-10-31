import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ReportCreated, ReportDraft } from "../api/types";
import { useAsync } from "../lib/useAsync";
import Icon from "./Icon";
import { ErrorBox, TypeBadge } from "./ui";

const SOURCE: Record<string, string> = { gps: "según tu ubicación", texto: "según lo que dijiste", perfil: "tu barrio registrado" };

/** Reporte que armo Vigia: el vecino solo revisa y lo publica (puede corregir o agregar foto). */
export default function DraftCard({ draft, onCancel }: { draft: ReportDraft; onCancel?: () => void }) {
  const types = useAsync(() => api.incidentTypes(), []);
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const [form, setForm] = useState({
    title: draft.title,
    description: draft.description,
    incident_type_id: draft.incident_type?.id ?? 0,
    neighborhood_id: draft.neighborhood?.id ?? 0,
    photo_url: "",
  });
  const [editing, setEditing] = useState(!draft.neighborhood);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ReportCreated | null>(null);

  const type = types.data?.find((t) => t.id === form.incident_type_id) ?? draft.incident_type;
  const hood = neighborhoods.data?.find((n) => n.id === form.neighborhood_id) ?? draft.neighborhood;

  const publish = async () => {
    if (!form.neighborhood_id || !hood) return setError("Elige el barrio");
    setBusy(true);
    setError(null);
    try {
      // si el vecino cambio de barrio, el punto pasa al centro de ese barrio
      const sameHood = hood.id === draft.neighborhood?.id && draft.latitude !== null;
      setDone(
        await api.createReport({
          title: form.title,
          description: form.description,
          incident_type_id: form.incident_type_id,
          neighborhood_id: hood.id,
          latitude: sameHood ? draft.latitude : hood.latitude,
          longitude: sameHood ? draft.longitude : hood.longitude,
          photo_url: form.photo_url || null,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="draft done">
        <Icon name="check" size={20} />
        <div>
          <b>Reporte #{done.report.id} enviado</b>
          <small>
            Está en moderación (posición {done.queue_position} de {done.queue_size}). Avisaremos a los vecinos de {done.report.neighborhood.name}.{" "}
            <Link to="/mis-reportes">Ver mis reportes</Link>
          </small>
        </div>
      </div>
    );

  return (
    <div className="draft">
      <div className="draft-head">
        {type && <TypeBadge type={type} />}
        <span className="draft-where">
          <Icon name="pin" size={14} /> {hood ? hood.name : "¿Dónde fue?"}
          {hood && draft.location_source && <small> · {SOURCE[draft.location_source]}</small>}
        </span>
      </div>

      {editing ? (
        <div className="form">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={4} maxLength={150} aria-label="Título" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} aria-label="Descripción" />
          <div className="row gap-s wrap">
            <select value={form.incident_type_id} onChange={(e) => setForm({ ...form, incident_type_id: Number(e.target.value) })} aria-label="Tipo de incidente">
              {types.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select value={form.neighborhood_id} onChange={(e) => setForm({ ...form, neighborhood_id: Number(e.target.value) })} aria-label="Barrio">
              <option value={0}>Barrio…</option>
              {neighborhoods.data?.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <b className="draft-title">{form.title}</b>
          <p className="draft-text">{form.description}</p>
          {draft.place && <small className="muted">Lugar: {draft.place}</small>}
        </>
      )}

      <input
        className="draft-photo"
        value={form.photo_url}
        onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
        placeholder="Foto (opcional): pega un enlace https://…"
      />
      <ErrorBox message={error} />
      <div className="row gap-s wrap">
        <button className="btn" onClick={publish} disabled={busy || form.title.trim().length < 4 || form.description.trim().length < 10}>
          <Icon name="send" size={15} /> {busy ? "Enviando…" : "Publicar reporte"}
        </button>
        {!editing && (
          <button className="btn ghost" onClick={() => setEditing(true)}>
            Corregir
          </button>
        )}
        {onCancel && (
          <button className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
