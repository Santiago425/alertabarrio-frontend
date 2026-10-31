import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Photo = { file: string; caption: string; dir?: string };

export const CITY_PHOTOS: Photo[] = [
  { file: "volcano.jpg", caption: "Volcán Galeras" },
  { file: "cathedral.jpg", caption: "Catedral" },
  { file: "lagoon.jpg", caption: "Laguna de La Cocha" },
  { file: "city-hall.jpg", caption: "Alcaldía" },
];

export const SECURITY_PHOTOS: Photo[] = [
  { file: "monitoring.jpg", caption: "Monitoreo 24/7", dir: "security" },
  { file: "patrol.jpg", caption: "Patrullaje nocturno", dir: "security" },
];

/** Para el login: fotos de seguridad y de la ciudad intercaladas. */
export const COVER_PHOTOS: Photo[] = [
  SECURITY_PHOTOS[0],
  CITY_PHOTOS[0],
  SECURITY_PHOTOS[1],
  ...CITY_PHOTOS.slice(1),
];

type Credit = {
  file: string;
  author: string;
  license: string;
  source: string;
};
let credits: Promise<Credit[]> | null = null;

function loadCredits(): Promise<Credit[]> {
  credits ??= fetch("/photos/credits.json")
    .then((r) => (r.ok ? r.text() : "[]"))
    .then((t) => JSON.parse(t.replace(/^﻿/, "")) as Credit[])
    .catch(() => []);
  return credits;
}

function useCredits() {
  const [list, setList] = useState<Credit[]>([]);
  useEffect(() => {
    loadCredits().then(setList);
  }, []);
  return list;
}

/** Fotos reales que se van turnando con un fundido suave. */
export function Carousel({
  photos,
  className = "",
  every = 6000,
}: {
  photos: Photo[];
  className?: string;
  every?: number;
}) {
  const [ok, setOk] = useState<Photo[]>(photos);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (ok.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % ok.length), every);
    return () => clearInterval(t);
  }, [ok.length, every]);

  if (!ok.length) return null;
  const now = ok[i % ok.length];

  return (
    <figure className={`carousel ${className}`}>
      {ok.map((f, n) => (
        <img
          key={f.file}
          src={`/${f.dir ?? "photos"}/${f.file}`}
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
export function PhotoCredits({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const cred = useCredits();
  return (
    <>
      <button
        type="button"
        className={`link-btn credits-link ${className}`}
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
              <ul className="credits">
                {CITY_PHOTOS.map((f) => {
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
