import json
import uuid
import psycopg2
import config
from pathlib import Path
from qdrant_client.models import Distance, VectorParams, PointStruct
from embeddings_factory import embeddings
from qdrant_client_factory import get_qdrant_client

# ── Conexiones ─────────────────────────────────────────
qdrant = get_qdrant_client()


def _pg_connect():
    return psycopg2.connect(config.POSTGRES_DSN)


BATCH_SIZE = 30


def build_contenido(record: dict) -> str:
    """Construye el texto que se embeddea para búsqueda vectorial."""
    return (
        f"Fecha: {record['Fecha']} | "
        f"Presentación: {record['Presentación']} | "
        f"Origen: {record['Origen']} | "
        f"Destino: {record['Destino']} | "
        f"Precio mínimo: {record['Precio Mín']} | "
        f"Precio máximo: {record['Precio Max']} | "
        f"Precio frecuente: {record['Precio Frec']}"
    )


def get_vector_size() -> int:
    """Detecta la dimensión del modelo de embeddings activo."""
    sample = embeddings.embed_query("test")
    return len(sample)


def ensure_qdrant_collection(vector_size: int) -> None:
    """Crea la colección en Qdrant si no existe."""
    existing = [c.name for c in qdrant.get_collections().collections]
    if config.QDRANT_COLLECTION not in existing:
        qdrant.create_collection(
            collection_name=config.QDRANT_COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        print(f"✅ Colección '{config.QDRANT_COLLECTION}' creada en Qdrant")
    else:
        print(f"ℹ️  Colección '{config.QDRANT_COLLECTION}' ya existe en Qdrant")


def index_file(json_path: Path, producto_id: str = "732") -> None:
    """
    Indexa un archivo JSON en Qdrant (vectores) y Postgres (registros crudos).

    Args:
        json_path: Ruta al archivo generado por el scraper.
        producto_id: ID SNIIM del producto (732 = plátano tabasco).
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total = len(data)
    print(f"📦 Total registros: {total} — archivo: {json_path.name}")

    vector_size = get_vector_size()
    ensure_qdrant_collection(vector_size)

    pg = _pg_connect()
    cur = pg.cursor()
    cur.execute("SELECT COUNT(*) FROM producto")
    start = cur.fetchone()[0]
    if start > 0:
        print(f"↪ Reanudando desde registro {start} ({start / total * 100:.1f}%)")

    for i in range(start, total, BATCH_SIZE):
        batch    = data[i: i + BATCH_SIZE]
        contenidos = [build_contenido(r) for r in batch]

        try:
            vectors = embeddings.embed_documents(contenidos)

            # ── Qdrant: vectores + payload ─────────────
            points = [
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "producto_id":  producto_id,
                        "fecha":        record["Fecha"],
                        "presentacion": record["Presentación"],
                        "origen":       record["Origen"],
                        "destino":      record["Destino"],
                        "precio_min":   float(record["Precio Mín"]),
                        "precio_max":   float(record["Precio Max"]),
                        "precio_frec":  float(record["Precio Frec"]),
                        "obs":          record.get("Obs.", ""),
                        "contenido":    contenido,
                    },
                )
                for record, contenido, vector in zip(batch, contenidos, vectors)
            ]
            qdrant.upsert(collection_name=config.QDRANT_COLLECTION, points=points)

            # ── Postgres: registros crudos ─────────────
            cur.executemany(
                """
                INSERT INTO producto
                    (producto_id, fecha, presentacion, origen, destino,
                     precio_min, precio_max, precio_frec, obs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        producto_id,
                        r["Fecha"],
                        r["Presentación"],
                        r["Origen"],
                        r["Destino"],
                        float(r["Precio Mín"]),
                        float(r["Precio Max"]),
                        float(r["Precio Frec"]),
                        r.get("Obs.", ""),
                    )
                    for r in batch
                ],
            )
            pg.commit()

            progreso = min(i + BATCH_SIZE, total)
            print(f"  {progreso}/{total} ({progreso / total * 100:.1f}%)")

        except Exception as e:
            try:
                pg.rollback()
            except psycopg2.InterfaceError:
                pass
            try:
                pg.close()
            except Exception:
                pass
            pg = _pg_connect()
            cur = pg.cursor()
            print(f"❌ Error en lote {i}: {e} — reconectado, reintenta con: python embed.py")

    cur.close()
    pg.close()
    cur2 = _pg_connect().cursor()
    cur2.execute("SELECT COUNT(*) FROM producto")
    inserted = cur2.fetchone()[0]
    cur2.connection.close()
    print(f"✅ Completado: {inserted}/{total} registros en Postgres (Qdrant actualizado en lotes)")


if __name__ == "__main__":
    index_file(config.DATA_DIR / "platano_tabasco.json", producto_id="732")
