# RAG-SNIIM — Sistema de Análisis de Precios de Plátano Tabasco

Sistema integral de **Retrieval-Augmented Generation (RAG)** para consultar y analizar los precios de plátano tabasco registrados en el SNIIM (Sistema Nacional de Información e Integración de Mercados). Combina un scraper web, una base de datos vectorial, una API REST y un dashboard interactivo con chat de inteligencia artificial.

---

## Arquitectura del proyecto

```
RAG-SNIIM-main/
├── scraper/          # Scraper Node.js (Playwright) — extrae datos del portal SNIIM
├── rag/              # Pipeline RAG en Python — embeddings + LLM + consultas vectoriales
├── api/              # API REST (FastAPI) — endpoints para el dashboard y el chat IA
├── frontend/         # Dashboard React + Vite + Tailwind — visualización y chat
├── data/             # Datos en JSON generados por el scraper
└── .env              # Variables de entorno (no se versiona)
```

---

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Scraper | Node.js, Playwright, pnpm |
| Embeddings | Ollama (`nomic-embed-text`) / OpenAI (`text-embedding-3-small`) |
| LLM | OpenAI (`gpt-4o-mini`) |
| Vector store | Supabase (pgvector) |
| API | Python 3, FastAPI, LangChain |
| Frontend | React 18, Vite, Tailwind CSS 4, shadcn/ui, Recharts |

---

## Requisitos previos

- **Node.js** ≥ 18 y **pnpm** ≥ 10
- **Python** ≥ 3.11
- Cuenta en **[Supabase](https://supabase.com)** con la extensión `pgvector` habilitada y la función `buscar_producto` creada
- **Ollama** corriendo en `http://localhost:11434` con el modelo `nomic-embed-text` descargado (si `PROVIDER=ollama`), **o** una API key de **OpenAI** (si `PROVIDER=openai`)

---

## Configuración de variables de entorno

Copia el archivo de ejemplo y edítalo con tus credenciales:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `PROVIDER` | Proveedor de embeddings: `ollama` (local) u `openai` |
| `SUPABASE_URL` | URL de tu proyecto en Supabase |
| `SUPABASE_KEY` | Service role key de Supabase |
| `OLLAMA_BASE_URL` | URL de Ollama (por defecto `http://localhost:11434`) |
| `OLLAMA_EMBEDDING_MODEL` | Modelo de embeddings de Ollama (por defecto `nomic-embed-text`) |
| `OLLAMA_LLM_MODEL` | Modelo LLM de Ollama (por defecto `llama3.2`) |
| `OPENAI_API_KEY` | API key de OpenAI |
| `OPENAI_LLM_MODEL` | Modelo LLM de OpenAI (por defecto `gpt-4o-mini`) |
| `OPENAI_EMBEDDING_MODEL` | Modelo de embeddings de OpenAI (por defecto `text-embedding-3-small`) |
| `SEARCH_K` | Número de documentos a recuperar por consulta (por defecto `16`) |
| `SIMILARITY_THRESHOLD` | Umbral mínimo de similitud para filtrar resultados (por defecto `0.2`) |

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

### 2. RAG — Generar embeddings e indexar en Supabase

Procesa el JSON, genera los embeddings de cada registro y los inserta en la tabla `producto` de Supabase.

```bash
cd rag
pip install -r requirements.txt
python embed.py
```

> Si usas Ollama, asegúrate de que el servidor esté corriendo y el modelo descargado:
> ```bash
> ollama serve
> ollama pull nomic-embed-text
> ```

---

### 3. API — Levantar el servidor FastAPI

Expone los endpoints REST que consume el frontend.

```bash
cd api
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
               [rag/embed.py] ──→ Supabase (pgvector)
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                     [api/main.py]              [rag/rag.py]
                     (FastAPI REST)          (Pipeline RAG + LLM)
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

El pipeline RAG recupera los registros más relevantes de Supabase mediante búsqueda vectorial y los envía al LLM (OpenAI) para generar una respuesta fundamentada únicamente en los datos disponibles.
