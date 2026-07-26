# Guía para Codex: Mejora MVP del RAG SNIIM

## 1. Contexto del Proyecto

Este proyecto analiza precios del SNIIM con una arquitectura RAG y debe funcionar tanto en entorno local con Docker como en deploy con Render, Neon y Qdrant Cloud.

Arquitectura actual:

```text
JSON del scraper
  -> rag/embed.py
  -> embeddings OpenAI
  -> Qdrant local Docker o Qdrant Cloud con vectores + payload
  -> Postgres local Docker o Neon con datos estructurados
  -> API FastAPI /api/chat
  -> rag/rag.py
  -> recuperacion en Qdrant
  -> contexto TOON
  -> gpt-4o-mini
  -> respuesta + documentos + tokens al frontend
```

Infraestructura local:

- Postgres: contenedor `sniim-postgres`, puerto `5432`, volumen `pg_data`.
- Qdrant: contenedor `sniim-qdrant`, puerto `6333`, volumen `qdrant_data`.
- API: FastAPI en `http://127.0.0.1:8000`.
- Frontend: Vite en `http://127.0.0.1:5173`.
- Proxy frontend: `/api` apunta a `http://127.0.0.1:8000`.

Infraestructura de deploy:

- API: Render usando `api/Dockerfile` y `render.yaml`.
- Base relacional: Neon Postgres con `POSTGRES_SSLMODE=require`.
- Base vectorial: Qdrant Cloud con `QDRANT_URL` y `QDRANT_API_KEY`.
- Frontend: build estático de Vite publicado fuera de la API.

Tecnologias principales:

- Backend: FastAPI.
- Frontend: React, TypeScript y Vite.
- Base relacional: Postgres local en Docker o Neon.
- Base vectorial: Qdrant local en Docker o Qdrant Cloud.
- Embeddings: OpenAI `text-embedding-3-small`.
- Generacion de respuesta: `gpt-4o-mini`.
- Compresion de contexto: TOON.
- Endpoint principal del chat: `POST /api/chat`.

Archivos importantes:

- `docker-compose.yml`: levanta Postgres y Qdrant locales.
- `api/sql/init.sql`: crea la tabla principal `producto`.
- `api/sql/002_imports.sql`: crea tablas del modulo de importacion local.
- `rag/config.py`: configuracion local/cloud por `.env` o variables del proveedor.
- `rag/embed.py`: ingesta, embeddings e indexacion en Qdrant + Postgres.
- `rag/rag.py`: retrieval, armado de contexto y generacion.
- `rag/compressor.py`: serializacion TOON.
- `api/main.py`: endpoints FastAPI, incluyendo `/api/chat`.
- `rag/migrate_cloud.py`: copia datos ya indexados desde Qdrant local a Qdrant Cloud.
- `frontend/src/services/chatService.ts`: consumo del chat desde el frontend.

---

## 2. Objetivo del MVP

El objetivo es mejorar la precision del chat para preguntas analiticas sin convertir el sistema en una plataforma compleja.

El problema actual es que el RAG vectorial puede responder preguntas numericas usando solo los documentos recuperados de Qdrant. Eso es insuficiente para calculos globales.

La mejora MVP es convertir el chat en un RAG hibrido:

```text
Preguntas semanticas o explicativas -> Qdrant local/cloud
Preguntas analiticas o numericas -> Postgres local/Neon
Preguntas mixtas -> Postgres local/Neon + explicacion con LLM
```

Ejemplos de preguntas que deben ir a Postgres:

- Cual fue el precio promedio en 2025?
- Que mercado tuvo el precio mas alto?
- Cual fue el precio minimo registrado?
- Dame un ranking de mercados por precio promedio.
- Cual fue la tendencia mensual?

Ejemplos de preguntas que pueden seguir en Qdrant:

- Que informacion hay sobre Villahermosa?
- Que registros existen para Monterrey?
- Explicame los datos disponibles sobre caja de 20 kg.

