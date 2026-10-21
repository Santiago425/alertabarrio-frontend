import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { CITY_NAME } from "../lib/format";
import Icon from "./Icon";

interface Message {
  from: "user" | "ai";
  text: string;
  model?: string;
}

const SUGGESTIONS = ["¿Qué barrio debo evitar hoy?", "¿A qué hora es más peligroso?", "¿Qué pasó en mi barrio?", "Dame consejos para caminar de noche"];

/** Chat con el asistente de IA (Gemini en el componente de IA, con respaldo por reglas). */
export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [messages, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
    setText("");
    setBusy(true);
    try {
      const r = await api.chat(q, user?.neighborhood?.id);
      setMessages((m) => [...m, { from: "ai", text: r.answer, model: r.model }]);
    } catch (e) {
      setMessages((m) => [...m, { from: "ai", text: e instanceof Error ? e.message : "No pude responder ahora." }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(text);
  };

  return (
    <section className={`assistant ${compact ? "compact" : ""}`}>
      <header className="assistant-head">
        <span className="assistant-logo">
          <Icon name="sparkles" size={18} />
        </span>
        <div>
          <b>Asistente AlertaBarrio</b>
          <small>Pregunta lo que quieras sobre la seguridad en {CITY_NAME}</small>
        </div>
      </header>
      <div className="assistant-body">
        {messages.length === 0 && (
          <div className="assistant-empty">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`}>
            {m.text}
            {m.model && <small>{m.model}</small>}
          </div>
        ))}
        {busy && (
          <div className="bubble ai typing">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="assistant-input" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" maxLength={500} />
        <button className="btn" disabled={busy || !text.trim()} aria-label="Enviar">
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="assistant-pop">
          <AssistantChat compact />
        </div>
      )}
      <button className="fab" onClick={() => setOpen(!open)} aria-label={open ? "Cerrar asistente" : "Abrir asistente de IA"}>
        <Icon name={open ? "x" : "sparkles"} size={22} />
      </button>
    </>
  );
}
