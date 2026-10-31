import { useEffect, useRef, useState } from "react";

// Dictado por voz con el reconocimiento del navegador (Chrome, Edge, Safari y Android).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any;

function recognitionClass(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

export const speechSupported = typeof window !== "undefined" && !!recognitionClass();

/** Escucha al usuario y va entregando el texto; `onFinal` se llama cuando termina de hablar. */
export function useSpeech(onText: (text: string) => void, onFinal?: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const handlers = useRef({ onText, onFinal });
  handlers.current = { onText, onFinal };

  useEffect(() => {
    return () => {
      rec.current?.abort();
    };
  }, []);

  const start = () => {
    const Ctor = recognitionClass();
    if (!Ctor) return setError("Tu navegador no permite dictar por voz. Escribe el mensaje.");
    const r = new Ctor();
    setError(null);
    r.lang = "es-CO";
    r.interimResults = true;
    r.continuous = false;
    let text = "";
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(" ")
        .trim();
      handlers.current.onText(text);
    };
    r.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed") setError("Permite el micrófono para hablarle a Vigía.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("No te entendí, intenta de nuevo.");
    };
    r.onend = () => {
      setListening(false);
      if (text) handlers.current.onFinal?.(text);
    };
    rec.current = r;
    r.start();
    setListening(true);
  };

  const stop = () => rec.current?.stop();

  return { listening, error, start, stop, toggle: () => (listening ? stop() : start()) };
}
