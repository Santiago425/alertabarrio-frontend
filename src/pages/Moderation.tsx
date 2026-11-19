import { useState } from "react";
import { api } from "../api/client";
import type { StatusEntry } from "../api/types";
import Icon from "../components/Icon";
import ReportCard from "../components/ReportCard";
import { Card, ErrorBox, HeapTree, Loading, StackView } from "../components/ui";
import { STATUS_LABEL, timeAgo } from "../lib/format";

const URGENCY = [
  { key: "alta", label: "Alta", hint: "80 pts o más", min: 80 },
  { key: "media", label: "Media", hint: "55 a 79 pts", min: 55 },
  { key: "baja", label: "Baja", hint: "menos de 55 pts", min: -Infinity },
];
const urgencyOf = (score: number) => URGENCY.find((u) => score >= u.min)!;
import { useAsync } from "../lib/useAsync";

export default function Moderation() {
  const queue = useAsync(() => api.queue(), []);
  const review = useAsync(() => api.inReview(), []);
  const published = useAsync(() => api.feed(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastStack, setLastStack] = useState<{ id: number; stack: StatusEntry[] } | null>(null);

  const refresh = () => {
    queue.reload();
    review.reload();
    published.reload();
  };

  const run = async (fn: () => Promise<string>) => {
    setError(null);
    try {
      setMsg(await fn());
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const takeNext = () =>
    run(async () => {
      const r = await api.takeNext();
      return `Abriste el reporte más urgente: #${r.id} "${r.title}" (puntaje ${Math.round(r.priority_score)}). Ahora está abajo, en "En revisión".`;
    });
  const publish = (id: number) =>
    run(async () => {
      const r = await api.publish(id);
      return `Publicado #${id}. Se enviaron ${r.notifications_queued} avisos a los vecinos suscritos.`;
    });
  const reject = (id: number) =>
    run(async () => {
      await api.reject(id, "No cumple las normas o no es verificable");
      return `Rechazado #${id}.`;
    });
  const withdraw = (id: number) =>
    run(async () => {
      await api.withdraw(id, "Retirada por el administrador: falsa o ya resuelta");
      return `Retirada #${id}: ya no sale en el mapa. Queda guardada en el historial como rechazada (se puede deshacer).`;
    });
  const undo = (id: number) =>
    run(async () => {
      const r = await api.undo(id);
      setLastStack({ id, stack: r.stack });
      return `Se deshizo el último cambio del reporte #${id}: estaba "${STATUS_LABEL[r.undone_status]}" y volvió a "${STATUS_LABEL[r.current_status]}".`;
    });

  return (
    <div className="stack-l">
      <section className="card mod-help">
        <header className="row gap-s">
          <Icon name="shield" size={22} />
          <h3>¿Qué es la moderación?</h3>
        </header>
        <p className="muted">
          Es el filtro antes de que una alerta llegue a todos. Así evitamos alertas falsas, repetidas u ofensivas.
        </p>
        <ol className="mod-steps">
          <li>
            <b>El vecino reporta.</b> El reporte queda <b>pendiente</b>: todavía nadie más lo ve.
          </li>
          <li>
            <b>El administrador lo revisa</b> (sale primero el más grave) y decide: <b>Publicar</b> (sale en el mapa y se avisa a los vecinos
            suscritos) o <b>Rechazar</b> (no se publica).
          </li>
          <li>
            <b>La alerta vence sola</b> según su tipo (ver Configuración de alertas). Si era falsa, el administrador la puede <b>Retirar</b> antes.
          </li>
          <li>
            Cualquier decisión se puede <b>Deshacer</b>. Nada se borra de la base de datos: todo queda para el historial y las estadísticas.
          </li>
        </ol>
        <p className="mod-note">
          <Icon name="lock" size={14} />
          <span>
            El usuario normal <b>no puede borrar ni editar alertas</b>, solo reportar y confirmar las de otros ("Yo también lo vi"). Solo el
            administrador publica, rechaza o retira.
          </span>
        </p>
      </section>

      {msg && <div className="alert-ok">{msg}</div>}
      <ErrorBox message={error} />

      <Card
        title={<>Pendientes por revisar ({queue.data?.size ?? 0})</>}
        actions={
          <button className="btn" onClick={takeNext} disabled={!queue.data?.size}>
            Abrir el más urgente
          </button>
        }
      >
        <div className="urg-help">
          <p>
            Cada reporte nuevo espera aquí hasta que lo revises. Están <b>ordenados del más urgente al menos urgente</b>, así atiendes primero lo
            más peligroso. El botón <b>Abrir el más urgente</b> pasa el primero de la lista a "En revisión".
          </p>
          <div className="urg-legend">
            {URGENCY.map((u) => (
              <span key={u.key} className={`urg-chip ${u.key}`}>
                <i /> {u.label}: {u.hint}
              </span>
            ))}
          </div>
          <p className="muted small-text">
            El puntaje sale de: gravedad del tipo de incidente (1 a 5) × 20 + qué tan peligrosa es la zona a esa hora según la IA (hasta 20) + 5
            si trae foto. Máximo cerca de 125.
          </p>
        </div>

        {queue.loading && <Loading />}
        {queue.data?.size === 0 && <p className="muted">No hay reportes pendientes. ¡Todo al día!</p>}
        <ol className="pend-list">
          {queue.data?.reports.map((r, i) => {
            const u = urgencyOf(r.priority_score);
            return (
              <li key={r.id} className={`pend-card ${u.key}`}>
                <div className="pend-rank" title="Turno de atención">
                  <small>Turno</small>
                  <b>{i + 1}</b>
                </div>
                <div className="pend-body">
                  <div className="pend-top">
                    <span className="pend-type" style={{ color: r.incident_type.color, background: `${r.incident_type.color}18` }}>
                      <span className="dot" style={{ background: r.incident_type.color }} />
                      {r.incident_type.name}
                    </span>
                    <span className={`urg-chip ${u.key}`}>
                      <i /> Urgencia {u.label.toLowerCase()}
                    </span>
                  </div>
                  <h4 className="pend-title">{r.title}</h4>
                  <p className="pend-meta">
                    <Icon name="pin" size={13} /> {r.neighborhood.name} · <Icon name="clock" size={13} /> llegó {timeAgo(r.created_at)}
                    {r.photos?.length ? " · con foto" : ""} · #{r.id}
                  </p>
                  <div className="urg-bar" title={`Puntaje ${Math.round(r.priority_score)} de 125`}>
                    <span style={{ width: `${Math.min(100, (r.priority_score / 125) * 100)}%` }} />
                    <em>{Math.round(r.priority_score)} pts</em>
                  </div>
                </div>
                <div className="pend-actions">
                  <button className="btn small" onClick={() => publish(r.id)}>Publicar</button>
                  <button className="btn small ghost" onClick={() => reject(r.id)}>Rechazar</button>
                </div>
              </li>
            );
          })}
        </ol>

        {queue.data && queue.data.size > 0 && (
          <details className="inner-how">
            <summary>Ver el orden de atención como árbol</summary>
            <p className="muted">
              Así guarda el sistema los pendientes por dentro: cada círculo es un reporte con su puntaje, y <b>el más urgente siempre queda
              arriba</b>. Cuando sale uno, el siguiente más urgente sube solo. Por eso encontrar el más grave es instantáneo, aunque haya miles.
            </p>
            <HeapTree heap={queue.data.heap_array} />
          </details>
        )}
      </Card>

        <Card title={<>Deshacer</>}>
          <p className="muted">
            Si te equivocas al publicar, rechazar o retirar, usa <b>↶ Deshacer</b> en el reporte: vuelve al estado anterior. Aquí verás
            cómo quedó su historial.
          </p>
          {lastStack ? (
            <>
              <p className="muted">Reporte #{lastStack.id}</p>
              <StackView entries={lastStack.stack} />
            </>
          ) : (
            <p className="muted">Todavía no has deshecho nada.</p>
          )}
        </Card>

      <h3>En revisión</h3>
      {review.data?.length === 0 && <p className="muted">Nada en revisión.</p>}
      <div className="stack-m">
        {review.data?.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            actions={
              <>
                <button className="btn small" onClick={() => publish(r.id)}>Publicar</button>
                <button className="btn small ghost" onClick={() => reject(r.id)}>Rechazar</button>
                <button className="btn small warn" onClick={() => undo(r.id)}>↶ Deshacer</button>
              </>
            }
          />
        ))}
      </div>

      <h3>En el mapa ahora</h3>
      <p className="muted">Alertas publicadas que todavía no vencen. Si una es falsa o ya se resolvió, retírala del mapa.</p>
      <div className="stack-m">
        {published.data?.slice(0, 10).map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            actions={
              <>
                <button className="btn small ghost" onClick={() => withdraw(r.id)}>
                  <Icon name="trash" size={14} /> Retirar del mapa
                </button>
                <button className="btn small warn" onClick={() => undo(r.id)}>
                  ↶ Deshacer publicación
                </button>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
