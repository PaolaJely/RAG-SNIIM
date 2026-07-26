# Guía de deploy gratuito — RAG-SNIIM con Qdrant Cloud

Esta guía describe cómo publicar el proyecto en producción usando servicios gratuitos, con **Qdrant Cloud** como vector store para el chat RAG.

---

## Arquitectura en producción

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│ Cloudflare Pages│ ──────────────►│ Render (FastAPI) │
│  React/Vite     │   /api/*       │   api/main.py    │
└─────────────────┘                └────────┬─────────┘
                                          │
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                  ┌────────────┐  ┌────────────┐  ┌─────────────┐
                  │ Neon       │  │ Qdrant     │  │ OpenAI API  │
                  │ PostgreSQL │  │ Cloud      │  │ (de pago)   │
                  │ (dashboard)│  │ (vectores) │  │             │
                  └────────────┘  └────────────┘  └─────────────┘
```

| Servicio | Rol | Tier gratuito |
|---|---|---|
| **Qdrant Cloud** | Búsqueda vectorial del chat RAG | Cluster free (~1 GB RAM) |
| **Neon** | KPIs, heatmap, mercados (Postgres) | 0.5 GB, permanente |
| **Render** | API FastAPI | Web service free (cold start ~1 min) |
| **Cloudflare Pages** | Dashboard React | Ilimitado para estáticos |
| **OpenAI** | Embeddings + LLM | Pago por uso (requerido) |

> El **scraper** y la **indexación** (`embed.py`) se ejecutan desde tu PC apuntando a las bases en la nube. No van en el deploy.

---

## Requisitos previos

- Cuenta en [GitHub](https://github.com) (repositorio del proyecto)
- Cuenta en [Qdrant Cloud](https://cloud.qdrant.io) (sin tarjeta para el cluster free)
- Cuenta en [Neon](https://neon.tech) (Postgres gratuito permanente)
- Cuenta en [Render](https://render.com) (API)
- Cuenta en [Cloudflare](https://dash.cloudflare.com) (frontend)
- API key de **OpenAI** con acceso a `gpt-4o-mini` y `text-embedding-3-small`
- Python ≥ 3.11 y pnpm en tu máquina local

---

## Paso 1 — Crear cluster en Qdrant Cloud

1. Entra a [cloud.qdrant.io](https://cloud.qdrant.io) y regístrate.
2. **Create a Free Cluster**:
   - Nombre: `sniim-rag` (o el que prefieras)
   - Región: la más cercana a tu API (ej. `us-east4` o `eu-central`)
3. Al crear el cluster, **copia y guarda**:
   - **Cluster URL** (endpoint):  
     `https://xxxxxxxx-xxxx.us-east4-0.gcp.cloud.qdrant.io:6333`
   - **API Key**: solo se muestra una vez al crearla
4. En el panel del cluster verifica que el estado sea **Healthy**.

### Verificar conexión (opcional)

```bash
curl -s "https://TU-CLUSTER.cloud.qdrant.io:6333/collections" \
  -H "api-key: TU_API_KEY"
```

Respuesta esperada: JSON con `"collections": []` (vacío al inicio).

---

## Paso 2 — Soporte Qdrant Cloud (ya incluido en el repo)

El proyecto ya soporta **Qdrant local** (`QDRANT_HOST` + `QDRANT_PORT`) y **Qdrant Cloud** (`QDRANT_URL` + `QDRANT_API_KEY`). Solo configura las variables en `.env`:

```env
# Qdrant Cloud (producción)
QDRANT_URL=https://xxxxxxxx.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=tu-api-key-de-qdrant-cloud
QDRANT_COLLECTION=sniim

# Comentar host/port local si usas solo cloud:
# QDRANT_HOST=localhost
# QDRANT_PORT=6333
```

Archivos relevantes:

| Archivo | Rol |
|---|---|
| `rag/config.py` | Lee `QDRANT_URL`, `QDRANT_API_KEY`, `POSTGRES_SSLMODE` |
| `rag/qdrant_client_factory.py` | Cliente local o cloud según env vars |
| `rag/embed.py`, `rag/rag.py` | Usan `get_qdrant_client()` |
| `.env.example` | Plantilla con secciones local y producción |

---

## Paso 3 — PostgreSQL en Neon (dashboard)

1. Crea un proyecto en [neon.tech](https://neon.tech).
2. Copia el **connection string** o los datos de conexión.
3. En `.env`:

```env
POSTGRES_HOST=ep-xxxx.region.aws.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=tu_password
POSTGRES_SSLMODE=require
```

4. Aplica el esquema (desde la raíz del repo):

```bash
psql "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" -f api/sql/init.sql
```

> **No uses** Postgres free de Render: expira a los 30 días. Neon es permanente en free tier.

---

## Paso 4 — Indexar datos en la nube

Con Qdrant Cloud y Neon configurados en `.env`:

```bash
# 1. Datos del scraper (si aún no los tienes)
cd scraper && pnpm install && node index.js

# 2. Indexar en Qdrant Cloud + Neon
cd ../rag
pip install -r requirements.txt
python embed.py
```

Salida esperada:

```
✅ Colección 'sniim' creada en Qdrant
✅ Completado: N registros en Qdrant y Postgres
```

Verifica en el panel de Qdrant Cloud que la colección `sniim` existe y tiene puntos.

### Probar el RAG localmente contra cloud

```bash
cd rag
python rag.py
# o desde api con uvicorn y POST /api/chat
```

---

## Paso 5 — Deploy de la API en Render

El repo incluye `api/Dockerfile` y `render.yaml` (Blueprint) listos para producción.

### Opción A — Blueprint (recomendada)

1. Sube el repo a GitHub.
2. En [render.com](https://render.com): **New → Blueprint** → conecta el repo.
3. Render detecta `render.yaml` y crea el servicio `rag-sniim-api`.
4. Completa en el dashboard las variables marcadas como secretas (`sync: false`):
   - `QDRANT_URL`, `QDRANT_API_KEY`
   - `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - `OPENAI_API_KEY`
5. Deploy. Anota la URL: `https://rag-sniim-api.onrender.com`

### Opción B — Web Service manual (Docker)

| Campo | Valor |
|---|---|
| **Name** | `rag-sniim-api` |
| **Environment** | Docker |
| **Dockerfile Path** | `api/Dockerfile` |
| **Docker Context** | `.` (raíz del repo) |
| **Health Check Path** | `/health` |

Variables de entorno: mismas que en la tabla siguiente.

| Variable | Ejemplo |
|---|---|
| `QDRANT_URL` | `https://xxx.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | `eyJ...` |
| `QDRANT_COLLECTION` | `sniim` |
| `POSTGRES_HOST` | `ep-xxx.neon.tech` |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_DB` | `neondb` |
| `POSTGRES_USER` | `neondb_owner` |
| `POSTGRES_PASSWORD` | `***` |
| `POSTGRES_SSLMODE` | `require` |
| `OPENAI_API_KEY` | `sk-...` |
| `OPENAI_LLM_MODEL` | `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |
| `SEARCH_K` | `16` |
| `SIMILARITY_THRESHOLD` | `0.2` |

### Verificar

```bash
curl https://rag-sniim-api.onrender.com/health
curl https://rag-sniim-api.onrender.com/api/kpis
```

> El tier free de Render **apaga** el servicio tras 15 min sin tráfico. La primera petición puede tardar ~1 minuto (cold start).

---

## Paso 6 — Deploy del frontend en Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → Connect to Git.
2. Selecciona el repositorio.
3. Configuración de build:

| Campo | Valor |
|---|---|
| **Framework preset** | Vite |
| **Root directory** | `frontend` |
| **Build command** | `pnpm install && pnpm build` |
| **Build output directory** | `dist` |

4. **Environment variables** (solo en build):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://rag-sniim-api.onrender.com` |

5. Deploy. URL resultante: `https://rag-sniim.pages.dev` (o tu dominio custom).

---

## Paso 7 — Verificación end-to-end

| Prueba | Cómo |
|---|---|
| Dashboard carga | Abre la URL de Cloudflare Pages |
| KPIs | Deben mostrar precios (Neon con datos) |
| Gráficas | `/api/precios/mensual` y heatmap responden 200 |
| Chat RAG | Pregunta en el chat; debe usar Qdrant Cloud + OpenAI |
| Qdrant | Panel Cloud → colección `sniim` con vectores |

---

## Actualizar datos en producción

El scraper no corre en la nube. Flujo de actualización:

```bash
# 1. Scrapear nuevos precios SNIIM
cd scraper && node index.js

# 2. Re-indexar (sobrescribe/añade en Qdrant Cloud + Neon)
cd ../rag && python embed.py
```

No hace falta redeploy de la API ni del frontend salvo cambios de código.

### Migrar Qdrant Docker a Qdrant Cloud sin re-embeddear

Si ya tienes la colección `sniim` cargada en el contenedor local `sniim-qdrant`, puedes copiarla a Qdrant Cloud sin llamar a OpenAI:

```bash
# 1. Dejar Qdrant local levantado
docker compose up -d qdrant

# 2. Configurar Qdrant Cloud en .env
QDRANT_URL=https://TU-CLUSTER.cloud.qdrant.io:6333
QDRANT_API_KEY=tu-api-key
QDRANT_COLLECTION=sniim

# 3. Copiar vectores, payloads e ids locales a Cloud
cd rag && python migrate_cloud.py
```

Por defecto el script hace `upsert` y no borra la colección destino. Para reemplazar completamente la colección cloud:

```bash
cd rag && python migrate_cloud.py --recreate-qdrant
```

La copia de Postgres local a Neon es opcional y explícita:

```bash
cd rag && python migrate_cloud.py --postgres --truncate-postgres
```

---

## Límites del tier gratuito

| Servicio | Limitación | Impacto |
|---|---|---|
| **Qdrant Cloud free** | ~1 GB RAM; cluster puede suspenderse por inactividad prolongada | Primera consulta RAG lenta tras suspensión |
| **Neon free** | 0.5 GB; scale-to-zero tras 5 min | Primera query SQL lenta |
| **Render free** | Cold start ~1 min; 750 h/mes | API lenta al despertar |
| **OpenAI** | Pago por token | ~$0.01–0.10 por conversación de chat |

---

## Solución de problemas

### Error de autenticación en Qdrant

```
403 Forbidden / Unauthorized
```

- Verifica `QDRANT_API_KEY` en Render y en `.env` local.
- La key debe tener permisos de lectura/escritura en el cluster.
- Usa la URL completa con `https://` y puerto `:6333`.

### Chat sin respuesta / sin contexto

- Confirma que `embed.py` terminó sin errores.
- En Qdrant Cloud → Collections → `sniim` → debe tener **points** > 0.
- Revisa `SIMILARITY_THRESHOLD` (0.2 es bajo; si no hay resultados, prueba 0.15).

### Dashboard sin datos (KPIs vacíos)

- Postgres en Neon debe tener filas en `producto`.
- Ejecuta `embed.py` con `POSTGRES_*` apuntando a Neon.
- Comprueba logs de Render: errores de conexión a Neon (SSL, credenciales).

### CORS / frontend no llega a la API

- `api/main.py` ya permite `allow_origins=["*"]`.
- Verifica que `VITE_API_URL` en Cloudflare Pages apunte a la URL correcta de Render (sin barra final).
- Rebuild del frontend tras cambiar `VITE_API_URL`.

### Cold start de Render

- Normal en free tier. Considera un ping periódico (cron-job.org) a `/api/kpis` cada 14 min si necesitas menos latencia.

---

## Variables de entorno — resumen

```env
# ── Qdrant Cloud ──────────────────────────────────────
QDRANT_URL=https://TU-CLUSTER.cloud.qdrant.io:6333
QDRANT_API_KEY=tu-api-key
QDRANT_COLLECTION=sniim

# ── Neon (Postgres) ───────────────────────────────────
POSTGRES_HOST=ep-xxx.neon.tech
POSTGRES_PORT=5432
POSTGRES_DB=neondb
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=***
POSTGRES_SSLMODE=require

# ── OpenAI ────────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ── RAG ───────────────────────────────────────────────
SEARCH_K=16
SIMILARITY_THRESHOLD=0.2

# ── Frontend (solo en build de Cloudflare Pages) ──────
VITE_API_URL=https://tu-api.onrender.com
```

---

## Referencias

- [Qdrant Cloud Quickstart](https://qdrant.tech/documentation/cloud-quickstart/)
- [Qdrant Cloud Authentication](https://qdrant.tech/documentation/cloud/authentication/)
- [Neon Free Plan](https://neon.tech/docs/introduction/plans)
- [Render Free Tier](https://render.com/docs/free)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
