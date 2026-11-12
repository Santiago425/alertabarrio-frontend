// Direcciones de Pasto con OpenStreetMap (Nominatim), directo desde el navegador.
// Politica de uso de Nominatim: maximo 1 consulta por segundo y nada de autocompletar
// letra por letra, por eso solo se busca cuando el vecino da "Buscar".
import type { Neighborhood } from "../api/types";

const NOMINATIM = "https://nominatim.openstreetmap.org";
// Caja que encierra la zona urbana de Pasto (oeste, norte, este, sur)
const PASTO_VIEWBOX = "-77.33,1.26,-77.23,1.16";

export interface AddressResult {
  label: string; // texto corto para mostrar: "Calle 18, Las Cuadras"
  latitude: number;
  longitude: number;
  barrio?: string; // barrio segun OpenStreetMap (si lo sabe)
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
}

let lastCall = 0;
async function nominatim(path: string, params: Record<string, string>): Promise<unknown> {
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const q = new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "es", ...params });
  const res = await fetch(`${NOMINATIM}${path}?${q}`);
  if (!res.ok) throw new Error("El buscador de direcciones no respondió. Intenta de nuevo.");
  return res.json();
}

const barrioOf = (a?: Record<string, string>) => a?.neighbourhood ?? a?.quarter ?? a?.suburb ?? a?.residential;

function toResult(p: NominatimPlace): AddressResult {
  const a = p.address ?? {};
  const street = [a.road ?? a.pedestrian ?? p.name, a.house_number].filter(Boolean).join(" ");
  const barrio = barrioOf(a);
  const label = [street || p.display_name.split(",")[0], barrio].filter(Boolean).join(", ");
  return { label, latitude: Number(p.lat), longitude: Number(p.lon), barrio };
}

/**
 * Busca una direccion o un lugar dentro de Pasto. Acepta el formato colombiano
 * ("Calle 18 # 25-30"): si la direccion completa no aparece, prueba solo con la via.
 */
export async function searchAddress(text: string): Promise<AddressResult[]> {
  const clean = text.replace(/\b(n[o°º]\.?|num(ero)?\.?)\s*/gi, "# ").replace(/\s+/g, " ").trim();
  if (clean.length < 3) return [];
  const tries = [clean.replace("#", " ")];
  const street = clean.split("#")[0].trim();
  if (street && street !== clean) tries.push(street);
  for (const q of tries) {
    const found = (await nominatim("/search", {
      q: `${q}, Pasto, Nariño`,
      countrycodes: "co",
      viewbox: PASTO_VIEWBOX,
      bounded: "1",
      limit: "6",
    })) as NominatimPlace[];
    if (found.length) return found.map(toResult);
  }
  return [];
}

/** Direccion aproximada de un punto del mapa (para mostrarla y guardarla en el reporte). */
export async function addressAt(latitude: number, longitude: number): Promise<AddressResult | null> {
  try {
    const p = (await nominatim("/reverse", { lat: String(latitude), lon: String(longitude), zoom: "18" })) as NominatimPlace & {
      error?: string;
    };
    return p && !p.error ? { ...toResult(p), latitude, longitude } : null;
  } catch {
    return null;
  }
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(barrio|urbanizacion|urb\.?)\s+/, "")
    .trim();

/** Barrio de la lista de la app que corresponde al nombre que da OpenStreetMap. */
export function matchBarrio(name: string | undefined, hoods: Neighborhood[] | null | undefined): Neighborhood | undefined {
  if (!name || !hoods?.length) return undefined;
  const n = norm(name);
  return hoods.find((h) => norm(h.name) === n) ?? hoods.find((h) => n.length > 4 && (norm(h.name).startsWith(n) || n.startsWith(norm(h.name))));
}
