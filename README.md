# AlertaBarrio

Plataforma para que los vecinos de un barrio **reporten incidentes de seguridad** (robos, hurtos, actividad sospechosa…) y reciban **alertas en tiempo real**. Los reportes pasan por moderación, se ordenan por gravedad y una **inteligencia artificial** ayuda a clasificarlos, predecir zonas de riesgo y generar un resumen diario.

Página publicada: https://alertabarrio-frontend.vercel.app

El proyecto está dividido en **tres repositorios** que trabajan juntos:

| Repositorio | Qué es | Tecnología |
|---|---|---|
| [alertabarrio-frontend](https://github.com/Santiago425/alertabarrio-frontend) (este) | Página web que usan los vecinos y moderadores | React 19 + TypeScript + Vite + Leaflet |
| [alertabarrio-backend](https://github.com/Santiago425/alertabarrio-backend) | API REST, base de datos y **todas las estructuras de datos** | Python + FastAPI + PostgreSQL |
| [alertabarrio-ai](https://github.com/Santiago425/alertabarrio-ai) | Componente de IA independiente | Python + FastAPI |

---

## 1. Arquitectura

```
 ┌──────────────┐   HTTP/JSON   ┌──────────────────┐   HTTP/JSON   ┌──────────────────┐
 │   Frontend   │ ────────────► │     Backend      │ ────────────► │  Componente IA   │
 │ React + Vite │ ◄──────────── │     FastAPI      │ ◄──────────── │     FastAPI      │
 │   (Vercel)   │               │     (Render)     │               │     (Render)     │
 └──────────────┘               └────────┬─────────┘               └──────────────────┘
                                         │ SQLAlchemy
                                ┌────────▼─────────┐
                                │   PostgreSQL 16  │
                                │    14 tablas     │
                                └──────────────────┘
```

- **PostgreSQL** es la fuente de verdad: ahí se guarda todo.
- Al arrancar, el backend carga los datos en memoria dentro de **nuestras propias estructuras de datos** (`AlertEngine`) para responder rápido.
- La **IA es un servicio aparte**: el backend le pega por HTTP y no sabe qué modelo hay detrás. Si la IA no responde, el backend sigue funcionando sin ella.

---

## 2. ¿Qué pasa cuando un vecino reporta algo?

1. El vecino llena el formulario en `/reportar` (tipo de incidente, descripción, ubicación en el mapa y foto opcional).
2. El backend guarda el reporte con estado `created` y lo mete en la **pila** de historial de ese reporte.
3. El backend le manda el texto a la **IA**, que responde:
   - qué tipo de incidente cree que es (clasificador **Naive Bayes**) y con qué confianza,
   - qué tan riesgosa es esa zona en ese día y hora.
4. Si la IA está muy segura (≥ 70 %) de que es algo **más grave** de lo que marcó el vecino, se usa esa gravedad. Ejemplo: marcó "hurto" pero escribió que fue un robo con pistola.
5. Se calcula la **prioridad** (gravedad + riesgo de la zona + si tiene foto) y el reporte entra a la **cola de prioridad** de moderación.
6. El moderador saca siempre **el más grave primero**, lo publica o lo rechaza, y puede **deshacer** (pop de la pila).
7. Al publicarse, entra al **feed** del barrio (lista enlazada) y se encolan **notificaciones** (cola FIFO) para los vecinos suscritos.
8. Cuando otros vecinos lo confirman (2 verificaciones por defecto), pasa a `verified`.

```
created ─► in_review ─► published ─► verified
   └──────────┴──► rejected
```

---

## 3. Estructuras de datos (el corazón del proyecto)

Todas están implementadas **a mano, sin librerías**, en `alertabarrio-backend/app/structures/`, y se usan de verdad dentro de `app/services/engine.py`.

| Estructura | Archivo | Para qué la usamos en AlertaBarrio |
|---|---|---|
| **Arreglo dinámico** | `dynamic_array.py` | Catálogo de barrios ordenado por nombre (se duplica cuando se llena) |
| **Lista doblemente enlazada** | `linked_list.py` | Feed de alertas activas por barrio y vecinos suscritos por barrio |
| **Pila (Stack)** | `stack.py` | Historial de estados de cada reporte → botón **deshacer** |
| **Cola (Queue)** | `queue.py` | Notificaciones pendientes (FIFO, buffer circular, O(1)) |
| **Cola de prioridad (max-heap)** | `priority_queue.py` | Cola de moderación: sale primero el más grave |
| **Tabla hash** | `hash_table.py` | Índice reporte → pila y barrio → lista (encadenamiento, rehash al 0.75) |
| **Árbol binario de búsqueda (AVL)** | `bst.py` | Historial de reportes por fecha → consultas por rango |
| **Grafo ponderado** | `graph.py` | Barrios = vértices, vías = aristas → **ruta más segura** con Dijkstra, BFS y DFS |
| **Ordenamiento y búsqueda** | `sorting.py` | `merge_sort` (feed general), `quick_sort` (ranking de barrios), búsqueda binaria |

En la página `/estructuras` se ve el estado interno de todas en vivo (`GET /api/v1/ds/state`).

---

## 4. Componente de IA

Servicio independiente (como recomendó el profe). Los modelos se cambian **solo con variables de entorno** o en caliente con `POST /api/v1/models/switch`, sin tocar backend ni frontend.

| Función | Modelo por defecto | Alternativas |
|---|---|---|
| Clasificar el reporte | **Naive Bayes multinomial** hecho a mano con suavizado de Laplace, entrenado con frases típicas de grupos de barrio | `keywords` |
| Riesgo de la zona | peso = gravedad/5 × 0.5^(edad/vida_media), por barrio, día y franja de 6 h | — |
| Mapa de calor predictivo | **KDE** (kernel gaussiano sobre grilla 36×36) | `frequency` (histograma 2D) |
| Resumen diario | `template` (plantilla) | `ollama` (modelos open source locales), `openai_compatible` (Groq, OpenRouter, LM Studio), `anthropic` |

Si un proveedor externo falla, el resumen se genera con la plantilla y la respuesta lo dice. Cada llamada a la IA queda registrada en la tabla `ai_analyses` (modelo, latencia, resultado).

---

## 5. Base de datos

PostgreSQL 16, **14 tablas** (nombres en inglés). Diagrama entidad-relación en [`alertabarrio-backend/database/er_diagram.png`](https://github.com/Santiago425/alertabarrio-backend/blob/main/database/er_diagram.png).

`roles`, `users`, `neighborhoods`, `neighborhood_connections`, `incident_types`, `reports`, `report_photos`, `report_status_history`, `report_verifications`, `subscriptions`, `notifications`, `ai_analyses`, `daily_summaries`, `risk_hotspots`.

Datos de ejemplo (`database/seed.sql`): 14 barrios de Bogotá, 8 usuarios y unos 150 reportes. Contraseña demo: `Alerta2026*`. El backend crea las tablas y carga los datos solo si la base está vacía.

---

## 6. Pantallas del frontend

| Ruta | Pantalla |
|---|---|
| `/` | Inicio: proyecto, integrantes y estado del backend (`/api/v1/hello`) |
| `/registro`, `/login` | Registro e inicio de sesión (JWT) |
| `/mapa` | Mapa en tiempo real con alertas coloreadas por gravedad + mapa de calor de la IA |
| `/reportar` | Formulario rápido con ubicación en el mapa y foto opcional; muestra lo que hizo la IA |
| `/feed` | Timeline de alertas por prioridad + resumen diario de la IA |
| `/moderacion` | Cola de prioridad dibujada como heap, publicar/rechazar y **deshacer** (pila) |
| `/ia` | Mapa de calor, matriz día × hora, ranking de barrios y resumen diario |
| `/rutas` | Ruta más segura entre barrios (grafo + Dijkstra) |
| `/estructuras` | Estado interno de todas las estructuras en vivo |
| `/notificaciones` | Notificaciones y barrios que sigo |

---

## 7. Endpoints principales del backend

Documentación interactiva (Swagger) en `/docs` del backend.

| Método | Ruta | Estructura que usa |
|---|---|---|
| POST | `/api/v1/auth/register`, `/api/v1/auth/login` | — (bcrypt + JWT) |
| POST | `/api/v1/reports` | IA → PriorityQueue + AVL + Stack |
| GET | `/api/v1/feed?neighborhood_id=` | LinkedList / merge sort |
| GET | `/api/v1/reports?from=&to=` | AVL (rango por fecha) |
| GET | `/api/v1/reports/{id}/history` | Stack |
| POST | `/api/v1/reports/{id}/verify` | — |
| GET | `/api/v1/moderation/queue` | PriorityQueue (heap) |
| POST | `/api/v1/moderation/next` | pop del heap |
| POST | `/api/v1/moderation/reports/{id}/publish` | LinkedList + Queue de notificaciones |
| POST | `/api/v1/moderation/reports/{id}/undo` | pop de la Stack |
| GET | `/api/v1/routes/safe?from_id=&to_id=` | Graph + Dijkstra + BFS |
| GET | `/api/v1/neighborhoods/search?name=` | búsqueda binaria |
| GET | `/api/v1/neighborhoods/ranking` | quick sort |
| GET | `/api/v1/ai/heatmap`, `/api/v1/ai/daily-summary` | llaman al componente de IA |
| GET | `/api/v1/ds/state` | estado de todas las estructuras |

---

## 8. Cómo correr todo en local

Necesitas **Node 22**, **Python 3.11+** y **PostgreSQL** (o nada de Postgres para los tests, que usan SQLite).

```bash
# 1) Bajar los tres repos
git clone https://github.com/Santiago425/alertabarrio-frontend
git clone https://github.com/Santiago425/alertabarrio-backend
git clone https://github.com/Santiago425/alertabarrio-ai

# 2) IA  (puerto 8001)
cd alertabarrio-ai
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001

# 3) Backend  (puerto 8000), en otra terminal
cd alertabarrio-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # ajustar DATABASE_URL y AI_SERVICE_URL=http://localhost:8001
uvicorn app.main:app --reload --port 8000

# 4) Frontend  (puerto 5173), en otra terminal
cd alertabarrio-frontend
npm ci
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev
```

### Variables de entorno

| Repo | Variable | Para qué |
|---|---|---|
| frontend | `VITE_API_URL` | URL del backend (sin `/` al final) |
| frontend | `VITE_TEAM_MEMBERS` | Nombres que salen en la página de inicio |
| backend | `DATABASE_URL` | Conexión a PostgreSQL |
| backend | `AI_SERVICE_URL` | URL del componente de IA |
| backend | `JWT_SECRET` | Secreto para firmar los tokens |
| backend | `TEAM_MEMBERS`, `CORS_ORIGINS`, `SEED_ON_STARTUP`, `TIMEZONE`, `VERIFICATIONS_REQUIRED` | Configuración general |
| ia | `CLASSIFIER_MODEL`, `HEATMAP_MODEL`, `SUMMARY_PROVIDER` | Qué modelo usar ("el switch") |
| ia | `SUMMARY_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`, `ADMIN_TOKEN` | Proveedor externo y protección del switch |

---

## 9. Pruebas y CI

| Repo | Comando | Qué revisa |
|---|---|---|
| frontend | `npm run build` | Tipos de TypeScript + build de producción |
| backend | `pytest` | 21 pruebas: estructuras de datos y API |
| ia | `pytest` | 7 pruebas de los modelos y endpoints |

Cada repo tiene **GitHub Actions** (`.github/workflows/ci.yml`) que en cada push corre el lint (`ruff`), las pruebas y construye la imagen de **Docker**.

---

## 10. Despliegue

| Parte | Dónde |
|---|---|
| Frontend | **Vercel** (`vercel.json` redirige todas las rutas a `index.html`). También tiene `Dockerfile` con nginx |
| Backend | **Render** + PostgreSQL |
| IA | **Render** |

Los planes gratis de Render "duermen" el servidor tras 15 minutos sin uso. Por eso el backend tiene el workflow `keep-alive.yml`, que cada 10 minutos le hace ping al backend y a la IA. Se configura en GitHub en *Settings → Secrets and variables → Actions → Variables* con `BACKEND_URL` y `AI_URL`.

---

Revisado por Neber Melo: página publicada en https://alertabarrio-frontend.vercel.app
