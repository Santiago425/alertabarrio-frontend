import { useState } from "react";
import { api } from "../api/client";
import type { IncidentTypeAdmin, IncidentTypeInput } from "../api/types";
import Icon from "../components/Icon";
import { Card, ErrorBox, Loading } from "../components/ui";
import { groupByCategory, CATEGORY_ORDER } from "../components/TypeOptions";
import { duration } from "../lib/format";
import { useAsync } from "../lib/useAsync";

/** Opciones rapidas de duracion (en minutos). */
const DURATIONS = [
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "4 horas", value: 240 },
  { label: "6 horas", value: 360 },
  { label: "12 horas", value: 720 },
  { label: "1 día", value: 1440 },
  { label: "3 días", value: 4320 },
  { label: "1 semana", value: 10080 },
  { label: "No vence", value: 0 },
];

const EMPTY: IncidentTypeInput = { name: "", severity_level: 3, color: "#0ea5e9", duration_minutes: 60, is_active: true, category: "Seguridad" };

/**
 * Panel del administrador: CONFIGURACION DE ALERTAS.
 * Aqui se crean tipos nuevos, se cambian nombres, gravedad, color y cuanto dura
 * cada alerta en el mapa, sin tener que entrar a la base de datos.
 */
export default function AlertConfig() {
  const types = useAsync(() => api.adminTypes(), []);
  const categories = useAsync(() => api.adminCategories().catch(() => CATEGORY_ORDER), []);
  const [form, setForm] = useState<IncidentTypeInput>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      setMsg(await fn());
      types.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const edit = (t: IncidentTypeAdmin) => {
    setEditing(t.id);
    setForm({
      name: t.name,
      severity_level: t.severity_level,
      color: t.color,
      duration_minutes: t.duration_minutes ?? 0,
      is_active: t.is_active ?? true,
      category: t.category ?? "Otros",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = () =>
    run(async () => {
      if (editing) {
        const t = await api.updateType(editing, { ...form, category: form.category.trim() });
        cancel();
        return `Se guardó "${t.name}". Las alertas de este tipo ahora duran ${duration(t.duration_minutes)} en el mapa.`;
      }
      const t = await api.createType({ ...form, category: form.category.trim() });
      cancel();
      return `Se creó el tipo "${t.name}". Ya aparece para reportar y dura ${duration(t.duration_minutes)} en el mapa.`;
    });

  const toggle = (t: IncidentTypeAdmin) =>
    run(async () => {
      const r = await api.updateType(t.id, { is_active: !t.is_active });
      return r.is_active ? `"${r.name}" está activo otra vez.` : `"${r.name}" quedó desactivado: ya no aparece para reportar.`;
    });

  const remove = (t: IncidentTypeAdmin) =>
    run(async () => {
      const r = await api.deleteType(t.id);
      return r.deleted ? `Se eliminó "${t.name}".` : `"${t.name}" ${r.message.charAt(0).toLowerCase()}${r.message.slice(1)}`;
    });

  const options = DURATIONS.some((d) => d.value === form.duration_minutes)
    ? DURATIONS
    : [...DURATIONS, { label: duration(form.duration_minutes), value: form.duration_minutes }];

  return (
    <div className="stack-l">
      <section className="card info-card">
        <Icon name="sliders" size={22} />
        <div>
          <b>¿Cómo funciona?</b>
          <p className="muted">
            Cada tipo de alerta tiene una <b>duración</b>. Cuando un administrador publica un reporte, se ve en el mapa durante ese tiempo
            (por ejemplo, un accidente 1 hora). Al vencer sale del mapa solo, pero <b>no se borra</b>: queda guardado en el historial y cuenta
            en las <b>Estadísticas</b>. Si cambias la duración, aplica de una a las alertas que ya están publicadas.
          </p>
        </div>
      </section>

      {msg && <div className="alert-ok">{msg}</div>}
      <ErrorBox message={error} />

      <Card title={editing ? "Editar tipo de alerta" : "Nuevo tipo de alerta"}>
        <div className="config-form">
          <label>
            Nombre
            <input
              value={form.name}
              maxLength={80}
              placeholder="Ej: Accidente de moto"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Categoría
            <input
              list="categorias"
              value={form.category}
              maxLength={40}
              placeholder="Ej: Tránsito"
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id="categorias">
              {(categories.data ?? CATEGORY_ORDER).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label>
            Duración en el mapa
            <select value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}>
              {options.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gravedad (1 a 5)
            <select value={form.severity_level} onChange={(e) => setForm({ ...form, severity_level: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 5 ? "· muy grave" : n === 1 ? "· leve" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Color en el mapa
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </label>
          <label className="check-label">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Activo (aparece para reportar)
          </label>
        </div>
        <div className="row gap-s wrap" style={{ marginTop: 14 }}>
          <button className="btn" disabled={busy || form.name.trim().length < 3 || form.category.trim().length < 2} onClick={save}>
            <Icon name={editing ? "check" : "plus"} size={16} /> {editing ? "Guardar cambios" : "Crear tipo"}
          </button>
          {editing && (
            <button className="btn ghost" onClick={cancel}>
              Cancelar
            </button>
          )}
        </div>
      </Card>

      <Card title={<>Tipos de alerta ({types.data?.length ?? 0})</>}>
        {types.loading && !types.data && <Loading />}
        <ErrorBox message={types.error} />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Duración</th>
                <th>Gravedad</th>
                <th>En el mapa ahora</th>
                <th>Reportes guardados</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            {groupByCategory(types.data ?? []).map(([cat, list]) => (
            <tbody key={cat}>
              <tr className="cat-row">
                <td colSpan={7}>
                  {cat} <small className="muted">· {list.length} tipos</small>
                </td>
              </tr>
              {list.map((t) => (
                <tr key={t.id} className={t.is_active ? "" : "row-off"}>
                  <td>
                    <span className="dot" style={{ background: t.color }} /> <b>{t.name}</b>
                  </td>
                  <td>{duration(t.duration_minutes)}</td>
                  <td>{t.severity_level}/5</td>
                  <td>{t.active_now}</td>
                  <td>{t.reports_total}</td>
                  <td>
                    <span className={`badge ${t.is_active ? "status-verified" : "status-rejected"}`}>{t.is_active ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td>
                    <div className="row gap-s right">
                      <button className="btn small ghost" onClick={() => edit(t)}>
                        Editar
                      </button>
                      <button className="btn small ghost" disabled={busy} onClick={() => toggle(t)}>
                        {t.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button className="btn small ghost" disabled={busy} onClick={() => remove(t)} title="Si ya tiene reportes, solo se desactiva">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            ))}
          </table>
        </div>
        <p className="muted small-text">
          Un tipo que ya tiene reportes o que es del catálogo base no se borra (se perderían datos para las estadísticas): se desactiva y deja de
          aparecer para reportar. Para lo que no esté en la lista, el vecino puede elegir "Otro".
        </p>
      </Card>
    </div>
  );
}
