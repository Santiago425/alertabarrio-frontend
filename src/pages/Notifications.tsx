import { api } from "../api/client";
import { Card, ErrorBox } from "../components/ui";
import { timeAgo } from "../lib/format";
import { useAsync } from "../lib/useAsync";

export default function Notifications() {
  const notes = useAsync(() => api.notifications(), []);
  const subs = useAsync(() => api.mySubscriptions(), []);
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const subscribed = new Set(subs.data?.map((s) => s.neighborhood.id));

  const toggle = async (id: number) => {
    if (subscribed.has(id)) await api.unsubscribe(id);
    else await api.subscribe(id);
    subs.reload();
  };

  const read = async (id: number) => {
    await api.markRead(id);
    notes.reload();
  };

  return (
    <div className="two-col">
      <Card title={<>Notificaciones</>}>
        <ErrorBox message={notes.error} />
        {notes.data?.length === 0 && <p className="muted">No tienes notificaciones.</p>}
        <ul className="notes">
          {notes.data?.map((n) => (
            <li key={n.id} className={n.is_read ? "read" : ""}>
              <span>{n.message}</span>
              <small className="muted">{timeAgo(n.created_at)}</small>
              {!n.is_read && (
                <button className="btn small ghost" onClick={() => read(n.id)}>
                  Marcar leída
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Barrios que sigo">
        <div className="chips">
          {neighborhoods.data?.map((n) => (
            <button key={n.id} className={`chip ${subscribed.has(n.id) ? "on" : ""}`} onClick={() => toggle(n.id)}>
              {subscribed.has(n.id) ? "✓ " : "+ "}
              {n.name}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
