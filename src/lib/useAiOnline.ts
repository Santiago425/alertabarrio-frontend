import { useEffect, useState } from "react";
import { API_URL, api } from "../api/client";

export type AiState = "waking" | "on" | "off";

let state: AiState = "waking";
let waiting: Promise<AiState> | null = null;

// Render solo despierta el servicio de IA con visitas de afuera, asi que el navegador tambien lo toca
const AI_URL = (import.meta.env.VITE_AI_URL ?? API_URL.replace("alertabarrio-api", "alertabarrio-ai")).replace(/\/$/, "");
const pingAi = () => {
  if (AI_URL !== API_URL) fetch(`${AI_URL}/api/v1/models`, { mode: "no-cors" }).catch(() => undefined);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitForAi(): Promise<AiState> {
  if (state === "on") return Promise.resolve(state);
  waiting ??= (async () => {
    for (let i = 0; i < 30; i++) {
      if (i % 4 === 0) pingAi();
      try {
        if ((await api.aiStatus()).available) return (state = "on");
      } catch {
        // el backend tambien puede estar arrancando
      }
      await sleep(5000);
    }
    waiting = null;
    return (state = "off");
  })();
  return waiting;
}

/** Despierta la IA (Render la duerme si nadie la usa) y avisa cuando ya responde. */
export function useAiOnline(): AiState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    let alive = true;
    waitForAi().then((v) => alive && setCurrent(v));
    return () => {
      alive = false;
    };
  }, []);
  return current;
}

/** Empieza a despertar la IA apenas abre la app, mientras el usuario inicia sesion. */
export function despertarIa(): void {
  void waitForAi();
}
