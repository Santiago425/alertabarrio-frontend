import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { BOGOTA_CENTER } from "../lib/format";

export default function BaseMap({ children, height = 480, zoom = 12 }: { children?: ReactNode; height?: number; zoom?: number }) {
  return (
    <MapContainer center={BOGOTA_CENTER} zoom={zoom} style={{ height, width: "100%", borderRadius: 12 }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
