import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, Pane, Tooltip, useMap } from "react-leaflet";
import BaseMap from "./BaseMap";

export type HeatPoint = { lat: number; lng: number; count: number };

/** Color segun intensidad (0 a 1): naranja -> rojo -> rojo oscuro. */
export function heatColor(t: number) {
  if (t < 0.25) return "#fb923c";
  if (t < 0.5) return "#f43f5e";
  if (t < 0.75) return "#dc2626";
  return "#7f1d1d";
}

/** Ajusta el mapa para que se vean todos los puntos del filtro. */
function FitPoints({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b.pad(0.15), { maxZoom: 15, animate: true });
  }, [map, points]);
  return null;
}

/**
 * Mapa de calor: cada punto es una "mancha" borrosa; donde hay muchos
 * incidentes las manchas se juntan y la zona queda roja.
 */
export default function HeatMap({ points, height = 420 }: { points: HeatPoint[]; height?: number }) {
  // escala logaritmica: asi una zona con 1 incidente no desaparece al lado de una con 20
  const max = Math.log1p(Math.max(1, ...points.map((p) => p.count)));
  return (
    <div className="heatmap-wrap">
      <BaseMap height={height}>
        <Pane name="calor" style={{ zIndex: 450, filter: "blur(7px)", mixBlendMode: "multiply" }}>
          {points.map((p) => {
            const t = Math.log1p(p.count) / max;
            return (
              <CircleMarker
                key={`h${p.lat},${p.lng}`}
                center={[p.lat, p.lng]}
                radius={16 + t * 26}
                pathOptions={{ stroke: false, fillColor: heatColor(t), fillOpacity: 0.35 + t * 0.4 }}
              />
            );
          })}
        </Pane>
        {/* capa invisible encima para poder pasar el mouse y ver cuantos hubo */}
        {points.map((p) => (
          <CircleMarker
            key={`t${p.lat},${p.lng}`}
            center={[p.lat, p.lng]}
            radius={12}
            pathOptions={{ stroke: false, fillOpacity: 0 }}
          >
            <Tooltip>{p.count === 1 ? "1 incidente" : `${p.count} incidentes`}</Tooltip>
          </CircleMarker>
        ))}
        <FitPoints points={points} />
      </BaseMap>
      <div className="heat-legend">
        <span>Menos</span>
        <i />
        <span>Más incidentes</span>
      </div>
    </div>
  );
}
