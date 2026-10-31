let last: [number, number] | null = null;

/** Ubicacion del celular o del PC. Devuelve null si el usuario no da permiso. */
export function currentPosition(timeout = 8000): Promise<[number, number] | null> {
  if (!navigator.geolocation) return Promise.resolve(last);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve((last = [p.coords.latitude, p.coords.longitude])),
      () => resolve(last),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    );
  });
}
