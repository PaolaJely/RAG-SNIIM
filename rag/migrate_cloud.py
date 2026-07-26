"""
Migra datos indexados desde Docker local -> Qdrant Cloud.

No llama a OpenAI: copia vectores, payloads e ids ya existentes.

Uso (Docker local levantado: docker compose up -d):
    cd rag && python migrate_cloud.py

Opcionalmente tambien puede copiar Postgres local -> Neon:
    cd rag && python migrate_cloud.py --postgres --truncate-postgres
"""
from __future__ import annotations

import argparse
import sys
from typing import Any

import psycopg2
from psycopg2.extras import execute_batch
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

import config

# ── Origen: Docker local ─────────────────────────────────
LOCAL_QDRANT = QdrantClient(host="localhost", port=6333)
LOCAL_PG_DSN = (
    "host=localhost port=5432 dbname=sniim "
    "user=postgres password=postgres sslmode=disable"
)

BATCH = 100


def _cloud_qdrant() -> QdrantClient:
    if not config.QDRANT_URL or not config.QDRANT_API_KEY:
        print("❌ Configura QDRANT_URL y QDRANT_API_KEY en .env")
        sys.exit(1)
    return QdrantClient(url=config.QDRANT_URL, api_key=config.QDRANT_API_KEY)


def _collection_names(client: QdrantClient) -> list[str]:
    return [collection.name for collection in client.get_collections().collections]


def _migrate_postgres(*, truncate: bool) -> int:
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

    if truncate:
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
    cloud = _cloud_qdrant()

    if collection not in _collection_names(LOCAL_QDRANT):
        print(f"❌ Colección '{collection}' no existe en Qdrant local")
        sys.exit(1)

    info = LOCAL_QDRANT.get_collection(collection)
    total_local = info.points_count
    print(f"📦 Qdrant local: {total_local} puntos")

    if collection not in _collection_names(cloud):
        cloud.create_collection(
            collection_name=collection,
            vectors_config=info.config.params.vectors,
        )
        print(f"✅ Colección '{collection}' creada en Qdrant Cloud")

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
        percent = (copied / total_local * 100) if total_local else 100
        print(f"  {copied}/{total_local} ({percent:.1f}%)")

        if offset is None:
            break

    cloud_info = cloud.get_collection(collection)
    print(
        f"✅ Qdrant: {copied} vectores copiados a Cloud "
        f"({cloud_info.points_count} puntos actuales)"
    )
    return copied


def _recreate_cloud_collection() -> None:
    collection = config.QDRANT_COLLECTION
    cloud = _cloud_qdrant()
    info = LOCAL_QDRANT.get_collection(collection)

    if collection in _collection_names(cloud):
        cloud.delete_collection(collection)
        print(f"🧹 Colección '{collection}' eliminada en Qdrant Cloud")
    cloud.create_collection(
        collection_name=collection,
        vectors_config=info.config.params.vectors,
    )
    print(f"✅ Colección '{collection}' recreada en Qdrant Cloud")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copia Qdrant Docker local a Qdrant Cloud sin re-embeddear.",
    )
    parser.add_argument(
        "--recreate-qdrant",
        action="store_true",
        help="Borra y recrea la colección destino antes de copiar.",
    )
    parser.add_argument(
        "--postgres",
        action="store_true",
        help="También copia la tabla producto de Postgres local a Neon.",
    )
    parser.add_argument(
        "--truncate-postgres",
        action="store_true",
        help="Trunca la tabla producto destino antes de copiar. Solo aplica con --postgres.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    print("🚀 Migración Docker local -> Cloud")
    print(f"   Qdrant destino: {config.QDRANT_URL}")

    if args.recreate_qdrant:
        _recreate_cloud_collection()
    qdrant_points = _migrate_qdrant()

    pg_rows = None
    if args.postgres:
        print(f"   Postgres destino: {config.POSTGRES_HOST}")
        pg_rows = _migrate_postgres(truncate=args.truncate_postgres)

    if pg_rows is None:
        print(f"\n🎉 Listo — Qdrant Cloud: {qdrant_points} puntos copiados")
    else:
        print(f"\n🎉 Listo — Qdrant Cloud: {qdrant_points} puntos | Neon: {pg_rows} filas")


if __name__ == "__main__":
    main()