---

## 3. Restricciones

Antes de modificar codigo:

1. Revisar archivos relacionados.
2. Explicar cambios propuestos.
3. Mantener cambios pequenos y probables localmente.

Reglas:

- No romper `POST /api/chat`.
- Mantener compatibilidad con el frontend actual.
- No eliminar funcionalidad existente sin justificacion.
- No implementar SQL libre generado por LLM.
- Mantener compatibilidad con deploy cloud.
- No modificar datos de produccion externa salvo tareas explicitas de migracion o carga de datos.

No implementar todavia:

- Kubernetes.
- Feature Store.
- OpenAI Agents SDK.
- Manager Agent complejo.
- MLOps industrial.
- Shadow Testing.
- Reentrenamiento automatico.
- Monitoreo de drift.

Al finalizar cada tarea, reportar:

1. Archivos modificados.
2. Resumen de cambios.
3. Como probarlo localmente.
4. Riesgos o pendientes.

---

## 4. Estado Local Esperado

El archivo `.env` debe apuntar a Docker local:

```env
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=sniim

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sniim
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SSLMODE=prefer

OPENAI_API_KEY=sk-...
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

SEARCH_K=16
SIMILARITY_THRESHOLD=0.2
```

Comandos base:

```bash
docker compose up -d

cd api
uvicorn main:app --reload --host 127.0.0.1 --port 8000

cd frontend
pnpm install
pnpm dev --host 127.0.0.1 --port 5173
```

Comprobaciones utiles:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/kpis?source=sniim
curl http://127.0.0.1:5173/api/kpis?source=sniim
```

---

## 5. Fase 1: Clasificador de Intencion

### Objetivo

Clasificar la pregunta del usuario antes de ejecutar el RAG para decidir la ruta:

```text
analitica_sql
vectorial_rag
hibrida
```

### Archivo a Crear

```text
rag/query_router.py
```

### Funcion Requerida

```python
def classify_query_intent(question: str) -> dict:
    return {
        "intent": "analitica_sql",
        "reason": "La pregunta solicita un promedio.",
        "confidence": 0.85,
    }
