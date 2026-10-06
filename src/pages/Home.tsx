import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../lib/useAsync";

const TEAM = (import.meta.env.VITE_TEAM_MEMBERS ?? "Integrante 1,Integrante 2").split(",").map((s: string) => s.trim());

const STRUCTURES = [
  ["Cola de prioridad (heap)", "Los reportes nuevos se moderan por gravedad: un robo armado antes que una sospecha."],
  ["Pila", "Historial de estados de cada reporte. Permite deshacer una publicación errónea."],
  ["Lista enlazada", "Feed de alertas activas por barrio y lista de vecinos suscritos."],
  ["Cola (FIFO)", "Notificaciones pendientes que se despachan en orden de llegada."],
  ["Tabla hash", "Acceso O(1) al feed, suscriptores y pila de cada barrio o reporte."],
  ["Árbol AVL", "Historial de reportes por fecha para consultas por rango."],
  ["Grafo + Dijkstra", "Barrios conectados para sugerir la ruta más segura."],
  ["Merge / Quick sort, búsqueda binaria", "Feed general, ranking de barrios y búsqueda en el catálogo."],
];

export default function Home() {
  const { user } = useAuth();
  const hello = useAsync(() => api.hello(), []);

  return (
    <div className="stack-l">
      <section className="hero">
        <div>
          <p className="eyebrow">Proyecto final · Estructuras de Datos</p>
          <h1>AlertaBarrio</h1>
          <p className="lead">
            Reportes de seguridad ciudadana verificados, geolocalizados y priorizados por gravedad, con un mapa de calor
            predictivo y un resumen diario generados por inteligencia artificial.
          </p>
          <div className="row gap-s wrap">
            <Link className="btn" to={user ? "/reportar" : "/registro"}>
              {user ? "Reportar un incidente" : "Crear cuenta"}
            </Link>
            <Link className="btn ghost" to="/mapa">
              Ver mapa en vivo
            </Link>
          </div>
        </div>
        <div className="card team">
          <h3>Integrantes</h3>
          <ul>
            {TEAM.map((m: string) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <div className="api-status">
            {hello.loading && <span className="muted">Conectando con el backend…</span>}
            {hello.error && <span className="dot red">Backend sin conexión: {hello.error}</span>}
            {hello.data && (
              <span className="dot green">
                {hello.data.message} <small className="muted">(/api/v1/hello)</small>
              </span>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2>Ciclo completo</h2>
        <div className="flow">
          {["Vecino", "Frontend", "Backend", "Base de datos", "IA", "Backend", "Frontend", "Vecinos"].map((s, i) => (
            <span key={i} className="flow-step">
              {s}
            </span>
          ))}
        </div>
        <p className="muted">
          Al reportar, el backend guarda en PostgreSQL, pide a la IA clasificar el incidente y estimar el riesgo de la zona,
          guarda ese análisis y mete el reporte a la cola de prioridad de moderación.
        </p>
      </section>

      <section>
        <h2>Estructuras de datos usadas</h2>
        <div className="grid-cards">
          {STRUCTURES.map(([t, d]) => (
            <div className="card mini" key={t}>
              <h4>{t}</h4>
              <p className="muted">{d}</p>
            </div>
          ))}
        </div>
        <Link to="/estructuras">Ver el estado interno en vivo →</Link>
      </section>
    </div>
  );
}
