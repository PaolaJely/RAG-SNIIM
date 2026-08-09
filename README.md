# RAG-SNIIM — Sistema de Análisis de Precios de Plátano Tabasco

Sistema integral de **Retrieval-Augmented Generation (RAG)** para consultar y analizar los precios de plátano tabasco registrados en el SNIIM (Sistema Nacional de Información e Integración de Mercados). Combina un scraper web, búsqueda vectorial en Qdrant, almacenamiento relacional en Postgres, una API REST y un dashboard interactivo con chat de inteligencia artificial.

---

## Arquitectura del proyecto

```
RAG-SNIIM-main/
├── scraper/          # Scraper Node.js (Playwright) — extrae datos del portal SNIIM
├── rag/              # Pipeline RAG en Python — embeddings + LLM + consultas vectoriales
├── api/              # API REST (FastAPI) — endpoints para el dashboard y el chat IA
├── frontend/         # Dashboard React + Vite + Tailwind — visualización y chat
├── data/             # Datos en JSON generados por el scraper
├── docker-compose.yml # Infraestructura: Qdrant + PostgreSQL
├── api/sql/init.sql  # Esquema inicial de Postgres (montado en el contenedor)
└── .env              # Variables de entorno (no se versiona)
```

---

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Scraper | Node.js, Playwright, pnpm |
| Embeddings | OpenAI (`text-embedding-3-small`) |
| LLM | DeepSeek (`deepseek-v4-flash`) |
| Vector store | Qdrant |
| Datos analíticos | PostgreSQL 17 |
| Infraestructura | Docker Compose (Qdrant + Postgres) |
| API | Python 3.11+, FastAPI, LangChain |
| Frontend | React 18, Vite, Tailwind CSS 4, shadcn/ui, Recharts |

---

## Requisitos previos

- **Docker** y **Docker Compose** (recomendado para levantar Qdrant y Postgres)
- **Node.js** ≥ 18 y **pnpm** ≥ 10
- **Python** ≥ 3.11
- **API key de OpenAI** con acceso a embeddings `text-embedding-3-small`
- **API key de DeepSeek** con acceso a `deepseek-v4-flash`

---

## Configuración de variables de entorno

Copia el archivo de ejemplo y edítalo con tus credenciales:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `QDRANT_HOST` | Host de Qdrant (por defecto `localhost`) |
| `QDRANT_PORT` | Puerto de Qdrant (por defecto `6333`) |
| `QDRANT_COLLECTION` | Nombre de la colección (por defecto `sniim`) |
| `POSTGRES_HOST` | Host de PostgreSQL |
| `POSTGRES_PORT` | Puerto de PostgreSQL (por defecto `5432`) |
| `POSTGRES_DB` | Nombre de la base de datos |
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL |
| `POSTGRES_SSLMODE` | Modo SSL (`prefer` local, `require` en Neon) |
| `QDRANT_URL` | URL de Qdrant Cloud (producción; opcional en local) |
| `QDRANT_API_KEY` | API key de Qdrant Cloud (producción; opcional en local) |
| `OPENAI_API_KEY` | API key de OpenAI para embeddings |
| `OPENAI_EMBEDDING_MODEL` | Modelo de embeddings (por defecto `text-embedding-3-small`) |
| `DEEPSEEK_API_KEY` | API key de DeepSeek para generación |
| `DEEPSEEK_BASE_URL` | Base URL compatible con OpenAI (por defecto `https://api.deepseek.com`) |
| `DEEPSEEK_LLM_MODEL` | Modelo LLM (por defecto `deepseek-v4-flash`) |
| `DEEPSEEK_THINKING_MODE` | Modo thinking de DeepSeek (`disabled` por defecto) |
| `SEARCH_K` | Número de documentos a recuperar por consulta (por defecto `16`) |
| `SIMILARITY_THRESHOLD` | Umbral mínimo de similitud para filtrar resultados (por defecto `0.2`) |

> Con Docker, los valores por defecto de `.env.example` (`localhost`, puertos `6333` y `5432`) ya coinciden con los contenedores. No hace falta cambiarlos.

### Deploy en producción (gratuito)

Para publicar con **Qdrant Cloud**, **Neon**, **Render** y **Netlify**, sigue la guía paso a paso:

**[docs/DEPLOY.md](docs/DEPLOY.md)**

El repo incluye `api/Dockerfile`, `render.yaml` y soporte para Qdrant Cloud (`QDRANT_URL` + `QDRANT_API_KEY`).

---

## Infraestructura con Docker

El archivo `docker-compose.yml` levanta los servicios de persistencia que necesita el proyecto. La API, el pipeline RAG y el frontend se ejecutan en el host (no van en contenedores).

