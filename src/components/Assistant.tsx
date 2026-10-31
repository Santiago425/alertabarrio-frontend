import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ReportDraft, SafeRoute } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ASSISTANT_NAME } from "../config";
import { currentPosition } from "../lib/geo";
import { detectIntent } from "../lib/intent";
import DraftCard from "./DraftCard";
import Icon from "./Icon";
import VoiceInput from "./VoiceInput";

interface Message {
  from: "user" | "ai";
  text: string;
  model?: string;
  draft?: ReportDraft;
  route?: SafeRoute;
}

const SUGGESTIONS = ["Robaron un celular en la Avenida Santander", "Ruta segura hasta el Centro", "¿Qué barrio debo evitar hoy?", "Me robaron, ¿qué hago?"];

/**
 * Vigia: el vecino le habla (voz o texto) y segun lo que diga
 * arma un reporte, calcula la ruta segura o responde la pregunta.
 */
export default function AssistantChat({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  // Con llaves: en navegadores nuevos scrollIntoView devuelve una promesa y React la tomaria como limpieza
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
    setBusy(true);
    const reply = (msg: Omit<Message, "from">) => setMessages((m) => [...m, { from: "ai", ...msg }]);
    try {
      const intent = detectIntent(q);
      if (intent === "report") {
        const d = await api.reportDraft(q, await currentPosition());
        if (d.available) reply({ text: d.message || "Listo, armé el reporte. Revísalo y publícalo:", draft: d });
        else reply({ text: d.message });
        return;
      }
      if (intent === "route") {
        const r = await api.voiceRoute(q, await currentPosition());
        reply({ text: r.message, route: r.route ?? undefined });
        return;
      }
      const history = messages.slice(-8).map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), text: m.text.slice(0, 1500) }));
      const r = await api.chat(q, user?.neighborhood?.id, history);
      setMessages((m) => [...m, { from: "ai", text: String(r?.answer ?? "No pude responder ahora."), model: r?.model ? String(r.model) : undefined }]);
    } catch (e) {
      setMessages((m) => [...m, { from: "ai", text: e instanceof Error ? e.message : "No pude responder ahora." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`assistant ${compact ? "compact" : ""}`}>
      <header className="assistant-head">
        <span className="assistant-logo">
          <Icon name="sparkles" size={18} />
        </span>
        <div>
          <b>{ASSISTANT_NAME}</b>
          <small>Cuéntame qué pasó, pídeme una ruta segura o pregúntame</small>
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
            <span>{m.text}</span>
            {m.draft && <DraftCard draft={m.draft} />}
            {m.route && (
              <Link className="btn small light" to={`/rutas?from=${m.route.from_neighborhood.id}&to=${m.route.to_neighborhood.id}`}>
                <Icon name="route" size={14} /> Ver la ruta en el mapa
              </Link>
            )}
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
      <div className="assistant-input">
        <VoiceInput busy={busy} onSubmit={ask} placeholder={`Habla o escribe a ${ASSISTANT_NAME}…`} />
      </div>
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
      <button className="fab" onClick={() => setOpen(!open)} aria-label={open ? `Cerrar ${ASSISTANT_NAME}` : `Abrir ${ASSISTANT_NAME}`}>
        <Icon name={open ? "x" : "sparkles"} size={22} />
      </button>
    </>
  );
}
