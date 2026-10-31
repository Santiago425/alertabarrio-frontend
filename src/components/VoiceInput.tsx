import { useState, type FormEvent } from "react";
import { speechSupported, useSpeech } from "../lib/speech";
import Icon from "./Icon";

/** Caja para hablarle o escribirle a Vigia. Al terminar de hablar se envia sola. */
export default function VoiceInput({
  onSubmit,
  placeholder,
  busy = false,
  autoSend = true,
  big = false,
}: {
  onSubmit: (text: string) => void;
  placeholder: string;
  busy?: boolean;
  autoSend?: boolean;
  big?: boolean;
}) {
  const [text, setText] = useState("");
  const send = (value: string) => {
    const v = value.trim();
    if (!v || busy) return;
    onSubmit(v);
    setText("");
  };
  const speech = useSpeech(setText, autoSend ? send : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <form className={`voice-input ${big ? "big" : ""} ${speech.listening ? "listening" : ""}`} onSubmit={submit}>
      {speechSupported && (
        <button
          type="button"
          className="mic-btn"
          onClick={speech.toggle}
          disabled={busy}
          aria-label={speech.listening ? "Dejar de escuchar" : "Hablar"}
          title={speech.listening ? "Escuchando… toca para terminar" : "Toca y habla"}
        >
          <Icon name="mic" size={big ? 22 : 18} />
        </button>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={speech.listening ? "Te escucho…" : placeholder}
        maxLength={500}
      />
      <button className="btn" disabled={busy || !text.trim()} aria-label="Enviar">
        <Icon name="send" size={16} />
      </button>
      {speech.error && <small className="voice-error">{speech.error}</small>}
    </form>
  );
}
