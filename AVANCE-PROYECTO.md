# Avance del proyecto RAG-SNIIM

> Documento informal para saber qué llevamos hecho. Las capturas van en las secciones marcadas con 📸.

---

## ¿De qué va?

Es un sistema para consultar y visualizar precios de **plátano Tabasco** del portal SNIIM (economia-sniim.gob.mx). La idea es juntar tres cosas:

1. **Sacar los datos** del portal oficial con un scraper.
2. **Guardarlos e indexarlos** para poder buscarlos con IA (RAG).
3. **Mostrarlos** en un dashboard web con gráficas y un chat donde puedes preguntar en lenguaje natural.

Por ejemplo: *"¿Cuál fue el precio más alto en enero?"* o *"Compara Villahermosa con Ciudad de México"*.

---

## Lo que ya está hecho (por capas)

### Datos e infraestructura

- **Scraper** (Node.js + Playwright): navega el portal SNIIM y genera un JSON con miles de registros de precios (`data/platano_tabasco.json`, ~6,000 registros de 2025).
- **Docker Compose**: levanta **Qdrant** (búsqueda vectorial para el chat) y **PostgreSQL** (datos para gráficas y KPIs).
- **Pipeline de indexación** (`rag/embed.py`): lee el JSON, genera embeddings con OpenAI y los guarda en Qdrant + Postgres.

### Motor RAG (Python)

- Recupera los registros más parecidos a tu pregunta usando embeddings.
- Filtra por similitud y diversifica resultados (no repite el mismo origen/destino).
- Comprime el contexto en formato **TOON** para gastar menos tokens.
- Responde con **gpt-4o-mini** basándose solo en los datos recuperados.
- Mide **tokens y costo** de cada respuesta.
- Tiene un script de evaluación con **RAGAS** (`rag/eval.py`) para medir calidad offline.

### API (FastAPI)

Expone 5 endpoints que usa el frontend:

| Qué hace | Ruta |
|---|---|
| KPIs (promedio, máx, mín, variación) | `GET /api/kpis` |
| Serie de precios en el tiempo | `GET /api/precios/mensual` |
| Mapa de calor destino × mes | `GET /api/precios/heatmap` |
| Lista de mercados con precios | `GET /api/mercados` |
| Chat con IA | `POST /api/chat` |

Todos aceptan un filtro opcional `?destino=NombreDelMercado`.

### Frontend (React + Vite + Tailwind)

App web con sidebar, modo claro/oscuro y filtro global por destino que afecta dashboard y gráficas.

---

## Pantallas

### Vista general / layout

Toda la app comparte la misma estructura:

- **Sidebar** a la izquierda con navegación: Dashboard, Mercados, Chat IA (Configuración aparece pero aún no funciona).
- **Header** arriba con el filtro de destino y toggle de tema claro/oscuro.
- En móvil el menú se convierte en drawer.

📸 **Captura sugerida:** pantalla completa mostrando sidebar + header con el filtro de destino abierto.

```
![Layout general](docs/capturas/01-layout-general.png)
```

---

### 1. Dashboard (`/`)

Es la pantalla principal. Muestra de un vistazo cómo van los precios:

- **4 tarjetas KPI:** precio promedio (con variación vs mes anterior), máximo, mínimo y total de ciudades destino.
- **Gráfica de tendencia:** evolución de precios en el tiempo, con toggle mensual/semanal y punto marcado del pico.
- **Mapa de calor:** matriz destino × mes (top 10 mercados), colores según precio.
- **Ranking de mercados:** los que tienen precios más altos/bajos.

Si eliges un destino en el filtro del header, todo se recalcula para ese mercado.

📸 **Captura sugerida:** dashboard completo con los 4 KPIs + gráfica de tendencia visible.

```
![Dashboard — KPIs y tendencia](docs/capturas/02-dashboard-kpis-tendencia.png)
```

📸 **Captura sugerida:** parte inferior con heatmap y ranking lado a lado.

```
![Dashboard — heatmap y ranking](docs/capturas/03-dashboard-heatmap-ranking.png)
```