```

### Reglas MVP

Usar reglas simples basadas en palabras clave. No usar otro LLM.

Clasificar como `analitica_sql` si la pregunta menciona:

- promedio
- maximo
- minimo
- precio mas alto
- precio mas bajo
- ranking
- tendencia
- evolucion
- variacion
- volatilidad
- comportamiento mensual
- comportamiento anual

Clasificar como `hibrida` si combina calculo con explicacion o comparacion:

- compara
- analiza
- explica la tendencia
- cual tuvo mejor comportamiento

Clasificar como `vectorial_rag` para busquedas generales:

- que informacion hay
- que registros existen
- explicame los datos disponibles

### Integracion

Integrar la clasificacion en `POST /api/chat`.

La respuesta puede agregar un campo opcional:

```json
{
  "respuesta": "...",
  "documentos": [],
  "total_docs": 0,
  "tokens": null,
  "intent": {
    "intent": "analitica_sql",
    "reason": "La pregunta solicita un calculo.",
    "confidence": 0.85
  }
}
```

No cambiar el frontend en esta fase salvo que sea estrictamente necesario.

### Pruebas

```text
Cual fue el precio promedio en 2025? -> analitica_sql
Que mercado tuvo el precio mas alto? -> analitica_sql
Explicame que informacion hay sobre Villahermosa -> vectorial_rag
Compara Monterrey y CDMX y dime cual tuvo mejor comportamiento -> hibrida
```

---

## 6. Fase 2: Herramienta SQL de Solo Lectura

### Objetivo

Responder preguntas analiticas usando Postgres local, no Qdrant.

### Archivo a Crear

```text
rag/sql_tool.py
```

### Reglas de Seguridad

- Solo lectura.
- Usar consultas parametrizadas.
- No concatenar texto del usuario en SQL.
- No permitir SQL libre generado por LLM.
- No ejecutar multiples sentencias.
- No ejecutar `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE` o `CREATE`.

### Enfoque MVP

Implementar funciones controladas:

```python
get_average_price(...)
get_max_price(...)
get_min_price(...)
get_market_ranking(...)
get_monthly_trend(...)
```

Usar la tabla `producto` de Postgres local.

Columnas relevantes:

- `producto_id`
- `fecha`
- `presentacion`
- `origen`
- `destino`
- `precio_min`
- `precio_max`
- `precio_frec`
- `obs`

### Integracion

Cuando `query_router.py` devuelva `analitica_sql`, `/api/chat` debe usar `rag/sql_tool.py`.

La respuesta debe mantener compatibilidad:

```json
{
  "respuesta": "...",
  "documentos": [
    {
      "source": "postgres",
      "type": "sql_result",
      "rows": []
    }
  ],
  "total_docs": 1,
  "tokens": null,
  "intent": {}
}
```

### Pruebas

- Preguntas de promedio deben usar Postgres.
- Preguntas de maximo deben usar Postgres.
- Preguntas de minimo deben usar Postgres.
- Preguntas generales deben seguir usando Qdrant.
- No debe ejecutarse ninguna consulta destructiva.

---

## 7. Fase 3: Sintesis de Respuestas SQL con LLM

### Objetivo

Usar el LLM solo para explicar resultados SQL, no para calcular.

El modelo debe recibir:

- Pregunta original.
- Resultado SQL.
- Instruccion de no inventar datos.
- Instruccion de declarar insuficiencia cuando falten datos.

Prompt interno sugerido:

```text
Responde usando unicamente los resultados SQL proporcionados.
No inventes precios, fechas, mercados ni tendencias.
Si los datos no son suficientes, indicalo claramente.
Explica el resultado en lenguaje claro para un usuario no tecnico.
```

La respuesta debe mencionar, cuando aplique:

- metrica calculada
- mercado o destino
- fecha o periodo
- numero de registros usados

---

## 8. Fase 4: Normalizacion de Precios

### Objetivo

Evitar que el chat diga que todos los precios estan en MXN/kg si algunos registros estan en presentacion original.

El proyecto ya tiene una logica similar en `api/main.py`:

```text
PRESENTACION_FACTOR
```

### Tareas

Actualizar `rag/embed.py` para guardar en Qdrant:

```text
precio_min_original
precio_max_original
precio_frec_original
presentacion_original
precio_min_kg
precio_max_kg
precio_frec_kg
unidad_normalizada
factor_conversion
```

Mantener campos originales para compatibilidad.

Actualizar `rag/compressor.py` para incluir unidad correcta.

Actualizar el prompt de `rag/rag.py` para que no afirme MXN/kg si la normalizacion no esta confirmada.

### Pruebas

- Si hay factor conocido, el chat puede decir MXN/kg.
- Si no hay factor conocido, debe indicar presentacion original.
- No eliminar campos anteriores del payload.

---

## 9. Fase 5: Deduplicacion en Qdrant

### Objetivo

Evitar duplicados al reindexar el mismo JSON.

Problema actual:

```text
rag/embed.py usa UUID aleatorio para cada punto.
```

Esto permite duplicados si se reindexa sin limpiar Qdrant.

### Tareas

Crear hash deterministico con SHA-256:

```python
def build_record_hash(record: dict, producto_id: str) -> str:
    key = "|".join([
        producto_id,
        str(record.get("Fecha", "")),
        str(record.get("Origen", "")),
        str(record.get("Destino", "")),
        str(record.get("Presentacion", "")),
        str(record.get("Precio Min", "")),
        str(record.get("Precio Max", "")),
        str(record.get("Precio Frec", "")),
    ])
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
```

Usar el hash como:

- `record_hash` en payload.
- ID deterministico compatible con Qdrant, si se decide usar UUID derivado.

Agregar logs:

```text
Registros procesados
Registros insertados
Registros omitidos por duplicado
Errores
```

### Pruebas

- Reindexar dos veces no debe duplicar datos.
- Qdrant debe seguir recuperando documentos.
- Postgres no debe duplicar filas si se ejecuta una reindexacion controlada.

---

## 10. Fase 6: Filtros Estructurados en Qdrant

### Objetivo

Mejorar retrieval usando metadata cuando la pregunta mencione datos claros.

Filtros sugeridos:

- ano
- mes
- fecha
- origen
- destino
- mercado
- presentacion
- producto

Ejemplos:

```text
Que precios hay en Villahermosa?
Que paso en 2025?
Compara Monterrey y CDMX.
```

Ajustar diversificacion:

- Pregunta temporal: conservar varias fechas del mismo mercado.
- Pregunta comparativa: diversificar por mercados comparados.
- Pregunta general: mantener comportamiento actual.

---

## 11. Fase 7: Pruebas Basicas del MVP

Preguntas vectoriales:

```text
Que informacion hay sobre Villahermosa?
Que registros existen para Monterrey?
Explicame los datos disponibles sobre caja de 20 kg.
```

Preguntas SQL:

```text
Cual fue el precio promedio en 2025?
Que mercado tuvo el precio mas alto?
Cual fue el precio minimo registrado?
Dame un ranking de mercados por precio promedio.
Cual fue la tendencia mensual?
```

Preguntas hibridas:

```text
Compara Monterrey y CDMX y dime cual tuvo mejor comportamiento.
Analiza la tendencia de Villahermosa y explica que significa.
```

Validaciones:

- Las preguntas analiticas usan Postgres.
- Las preguntas semanticas usan Qdrant.
- Las preguntas hibridas pueden usar Postgres y LLM.
- Las respuestas incluyen fuentes auditables.
- El sistema declara cuando no hay datos suficientes.

---

## 12. Prompt Recomendado Para Empezar

```text
Lee `docs/CODEX_RAG_MVP_GUIDE.md`.