| Servicio | Imagen | Puerto | Descripción |
|---|---|---|---|
| `qdrant` | `qdrant/qdrant:latest` | `6333`, `6334` | Búsqueda vectorial para el chat RAG |
| `postgres` | `postgres:17` | `5432` | Registros de precios para KPIs, heatmap y mercados |

Al iniciar Postgres por primera vez, se ejecuta automáticamente `api/sql/init.sql` y crea la tabla `producto` con sus índices.

### Levantar los servicios

Desde la raíz del repositorio:

```bash
docker compose up -d
```

Comprueba que estén activos:

```bash
docker compose ps
```

Salida esperada: `sniim-qdrant` y `sniim-postgres` en estado `running`.

### Ver logs

```bash
# Todos los servicios
docker compose logs -f

# Solo uno
docker compose logs -f qdrant
docker compose logs -f postgres
```

### Detener y eliminar

```bash
# Detener contenedores (conserva datos en volúmenes)
docker compose down

# Detener y borrar volúmenes (base de datos y vectores desde cero)
docker compose down -v
```

> Usa `down -v` solo si quieres reiniciar la indexación completa. Los datos de Qdrant y Postgres se pierden.

### Credenciales por defecto (Postgres)

Coinciden con `.env.example`:

| Variable | Valor |
|---|---|
| `POSTGRES_DB` | `sniim` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `postgres` |

### URLs de comprobación

- **Qdrant dashboard:** [http://localhost:6333/dashboard](http://localhost:6333/dashboard)
- **Postgres:** `psql -h localhost -U postgres -d sniim` (contraseña: `postgres`)

---

## Ejecución paso a paso

### 1. Scraper — Obtener datos del SNIIM

Extrae los registros de precios de plátano tabasco del portal oficial de la SNIIM y los guarda en `data/platano_tabasco.json`.

```bash
cd scraper
pnpm install
pnpm playwright install chromium
node index.js
```

El archivo generado se guarda automáticamente en `../data/platano_tabasco.json`.

---

### 2. RAG — Generar embeddings e indexar

Procesa el JSON, genera embeddings con OpenAI y los indexa en Qdrant (vectores) y Postgres (registros para el dashboard).

```bash
cd rag
pip install -r requirements.txt
python embed.py
```

Antes de indexar, levanta la infraestructura con Docker (`docker compose up -d`) o asegúrate de que Qdrant y PostgreSQL estén accesibles en los hosts configurados en `.env`.

---

### 3. API — Levantar el servidor FastAPI

Expone los endpoints REST que consume el frontend.

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

La documentación interactiva estará disponible en [http://localhost:8000/docs](http://localhost:8000/docs).

#### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/kpis` | Indicadores clave: precio promedio, máximo, mínimo y variación mensual |
| `GET` | `/api/precios/mensual` | Serie de tiempo mensual de precios (frecuente, mínimo, máximo) |
| `GET` | `/api/precios/heatmap` | Matriz destino × mes para el mapa de calor (top 10 mercados) |
| `GET` | `/api/mercados` | Lista de mercados con precio promedio, mínimo y máximo |
| `POST` | `/api/chat` | Consulta en lenguaje natural al pipeline RAG |

Todos los endpoints aceptan el parámetro opcional `?destino=<nombre>` para filtrar por mercado de destino.

---

### 4. Frontend — Iniciar el dashboard

```bash
cd frontend
pnpm install
pnpm dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173).

Para construir la versión de producción:

```bash
pnpm build
```

---

## Flujo de datos completo

```
Portal SNIIM
    │
    ▼
[scraper/] ──→ data/platano_tabasco.json
                        │
                        ▼
               [rag/embed.py] ──→ Qdrant (vectores) + Postgres (registros)
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                     [api/main.py]              [rag/rag.py]
                     (FastAPI REST)       (Pipeline RAG + deepseek-v4-flash)
                              │                       │
                              └───────────┬───────────┘
                                          ▼
                                   [frontend/]
                              (Dashboard + Chat IA)
```

---

## Uso del chat IA

El chat responde preguntas en lenguaje natural sobre los precios de plátano, por ejemplo:

- *"¿Cuál fue el precio más alto en enero de 2025?"*
- *"¿Qué mercados tienen el precio más bajo?"*
- *"Compara los precios de Villahermosa con los de Ciudad de México"*

El pipeline RAG recupera los registros más relevantes de Qdrant mediante búsqueda vectorial (embeddings OpenAI) y los envía a **deepseek-v4-flash** para generar una respuesta fundamentada únicamente en los datos disponibles.
