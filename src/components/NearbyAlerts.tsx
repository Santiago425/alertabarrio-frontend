import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Report } from "../api/types";
import { currentPosition } from "../lib/geo";
import Icon from "./Icon";

/** Radio en metros para "cerca de mi". */
export const NEARBY_METERS = 500;
const KEY = "ab-cerca-visto";

/** Distancia en metros entre dos puntos (formula de haversine). */
export function distanceMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Near = { report: Report; meters: number };

/**
 * Al abrir la app (una vez por sesion) pide la ubicacion y avisa cuantas
 * alertas activas hay a menos de 500 m. Si el usuario no da permiso, no muestra nada.
 */
export default function NearbyAlerts() {
  const [near, setNear] = useState<Near[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* sin sessionStorage: se muestra igual */
    }
    if (seen) return;
    let alive = true;
    (async () => {
      const me = await currentPosition(10000);
      if (!me || !alive) return;
      try {
        const reports = await api.mapReports();
        const list = reports
          .map((r) => ({ report: r, meters: distanceMeters(me, [r.latitude, r.longitude]) }))
          .filter((n) => n.meters <= NEARBY_METERS)
          .sort((a, b) => a.meters - b.meters);
        if (!alive) return;
        setNear(list);
        setOpen(true);
      } catch {
        /* sin conexion: no se avisa */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // si no hay alertas cerca, el aviso verde se cierra solo
  useEffect(() => {
    if (open && near && !near.length) {
      const t = setTimeout(() => setOpen(false), 6000);
      return () => clearTimeout(t);
    }
  }, [open, near]);

  if (!open || !near) return null;
  const n = near.length;
  return (
    <div className={`nearby ${n ? "danger" : "safe"}`} role="status">
      <span className="nearby-icon">
        <Icon name={n ? "alert" : "check"} size={20} />
      </span>
      <div className="nearby-body">
        <b>
          {n === 0
            ? `No hay alertas activas a menos de ${NEARBY_METERS} m de ti`
            : n === 1
              ? `Hay 1 alerta activa a menos de ${NEARBY_METERS} m de ti`
              : `Hay ${n} alertas activas a menos de ${NEARBY_METERS} m de ti`}
        </b>
        {n > 0 && (
          <ul>
            {near.slice(0, 3).map(({ report, meters }) => (
              <li key={report.id}>
                <i style={{ background: report.incident_type.color }} />
                {report.incident_type.name} · a {Math.max(10, Math.round(meters / 10) * 10)} m
                {report.neighborhood?.name ? ` · ${report.neighborhood.name}` : ""}
              </li>
            ))}
          </ul>
        )}
        {n > 0 && (
          <Link to="/mapa" className="nearby-link" onClick={() => setOpen(false)}>
            Ver en el mapa <Icon name="arrowRight" size={14} />
          </Link>
        )}
      </div>
      <button className="nearby-close" aria-label="Cerrar aviso" onClick={() => setOpen(false)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
