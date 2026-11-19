import type { IncidentType } from "../api/types";

export const CATEGORY_ORDER = ["Seguridad", "Tránsito", "Emergencias", "Servicios públicos", "Convivencia", "Otros"];

/** Agrupa los tipos por categoria, en el orden de CATEGORY_ORDER (las nuevas al final, "Otros" de ultimo). */
export function groupByCategory<T extends IncidentType>(types: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const t of types) {
    const k = t.category || "Otros";
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const rank = (c: string) => (c === "Otros" ? 999 : CATEGORY_ORDER.indexOf(c) === -1 ? 500 : CATEGORY_ORDER.indexOf(c));
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

/** Opciones de un <select> de tipos de incidente agrupadas por categoria. */
export default function TypeOptions({ types, showSeverity = false }: { types: IncidentType[] | null | undefined; showSeverity?: boolean }) {
  if (!types) return null;
  return (
    <>
      {groupByCategory(types).map(([cat, list]) => (
        <optgroup key={cat} label={cat}>
          {list.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {showSeverity ? ` (gravedad ${t.severity_level})` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
