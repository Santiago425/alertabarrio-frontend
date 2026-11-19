import { api } from "../api/client";
import type { ReportStatus } from "../api/types";
import { Card, HeapTree } from "../components/ui";
import { STATUS_LABEL } from "../lib/format";
import { useState } from "react";
import Icon, { type IconName } from "../components/Icon";
import { ASSISTANT_NAME } from "../config";
import { useAsync } from "../lib/useAsync";

type Doc = { title: string; icon: IconName; use: string; how: string; ds: string; cost: string };

const MODULES: { title: string; who: string; docs: Doc[] }[] = [
  {
    title: "Para el vecino",
    who: "Lo que usa cualquier usuario",
    docs: [
      {
        title: "Reportar hablando",
        icon: "mic",
        use: `El vecino le cuenta a ${ASSISTANT_NAME} qué pasó, por voz o texto, y el reporte se arma solo.`,
        how: "El navegador pasa la voz a texto, la IA (Gemini) saca el tipo, título y descripción, y el backend ubica el barrio más cercano al GPS (distancia haversine).",
        ds: "IA + haversine",
        cost: "O(n) barrios",
      },
      {
        title: "Alertas por barrio",
        icon: "alert",
        use: "Cada barrio tiene su lista de alertas activas, de la más nueva a la más vieja.",
        how: "Tabla hash barrio → lista enlazada. Encontrar el barrio y agregar al inicio de la lista es inmediato.",
        ds: "HashTable + LinkedList",
        cost: "O(1)",
      },
      {
        title: "Notificaciones",
        icon: "bell",
        use: "Cuando se publica una alerta, se avisa a los vecinos suscritos al barrio en orden de llegada.",
        how: "Cola FIFO sobre un buffer circular: se encola al final y se despacha desde el frente.",
        ds: "Queue (FIFO)",
        cost: "O(1)",
      },
      {
        title: "Ruta segura",
        icon: "route",
        use: `"Necesito ir al centro": ${ASSISTANT_NAME} entiende el destino y sale desde tu ubicación evitando barrios con alertas.`,
        how: "Grafo de barrios: Dijkstra con castigo por alertas activas (segura), Dijkstra normal (más corta) y BFS (menos barrios).",
        ds: "Graph · Dijkstra · BFS",
        cost: "O((V + E) log V)",
      },
      {
        title: "Mis rutas",
        icon: "clock",
        use: "Cada ruta que consultas se guarda (ej. de la U a tu casa) para abrirla otra vez con un clic y ponerle nombre.",
        how: "Tabla saved_routes por usuario: si la ruta ya existe solo sube su contador de usos.",
        ds: "Tabla saved_routes",
        cost: "O(1) por consulta",
      },
    ],
  },
  {
    title: "Para el administrador",
    who: "Solo lo ve quien entra como administrador",
    docs: [
      {
        title: "Moderación por prioridad",
        icon: "shield",
        use: "Todo reporte queda pendiente hasta que el admin lo publica o lo rechaza; los más graves se revisan primero.",
        how: "Max-heap: cada reporte entra con su prioridad (gravedad + riesgo de la IA + foto) y pop() siempre saca el más urgente.",
        ds: "PriorityQueue (max-heap)",
        cost: "O(log n)",
      },
      {
        title: "Historial y deshacer",
        icon: "layers",
        use: "Cada reporte guarda sus cambios de estado y el admin puede deshacer el último (publicar, rechazar o retirar).",
        how: "Una pila por reporte: push al cambiar de estado y pop al deshacer.",
        ds: "Stack (LIFO)",
        cost: "O(1)",
      },
      {
        title: "Configuración de alertas",
        icon: "sliders",
        use: "Crear tipos nuevos (ej. Accidente de moto), cambiarles el nombre, la gravedad, el color y cuánto duran en el mapa, sin tocar la base de datos.",
        how: "CRUD sobre la tabla incident_types. Un tipo con reportes no se borra: se desactiva para no perder datos.",
        ds: "Tabla incident_types",
        cost: "O(1) por cambio",
      },
      {
        title: "Vencimiento de alertas",
        icon: "clock",
        use: "Cada alerta dura lo que diga su tipo (un accidente 1 hora). Al vencer sale del mapa sola, pero queda guardada.",
        how: "vence = publicada + duración del tipo. El feed solo muestra las que no han vencido; cambiar la duración aplica de una.",
        ds: "HashTable tipo → minutos",
        cost: "O(1) por alerta",
      },
    ],
  },
  {
    title: "Datos y estadísticas",
    who: "Todo lo guardado, también lo que ya venció",
    docs: [
      {
        title: "Historial por fechas",
        icon: "list",
        use: "Consultar los reportes entre dos fechas.",
        how: "Árbol AVL ordenado por fecha: se mantiene balanceado, así la búsqueda por rango es rápida.",
        ds: "AVL (BST balanceado)",
        cost: "O(log n + k)",
      },
      {
        title: "Estadísticas",
        icon: "chart",
        use: "Cuántos incidentes hubo por mes, barrio, comuna, hora y día. Ej: cuántos accidentes hubo en el Centro cada mes.",
        how: "Se cuentan todos los reportes aprobados (también los vencidos) con conteos por clave.",
        ds: "Conteo con tablas hash",
        cost: "O(n)",
      },
      {
        title: "Búsqueda y ranking de barrios",
        icon: "map",
        use: "Encontrar un barrio por nombre y ver los que tienen más alertas activas.",
        how: "Búsqueda binaria sobre el catálogo ordenado con merge sort, y quick sort para el ranking.",
        ds: "Binary search · Quick sort",
        cost: "O(log n) · O(n log n)",
      },
    ],
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
      <section className="card docs-hero">
        <span className="docs-hero-icon">
          <Icon name="book" size={24} />
        </span>
        <div>
          <h2>¿Para qué sirve esta página?</h2>
          <p>
            Es el manual técnico de AlertaBarrio para el administrador. Explica <b>qué hace cada parte</b> de la app, <b>qué estructura de datos</b>{" "}
            usa por dentro y <b>qué tan rápido</b> es (complejidad). Abajo puedes ver el estado
            real de cada estructura en este momento.
          </p>
        </div>
      </section>

      {MODULES.map((m) => (
        <section key={m.title} className="stack-m">
          <header className="docs-module">
            <h2 className="section-title">{m.title}</h2>
            <span className="muted">{m.who}</span>
          </header>
          <div className="docs-grid">
            {m.docs.map((g) => (
              <article key={g.title} className="card doc-card">
                <div className="doc-head">
                  <span className="doc-icon">
                    <Icon name={g.icon} size={18} />
                  </span>
                  <h3>{g.title}</h3>
                </div>
                <p>{g.use}</p>
                <p className="muted">{g.how}</p>
                <div className="doc-tags">
                  <span className="doc-tag ds" title="Estructura de datos">{g.ds}</span>
                  <span className="doc-tag cost" title="Complejidad">{g.cost}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

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
