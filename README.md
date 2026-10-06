# AlertaBarrio · Frontend

**React + TypeScript** (Vite). Consume la API del backend.

| Ruta | Pantalla |
|---|---|
| `/` | Inicio: proyecto, integrantes y estado del backend (`/api/v1/hello`) |
| `/registro`, `/login` | Registro e inicio de sesión |
| `/mapa` | Mapa en tiempo real con alertas coloreadas por gravedad + mapa de calor de la IA |
| `/reportar` | Formulario rápido con ubicación en el mapa y foto opcional; muestra lo que hizo la IA |
| `/feed` | Timeline de alertas por prioridad + resumen diario de la IA |
| `/moderacion` | Cola de prioridad dibujada como heap, publicar/rechazar y **deshacer** (pila) |
| `/ia` | Mapa de calor, matriz día × hora, ranking de barrios y resumen diario |
| `/rutas` | Ruta más segura entre barrios (grafo + Dijkstra) |
| `/estructuras` | Estado interno de todas las estructuras en vivo |
| `/notificaciones` | Notificaciones y barrios que sigo |

## Correr

```bash
npm ci
cp .env.example .env     # VITE_API_URL=http://localhost:8000
npm run dev              # http://localhost:5173
npm run build            # typecheck + build de producción
```

Despliegue en Vercel: ver `docs/DESPLIEGUE.md`. También tiene `Dockerfile` (build + nginx).
