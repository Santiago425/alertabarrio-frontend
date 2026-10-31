import { useState } from "react";
import { api } from "../api/client";
import type { ReportDraft } from "../api/types";
import { ASSISTANT_NAME } from "../config";
import { currentPosition } from "../lib/geo";
import DraftCard from "./DraftCard";
import Icon from "./Icon";
import VoiceInput from "./VoiceInput";
import { ErrorBox, Loading } from "./ui";

/** Reportar hablando: el vecino cuenta que paso y Vigia arma el reporte con su ubicacion. */
export default function VoiceReport() {
  const [said, setSaid] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interpret = async (text: string) => {
    setSaid(text);
    setDraft(null);
    setError(null);
    setBusy(true);
    try {
      const d = await api.reportDraft(text, await currentPosition());
      if (d.available) setDraft(d);
      else setError(d.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude armar el reporte");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="voice-report card">
      <div className="voice-report-head">
        <span className="assistant-logo">
          <Icon name="mic" size={20} />
        </span>
        <div>
          <h2>Cuéntale a {ASSISTANT_NAME} qué pasó</h2>
          <p className="muted">Habla o escribe. {ASSISTANT_NAME} entiende el tipo de incidente y toma el barrio de tu ubicación.</p>
        </div>
      </div>
      <VoiceInput big busy={busy} onSubmit={interpret} placeholder="Ej: robaron un celular en la Avenida Santander" />
      {said && (busy || draft) && <p className="voice-said">“{said}”</p>}
      {busy && <Loading text={`${ASSISTANT_NAME} está armando el reporte…`} />}
      <ErrorBox message={error} />
      {draft && <DraftCard key={said} draft={draft} onCancel={() => setDraft(null)} />}
    </section>
  );
}
