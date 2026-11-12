import type { Neighborhood } from "../api/types";

/** Opciones de un <select> de barrios agrupadas por comuna (Pasto tiene 12 comunas). */
export default function HoodOptions({ hoods }: { hoods: Neighborhood[] | null | undefined }) {
  if (!hoods) return null;
  const groups = new Map<number, Neighborhood[]>();
  for (const h of hoods) {
    const k = h.comuna ?? 0;
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }
  return (
    <>
      {[...groups.entries()]
        .sort(([a], [b]) => (a || 99) - (b || 99))
        .map(([k, list]) => (
          <optgroup key={k} label={k ? `Comuna ${k}` : "Otros"}>
            {list
              .sort((a, b) => a.name.localeCompare(b.name, "es"))
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
          </optgroup>
        ))}
    </>
  );
}
