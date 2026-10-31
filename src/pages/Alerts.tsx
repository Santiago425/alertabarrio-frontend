import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import VoiceReport from "../components/VoiceReport";
import { ASSISTANT_NAME } from "../config";
import Feed from "./Feed";
import NewReport from "./NewReport";

/** Reportar y ver las alertas en un solo lugar: arriba se reporta (por voz o formulario), abajo las alertas. */
export default function Alerts() {
  const [params] = useSearchParams();
  const [form, setForm] = useState(params.get("formulario") === "1");

  return (
    <div className="stack-l">
      {form ? (
        <section className="stack-s">
          <button className="link-btn back-link" onClick={() => setForm(false)}>
            <Icon name="mic" size={14} /> Mejor se lo cuento a {ASSISTANT_NAME}
          </button>
          <NewReport />
        </section>
      ) : (
        <>
          <VoiceReport />
          <button className="link-btn form-link" onClick={() => setForm(true)}>
            <Icon name="list" size={14} /> Prefiero llenar el formulario
          </button>
        </>
      )}

      <h2 className="section-title">Alertas de la comunidad</h2>
      <Feed />
    </div>
  );
}
