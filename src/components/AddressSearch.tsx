import { useState, type FormEvent } from "react";
import { searchAddress, type AddressResult } from "../lib/address";
import Icon from "./Icon";
import "./address.css";

/** Buscador de direcciones de Pasto: "Calle 18 # 25-30", "Parque Nariño", "Unicentro"… */
export default function AddressSearch({ onPick, placeholder }: { onPick: (r: AddressResult) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<AddressResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const found = await searchAddress(text);
      setResults(found);
      if (found.length === 1) pick(found[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const pick = (r: AddressResult) => {
    setResults(null);
    setText(r.label);
    onPick(r);
  };

  // no es un <form> porque puede ir dentro de otro formulario
  return (
    <div className="address-search">
      <div className="row gap-s">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(e)}
          placeholder={placeholder ?? "Busca una dirección de Pasto: Calle 18 # 25-30"}
          aria-label="Buscar dirección"
        />
        <button type="button" className="btn small" onClick={() => search()} disabled={busy || text.trim().length < 3}>
          <Icon name="pin" size={14} /> {busy ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {error && <small className="muted">{error}</small>}
      {results && results.length === 0 && <small className="muted">No encontramos esa dirección. Prueba con la calle o un lugar conocido, o toca el mapa.</small>}
      {results && results.length > 1 && (
        <ul className="address-results">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
