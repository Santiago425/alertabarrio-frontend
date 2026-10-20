import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { CITY_CENTER, CITY_ZOOM } from "../lib/format";

export default function BaseMap({ children, height = 480, zoom = CITY_ZOOM }: { children?: ReactNode; height?: number; zoom?: number }) {
  return (
    <MapContainer center={CITY_CENTER} zoom={zoom} className="map" style={{ height }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {children}
    </MapContainer>
  );
}
