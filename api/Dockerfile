# Imagen de la API para Render (Docker).
# Contexto de build: raíz del repositorio (dockerContext: .)

FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema: psycopg2 + Node.js para el scraper Stagehand
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY rag/ rag/
COPY api/ api/
COPY scraper/ scraper/

RUN cd /app/scraper/stagehand && npm install

ENV PYTHONUNBUFFERED=1

WORKDIR /app/api

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
