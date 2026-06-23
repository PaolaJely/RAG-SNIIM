"""
Migra datos indexados desde Docker local → Qdrant Cloud + Neon.

No llama a OpenAI: copia vectores y filas ya existentes.

Uso (Docker local levantado: docker compose up -d):
    cd rag && python migrate_cloud.py
"""
from __future__ import annotations

import sys
from typing import Any

import psycopg2
from psycopg2.extras import execute_batch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

import config
from qdrant_client_factory import get_qdrant_client

# ── Origen: Docker local ─────────────────────────────────
LOCAL_QDRANT = QdrantClient(host="localhost", port=6333)
LOCAL_PG_DSN = (
    "host=localhost port=5432 dbname=sniim "
    "user=postgres password=postgres sslmode=disable"
)

BATCH = 100


def _migrate_postgres() -> int:
    """Copia tabla producto de Postgres local a Neon."""
    src = psycopg2.connect(LOCAL_PG_DSN)
    dst = psycopg2.connect(config.POSTGRES_DSN)

    src_cur = src.cursor()
    dst_cur = dst.cursor()

    src_cur.execute(
        """
        SELECT producto_id, fecha, presentacion, origen, destino,
               precio_min, precio_max, precio_frec, obs
        FROM producto
        ORDER BY id
        """
    )
    rows = src_cur.fetchall()
    if not rows:
        print("⚠️  Postgres local sin filas en producto")
        src.close()
        dst.close()
        return 0

    dst_cur.execute("TRUNCATE producto RESTART IDENTITY")
    execute_batch(
        dst_cur,
        """
        INSERT INTO producto
            (producto_id, fecha, presentacion, origen, destino,
             precio_min, precio_max, precio_frec, obs)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        rows,
        page_size=BATCH,
    )
    dst.commit()

    src_cur.close()
    dst_cur.close()
    src.close()
    dst.close()
    print(f"✅ Postgres: {len(rows)} filas copiadas a Neon")
    return len(rows)


def _migrate_qdrant() -> int:
    """Copia colección sniim de Qdrant local a Qdrant Cloud."""
    collection = config.QDRANT_COLLECTION
    cloud = get_qdrant_client()

    if collection not in [c.name for c in LOCAL_QDRANT.get_collections().collections]:
        print(f"❌ Colección '{collection}' no existe en Qdrant local")
        sys.exit(1)

    info = LOCAL_QDRANT.get_collection(collection)
    vector_size = info.config.params.vectors.size
    total_local = info.points_count
    print(f"📦 Qdrant local: {total_local} puntos (dim={vector_size})")

    # Recrear colección en cloud para evitar duplicados del intento anterior
    if collection in [c.name for c in cloud.get_collections().collections]:
        cloud.delete_collection(collection)
    cloud.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )

    offset: Any = None
    copied = 0

    while True:
        points, offset = LOCAL_QDRANT.scroll(
            collection_name=collection,
            limit=BATCH,
            offset=offset,
            with_vectors=True,
            with_payload=True,
        )
        if not points:
            break

        batch = [
            PointStruct(id=p.id, vector=p.vector, payload=p.payload or {})
            for p in points
        ]
        cloud.upsert(collection_name=collection, points=batch)
        copied += len(batch)
        print(f"  {copied}/{total_local} ({copied / total_local * 100:.1f}%)")

        if offset is None:
            break

    print(f"✅ Qdrant: {copied} vectores copiados a Cloud")
    return copied


def main() -> None:
    if not config.QDRANT_URL or not config.QDRANT_API_KEY:
        print("❌ Configura QDRANT_URL y QDRANT_API_KEY en .env")
        sys.exit(1)

    print("🚀 Migración Docker local → Cloud")
    print(f"   Qdrant destino: {config.QDRANT_URL}")
    print(f"   Postgres destino: {config.POSTGRES_HOST}")

    pg_rows = _migrate_postgres()
    qdrant_points = _migrate_qdrant()

    print(f"\n🎉 Listo — Neon: {pg_rows} filas | Qdrant Cloud: {qdrant_points} puntos")


if __name__ == "__main__":
    main()
