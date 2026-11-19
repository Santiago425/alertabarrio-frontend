import { useState } from "react";
import { api } from "../api/client";
import type { StatusEntry } from "../api/types";
import Icon from "../components/Icon";
import ReportCard from "../components/ReportCard";
import { Card, ErrorBox, HeapTree, Loading, StackView } from "../components/ui";
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
  const withdraw = (id: number) =>
    run(async () => {
      await api.withdraw(id, "Retirada por el administrador: falsa o ya resuelta");
      return `Retirada #${id}: ya no sale en el mapa. Queda guardada en el historial como rechazada (se puede deshacer).`;
    });
  const undo = (id: number) =>
    run(async () => {
      const r = await api.undo(id);
      setLastStack({ id, stack: r.stack });
      return `Deshacer (pop de la pila) #${id}: se quitó "${STATUS_LABEL[r.undone_status]}", ahora está "${STATUS_LABEL[r.current_status]}".`;
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

      <div className="two-col">
        <Card
          title={<>Pendientes por revisar ({queue.data?.size ?? 0})</>}
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

        <Card title={<>Último cambio (para deshacer)</>}>
          {lastStack ? (
            <>
              <p className="muted">Reporte #{lastStack.id}</p>
              <StackView entries={lastStack.stack} />
            </>
          ) : (
            <p className="muted">Sin acciones deshechas.</p>
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