📸 **Opcional:** mismo dashboard pero con un destino filtrado (ej. Villahermosa).

```
![Dashboard filtrado por destino](docs/capturas/04-dashboard-filtro-destino.png)
```

---

### 2. Mercados (`/mercados`)

Directorio de todos los mercados de destino con sus precios:

- Barra de búsqueda para filtrar por nombre.
- Grid de **tarjetas** — cada una muestra el mercado, precio promedio/min/max y una barra visual comparativa entre mercados.

📸 **Captura sugerida:** vista del grid con varias tarjetas y la barra de búsqueda arriba.

```
![Directorio de mercados](docs/capturas/05-mercados-grid.png)
```

📸 **Opcional:** búsqueda activa mostrando pocos resultados.

```
![Mercados — búsqueda](docs/capturas/06-mercados-busqueda.png)
```

---

### 3. Chat IA (`/chat-ia`)

Asistente conversacional sobre los precios. Tiene tres estados:

**Pantalla de bienvenida** (sin mensajes aún):
- Título "Asistente SNIIM" y 3 sugerencias clicables (precio promedio, mercado más caro, tendencia anual).

📸 **Captura sugerida:** pantalla de bienvenida con las 3 tarjetas de sugerencias.

```
![Chat — pantalla de bienvenida](docs/capturas/07-chat-bienvenida.png)
```

**Conversación activa:**
- Mensajes del usuario a la derecha, respuestas del bot a la izquierda.
- Debajo de cada respuesta: cuántas fuentes consultó, badge de **tokens y costo USD**, botón copiar.
- Indicador de "escribiendo..." mientras llega la respuesta.

📸 **Captura sugerida:** conversación con al menos 2 intercambios, mostrando el badge de tokens.

```
![Chat — conversación con respuesta](docs/capturas/08-chat-conversacion.png)
```

**Panel de contexto** (botón "Contexto" arriba a la derecha):
- Drawer lateral con los registros que el RAG recuperó para la última respuesta (fecha, origen, destino, precios, similitud).

📸 **Captura sugerida:** drawer de contexto abierto mostrando los registros recuperados.

```
![Chat — drawer de contexto RAG](docs/capturas/09-chat-contexto-rag.png)
```

---

## Flujo de punta a punta (resumen visual)

```
Portal SNIIM → Scraper → JSON → embed.py → Qdrant + Postgres
                                                    ↓
                              Frontend ← API FastAPI ← RAG (chat)
```

📸 **Opcional:** captura de la documentación Swagger en `http://localhost:8000/docs`.

```
![API Swagger](docs/capturas/10-api-swagger.png)
```

📸 **Opcional:** dashboard de Qdrant en `http://localhost:6333/dashboard` mostrando la colección indexada.

```
![Qdrant dashboard](docs/capturas/11-qdrant-coleccion.png)
```

---

## Lo que aún no está / pendiente

- **Pantalla de Configuración** — aparece en el menú pero deshabilitada.
- **Manejo visual de errores** cuando el backend no responde.
- **Tests automatizados** en ninguna capa.
- Generalizar el scraper para más productos (ahora el foco es plátano Tabasco).

---

## Cómo correrlo (rápido)

```bash
# 1. Infra
docker compose up -d

# 2. API
cd api && uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend && pnpm dev
# → http://localhost:5173
```

*(Asumiendo que ya corriste el scraper, embed.py y tienes el `.env` configurado.)*

---

## Carpeta sugerida para capturas

Guarda las imágenes en:

```
docs/capturas/
├── 01-layout-general.png
├── 02-dashboard-kpis-tendencia.png
├── 03-dashboard-heatmap-ranking.png
├── 04-dashboard-filtro-destino.png      (opcional)
├── 05-mercados-grid.png
├── 06-mercados-busqueda.png             (opcional)
├── 07-chat-bienvenida.png
├── 08-chat-conversacion.png
├── 09-chat-contexto-rag.png
├── 10-api-swagger.png                   (opcional)
└── 11-qdrant-coleccion.png              (opcional)
```

Las rutas en los bloques `![...](...)` de arriba ya apuntan ahí — solo hay que tomar las capturas y colocarlas.
