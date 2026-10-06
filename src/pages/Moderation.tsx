import { useState } from "react";
import { api } from "../api/client";
import type { StatusEntry } from "../api/types";
import ReportCard from "../components/ReportCard";
import { Card, DSTag, ErrorBox, HeapTree, Loading, StackView } from "../components/ui";
import { STATUS_LABEL } from "../lib/format";
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
      return `Pop del heap → #${r.id} "${r.title}" (prioridad ${r.priority_score}) pasó a revisión.`;
    });
  const publish = (id: number) =>
    run(async () => {
      const r = await api.publish(id);
      return `Publicado #${id}. Se encolaron ${r.notifications_queued} notificaciones para los vecinos suscritos.`;
    });
  const reject = (id: number) =>
    run(async () => {
      await api.reject(id, "No cumple las normas o no es verificable");
      return `Rechazado #${id}.`;
    });
  const undo = (id: number) =>
    run(async () => {
      const r = await api.undo(id);
      setLastStack({ id, stack: r.stack });
      return `Deshacer (pop de la pila) #${id}: se quitó "${STATUS_LABEL[r.undone_status]}", ahora está "${STATUS_LABEL[r.current_status]}".`;
    });

  return (
    <div className="stack-l">
      <h2>Panel de moderación</h2>
      {msg && <div className="alert-ok">{msg}</div>}
      <ErrorBox message={error} />

      <div className="two-col">
        <Card
          title={<>Cola de prioridad ({queue.data?.size ?? 0}) <DSTag>max-heap</DSTag></>}
          actions={
            <button className="btn" onClick={takeNext} disabled={!queue.data?.size}>
              Tomar el siguiente más grave
            </button>
          }
        >
          {queue.loading && <Loading />}
          {queue.data && <HeapTree heap={queue.data.heap_array} />}
          <p className="muted">Orden en que van a salir:</p>
          <ol className="queue-list">
            {queue.data?.reports.map((r) => (
              <li key={r.id}>
                <span className="dot" style={{ background: r.incident_type.color }} />
                <b>{r.priority_score}</b> · #{r.id} {r.title} <small className="muted">({r.neighborhood.name})</small>
                <span className="row gap-s right">
                  <button className="btn small" onClick={() => publish(r.id)}>Publicar</button>
                  <button className="btn small ghost" onClick={() => reject(r.id)}>Rechazar</button>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title={<>Pila del último deshacer <DSTag>Stack</DSTag></>}>
          {lastStack ? (
            <>
              <p className="muted">Reporte #{lastStack.id}</p>
              <StackView entries={lastStack.stack} />
            </>
          ) : (
            <p className="muted">Cuando deshagas una acción, aquí verás cómo quedó la pila de estados del reporte.</p>
          )}
        </Card>
      </div>

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

      <h3>Publicadas recientemente</h3>
      <div className="stack-m">
        {published.data?.slice(0, 10).map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            actions={
              <button className="btn small warn" onClick={() => undo(r.id)}>
                ↶ Deshacer publicación
              </button>
            }
          />
        ))}
      </div>
    </div>
  );
}
