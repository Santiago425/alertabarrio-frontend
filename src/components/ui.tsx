import type { ReactNode } from "react";
import type { IncidentType, ReportStatus, StatusEntry } from "../api/types";
import { STATUS_LABEL, formatDate } from "../lib/format";

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function TypeBadge({ type }: { type: IncidentType }) {
  return (
    <span className="badge" style={{ background: `${type.color}1f`, color: type.color, borderColor: `${type.color}55` }}>
      {type.name} · {type.severity_level}/5
    </span>
  );
}

export function Loading({ text = "Cargando…" }: { text?: string }) {
  return <p className="muted">{text}</p>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert-error">{message}</div>;
}

export function Card({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="row gap-s">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function DSTag({ children }: { children: ReactNode }) {
  return <span className="ds-tag">{children}</span>;
}

/** Dibuja la PILA de estados: el tope arriba. */
export function StackView({ entries }: { entries: StatusEntry[] }) {
  if (!entries.length) return <p className="muted">Sin historial</p>;
  return (
    <div className="stack-view">
      {entries.map((e, i) => (
        <div key={e.id} className={`stack-item ${i === 0 ? "top" : ""}`}>
          <span>
            {i === 0 && <b className="top-label">TOPE → </b>}
            {STATUS_LABEL[e.new_status]}
          </span>
          <small className="muted">
            {formatDate(e.changed_at)}
            {e.note ? ` · ${e.note}` : ""}
          </small>
        </div>
      ))}
      <div className="stack-base">base</div>
    </div>
  );
}

/** Dibuja el arreglo del heap como un arbol binario (padre i -> hijos 2i+1, 2i+2). */
export function HeapTree({ heap }: { heap: { priority: number; id: number }[] }) {
  if (!heap.length) return <p className="muted">El heap está vacío</p>;
  const levels: { priority: number; id: number; index: number }[][] = [];
  heap.forEach((node, index) => {
    const level = Math.floor(Math.log2(index + 1));
    (levels[level] ??= []).push({ ...node, index });
  });
  return (
    <div className="heap">
      {levels.map((nodes, l) => (
        <div className="heap-level" key={l}>
          {nodes.map((n) => (
            <div className="heap-node" key={n.id} title={`posición ${n.index} del arreglo`}>
              <b>{n.priority}</b>
              <small>#{n.id}</small>
            </div>
          ))}
        </div>
      ))}
      <div className="heap-array">
        arreglo: [{heap.map((h) => h.priority).join(", ")}]
      </div>
    </div>
  );
}
