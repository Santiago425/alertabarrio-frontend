import { api } from "../api/client";
import { Card, HeapTree } from "../components/ui";
import { useAsync } from "../lib/useAsync";

/* Pagina para la sustentacion: muestra el estado interno de cada estructura
   tal como esta en la memoria del backend (GET /api/v1/ds/state). */

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function Tree({ node }: { node: Json | null }) {
  if (!node) return null;
  return (
    <div className="bst-node">
      <span>
        {new Date(node.key).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} ({node.count})
      </span>
      {(node.left || node.right) && (
        <div className="bst-children">
          <Tree node={node.left} />
          <Tree node={node.right} />
        </div>
      )}
    </div>
  );
}

export default function Structures() {
  const state = useAsync(() => api.dsState() as Promise<Json>, []);
  const s = state.data;

  return (
    <div className="stack-l">
      <div className="row space">
        <h2>Estructuras de datos en vivo</h2>
        <button className="btn ghost" onClick={state.reload}>Actualizar</button>
      </div>
      {!s ? (
        <p className="muted">{state.error ?? "Cargando…"}</p>
      ) : (
        <>
          <div className="two-col">
            <Card title={`Cola de prioridad · max-heap (${s.priority_queue.size})`}>
              <HeapTree heap={s.priority_queue.heap_array} />
              <p className="muted">pop() saca: {s.priority_queue.pop_order.map((r: Json) => `#${r.id}`).join(" → ") || "—"}</p>
            </Card>
            <Card title={`Cola FIFO de notificaciones (${s.notification_queue.size})`}>
              <p>
                Buffer circular de capacidad {s.notification_queue.capacity}, frente en el índice {s.notification_queue.front_index}.
              </p>
              <p className="muted">Notificaciones despachadas desde que arrancó el servidor: {s.notifications_dispatched}</p>
              <div className="queue-strip">
                {s.notification_queue.front_to_rear.length
                  ? s.notification_queue.front_to_rear.map((n: Json, i: number) => <span key={i}>u{n.user_id}</span>)
                  : <span className="muted">vacía</span>}
              </div>
            </Card>
          </div>

          <Card title={`Pilas de estados (${s.status_stacks.reports_with_history} reportes)`}>
            <div className="stacks-row">
              {Object.entries(s.status_stacks.examples_top_to_bottom as Record<string, string[]>).map(([id, items]) => (
                <div key={id} className="mini-stack">
                  <b>#{id}</b>
                  {items.map((st, i) => (
                    <span key={i} className={i === 0 ? "top" : ""}>{st}</span>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <div className="two-col">
            <Card title="Feeds por barrio · HashTable → LinkedList">
              <p className="muted">
                {s.zone_feeds.table.buckets} buckets, factor de carga {s.zone_feeds.table.load_factor}
              </p>
              {Object.entries(s.zone_feeds.feeds as Record<string, Json[]>).map(([hood, items]) => (
                <div key={hood} className="ll-row">
                  <b>{hood}</b>
                  <span className="ll">
                    head{items.slice(0, 5).map((r) => <span key={r.id}> → #{r.id}</span>)}
                    {items.length > 5 ? " → …" : ""} → null
                  </span>
                </div>
              ))}
            </Card>
            <Card title={`Árbol AVL por fecha (${s.timeline_bst.size} reportes, altura ${s.timeline_bst.height})`}>
              <p className="muted">Primeros 4 niveles. Un BST sin balancear tendría altura {s.timeline_bst.size}.</p>
              <div className="bst">
                <Tree node={s.timeline_bst.tree} />
              </div>
            </Card>
          </div>

          <div className="two-col">
            <Card title={`Grafo de barrios (${s.city_graph.vertices} vértices, ${s.city_graph.edges} aristas)`}>
              <p className="muted">Conexo (DFS): {s.city_graph.connected ? "sí" : "no"}</p>
              <ul className="adj">
                {Object.entries(s.city_graph.adjacency as Record<string, Json[]>).map(([v, edges]) => (
                  <li key={v}>
                    <b>{v}</b>: {edges.map((e) => `${e.to} (${(e.meters / 1000).toFixed(1)} km)`).join(", ")}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Suscriptores por barrio · LinkedList">
              <ul className="adj">
                {Object.entries(s.subscribers as Record<string, number[]>).map(([hood, users]) => (
                  <li key={hood}>
                    <b>{hood}</b>: {users.map((u) => `u${u}`).join(" → ")}
                  </li>
                ))}
              </ul>
              <p className="muted">
                Catálogo ordenado para búsqueda binaria: {s.neighborhood_catalog.items.join(", ")}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
