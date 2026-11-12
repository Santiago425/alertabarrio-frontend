import "../components/address.css";
import HoodOptions from "../components/HoodOptions";
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
        {subs.data?.length === 0 && <p className="muted">Todavía no sigues ningún barrio.</p>}
        <div className="chips">
          {subs.data?.map((s) => (
            <button key={s.neighborhood.id} className="chip on" onClick={() => toggle(s.neighborhood.id)} title="Dejar de seguir">
              ✓ {s.neighborhood.name} ✕
            </button>
          ))}
        </div>
        <select className="hood-add" value="" onChange={(e) => e.target.value && toggle(Number(e.target.value))} aria-label="Seguir otro barrio">
          <option value="">+ Seguir otro barrio de Pasto…</option>
          <HoodOptions hoods={neighborhoods.data?.filter((n) => !subscribed.has(n.id))} />
        </select>
      </Card>
    </div>
  );
}
