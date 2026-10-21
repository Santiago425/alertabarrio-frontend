import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Foto = { file: string; caption: string };

export const FOTOS_PASTO: Foto[] = [
  { file: "galeras.jpg", caption: "Volcán Galeras" },
  { file: "catedral.jpg", caption: "Catedral de Pasto" },
  { file: "cocha.jpg", caption: "Laguna de La Cocha" },
  { file: "carnaval.jpg", caption: "Carnaval de Negros y Blancos" },
  { file: "plaza.jpg", caption: "Alcaldía de Pasto" },
];

type Credito = {
  file: string;
  author: string;
  license: string;
  source: string;
};
let creditos: Promise<Credito[]> | null = null;

function loadCreditos(): Promise<Credito[]> {
  creditos ??= fetch("/pasto/creditos.json")
    .then((r) => (r.ok ? r.text() : "[]"))
    .then((t) => JSON.parse(t.replace(/^﻿/, "")) as Credito[])
    .catch(() => []);
  return creditos;
}

function useCreditos() {
  const [list, setList] = useState<Credito[]>([]);
  useEffect(() => {
    loadCreditos().then(setList);
  }, []);
  return list;
}

/** Fotos reales que se van turnando con un fundido suave. */
export function Carrusel({
  fotos,
  className = "",
  every = 6000,
}: {
  fotos: Foto[];
  className?: string;
  every?: number;
}) {
  const [ok, setOk] = useState<Foto[]>(fotos);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (ok.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % ok.length), every);
    return () => clearInterval(t);
  }, [ok.length, every]);

  if (!ok.length) return null;
  const now = ok[i % ok.length];

  return (
    <figure className={`carrusel ${className}`}>
      {ok.map((f, n) => (
        <img
          key={f.file}
          src={`/pasto/${f.file}`}
          alt={f.caption}
          className={n === i % ok.length ? "on" : ""}
          loading={n === 0 ? "eager" : "lazy"}
          onError={() => setOk((list) => list.filter((x) => x.file !== f.file))}
        />
      ))}
      <figcaption>
        <b>{now.caption}</b>
      </figcaption>
    </figure>
  );
}

/** Enlace discreto con los autores y licencias de las fotos (lo pide la licencia CC BY-SA). */
export function CreditosFotos({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const cred = useCreditos();
  return (
    <>
      <button
        type="button"
        className={`link-btn creditos-link ${className}`}
        onClick={() => setOpen(true)}
      >
        Créditos de fotos
      </button>
      {open &&
        createPortal(
          <div className="modal-back" onClick={() => setOpen(false)}>
            <div
              className="modal card"
              role="dialog"
              aria-label="Créditos de fotos"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Créditos de fotos</h3>
              <ul className="creditos">
                {FOTOS_PASTO.map((f) => {
                  const c = cred.find((x) => x.file === f.file);
                  return (
                    <li key={f.file}>
                      <b>{f.caption}</b>
                      {c ? (
                        <a href={c.source} target="_blank" rel="noreferrer">
                          {c.author} · {c.license} · Wikimedia Commons
                        </a>
                      ) : (
                        <span>Wikimedia Commons</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="btn small" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
