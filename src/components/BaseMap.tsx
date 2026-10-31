import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { CITY_CENTER, CITY_ZOOM } from "../config";

export default function BaseMap({ children, height = 480, zoom = CITY_ZOOM }: { children?: ReactNode; height?: number; zoom?: number }) {
  return (
    <MapContainer center={CITY_CENTER} zoom={zoom} className="map" style={{ height }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}

/** Mueve el mapa suavemente a [lat, lng, zoom] cada vez que cambia el destino. */
export function FlyTo({ target }: { target: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target[0], target[1]], target[2], { duration: 0.8 });
  }, [map, target]);
  return null;
}