Implementa unicamente la Fase 1: Clasificador de intencion.

Antes de modificar codigo:
1. Revisa la estructura del proyecto.
2. Identifica los archivos relacionados con `/api/chat`.
3. Explica los cambios minimos.

Despues implementa:
- `rag/query_router.py`.
- `classify_query_intent(question: str)`.
- Integracion en `POST /api/chat`.
- Campo opcional `intent` en la respuesta.

No implementes SQL todavia.
No cambies el frontend salvo que sea estrictamente necesario.
No rompas el formato actual de respuesta.

Al final reporta:
1. Archivos modificados.
2. Como probarlo localmente.
3. Riesgos o pendientes.
```

---

## 13. Orden Recomendado

1. Fase 1: clasificador de intencion.
2. Fase 2: herramienta SQL controlada.
3. Fase 3: sintesis SQL con LLM.
4. Fase 4: normalizacion de precios.
5. Fase 5: deduplicacion en Qdrant.
6. Fase 6: filtros estructurados en Qdrant.
7. Fase 7: pruebas basicas.

No implementar todo al mismo tiempo.

---

## 14. Resultado Esperado

Al terminar estas mejoras, el sistema local debe:

- Seguir respondiendo preguntas generales con Qdrant local.
- Responder preguntas analiticas usando Postgres local.
- Evitar calculos basados solo en 16 o 20 documentos recuperados.
- Mostrar fuentes o resultados auditables.
- Reducir errores por unidades de precio.
- Evitar duplicados durante la ingesta.
- Recuperar mejores documentos usando filtros de metadata.
- Mantener funcionando el frontend actual.

El objetivo es pasar de un chatbot RAG basico a un sistema hibrido confiable para analisis de precios en entorno local con Docker.
