import { api } from "../api/client";
import type { ReportStatus } from "../api/types";
import { Card, HeapTree } from "../components/ui";
import { STATUS_LABEL } from "../lib/format";
import { useState } from "react";
import Icon from "../components/Icon";
import { ASSISTANT_NAME } from "../config";
import { useAsync } from "../lib/useAsync";

const GUIDE: { title: string; use: string; how: string; file: string }[] = [
  {
    title: "Reportar hablando",
    use: `El vecino le cuenta a ${ASSISTANT_NAME} qué pasó, por voz o texto.`,
    how: "El navegador pasa la voz a texto, el componente de IA (Gemini) saca el tipo de incidente, título y descripción, y el backend busca el barrio más cercano a la ubicación del celular (distancia haversine).",
    file: "backend: routers/ai.py · services/geo.py — IA: providers/interpret.py",
  },
  {
    title: "Moderación por prioridad",
    use: "Los reportes más graves se revisan primero.",
    how: "Cola de prioridad con un max-heap: cada reporte entra con una prioridad (gravedad + riesgo de la IA + foto) y pop() siempre saca el más urgente en O(log n).",
    file: "backend: structures/priority_queue.py",
  },
  {
    title: "Notificaciones a los vecinos",
    use: "Cuando se publica un reporte, se avisa a los suscritos del barrio en el orden en que llegaron.",
    how: "Cola FIFO sobre un buffer circular: enqueue al final, dequeue al frente, ambas en O(1).",
    file: "backend: structures/queue.py",
  },
  {
    title: "Historial y deshacer",
    use: "Cada reporte guarda sus cambios de estado y el moderador puede deshacer el último.",
    how: "Una pila por reporte: push al cambiar de estado y pop al deshacer (LIFO).",
    file: "backend: structures/stack.py",
  },
  {
    title: "Alertas por barrio",
    use: "Cada barrio tiene su lista de alertas, de la más nueva a la más vieja.",
    how: "Tabla hash (barrio → lista enlazada). Buscar el barrio es O(1) y agregar al inicio de la lista también.",
    file: "backend: structures/hash_table.py · structures/linked_list.py",
  },
  {
    title: "Historial por fechas",
    use: "Consultar los reportes entre dos fechas.",
    how: "Árbol AVL ordenado por fecha: se mantiene balanceado, así la búsqueda por rango es O(log n + k).",
    file: "backend: structures/bst.py",
  },
  {
    title: "Ruta segura",
    use: `"Necesito ir al centro": ${ASSISTANT_NAME} entiende el destino y sale desde tu ubicación.`,
    how: "Grafo de barrios: Dijkstra con castigo por alertas activas para la ruta segura, Dijkstra normal para la más corta y BFS para la de menos barrios.",
    file: "backend: structures/graph.py · routers/routes.py",
  },
  {
    title: "Búsqueda y ranking de barrios",
    use: "Encontrar un barrio por nombre y ver los que tienen más alertas.",
    how: "Búsqueda binaria sobre el catálogo ordenado y quick sort para el ranking.",
    file: "backend: structures/sorting.py",
  },
];

/* Documentacion y ayuda: como funciona cada parte de AlertaBarrio por dentro.
   Abajo se puede ver el estado real de cada estructura (GET /api/v1/ds/state). */

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

export default function Docs() {
  const [live, setLive] = useState(false);
  const state = useAsync(() => (live ? (api.dsState() as Promise<Json>) : Promise.resolve(null)), [live]);
  const s = state.data;

  return (
    <div className="stack-l">
      <div className="docs-grid">
        {GUIDE.map((g) => (
          <article key={g.title} className="card doc-card">
            <h3>{g.title}</h3>
            <p>{g.use}</p>
            <p className="muted">{g.how}</p>
            <code>{g.file}</code>
          </article>
        ))}
      </div>

      <div className="toolbar left">
        <button className="btn ghost" onClick={() => (live ? state.reload() : setLive(true))}>
          <Icon name="layers" size={16} /> {live ? "Actualizar estado en vivo" : "Ver el estado en vivo de cada estructura"}
        </button>
      </div>
      {!live ? null : !s ? (
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
                    <span key={i} className={i === 0 ? "top" : ""}>{STATUS_LABEL[st as ReportStatus] ?? st}</span>
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
