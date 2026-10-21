import { useEffect, useState } from "react";
import { api } from "../api/client";

export type AiState = "waking" | "on" | "off";

let state: AiState = "waking";
let waiting: Promise<AiState> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitForAi(): Promise<AiState> {
  if (state === "on") return Promise.resolve(state);
  waiting ??= (async () => {
    for (let i = 0; i < 30; i++) {
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
