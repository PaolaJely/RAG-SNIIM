import argparse
import json
import hashlib
import re
import uuid
import psycopg2
import config
from pathlib import Path
from qdrant_client.models import (
    Distance,
    FloatIndexParams,
    FloatIndexType,
    KeywordIndexParams,
    KeywordIndexType,
    PointStruct,
    TextIndexParams,
    TextIndexType,
    TokenizerType,
    VectorParams,
)
from embeddings_factory import embeddings
from qdrant_client_factory import get_qdrant_client

import re
from datetime import date

# ── Conexiones ─────────────────────────────────────────
qdrant = get_qdrant_client()


def _pg_connect():
    return psycopg2.connect(config.POSTGRES_DSN)


BATCH_SIZE = 30


TEXT_INDEX = TextIndexParams(
    type=TextIndexType.TEXT,
    tokenizer=TokenizerType.WORD,
    lowercase=True,
    ascii_folding=True,
)

KEYWORD_INDEX = KeywordIndexParams(type=KeywordIndexType.KEYWORD)
FLOAT_INDEX = FloatIndexParams(type=FloatIndexType.FLOAT)

PAYLOAD_INDEXES = {
    "producto_id": KEYWORD_INDEX,
    "record_hash": KEYWORD_INDEX,
    "anio": KEYWORD_INDEX,
    "mes": KEYWORD_INDEX,
    "unidad_normalizada": KEYWORD_INDEX,
    "fecha": TEXT_INDEX,
    "origen": TEXT_INDEX,
    "destino": TEXT_INDEX,
    "presentacion": TEXT_INDEX,
    "presentacion_original": TEXT_INDEX,
    "precio_min": FLOAT_INDEX,
    "precio_max": FLOAT_INDEX,
    "precio_frec": FLOAT_INDEX,
    "precio_min_kg": FLOAT_INDEX,
    "precio_max_kg": FLOAT_INDEX,
    "precio_frec_kg": FLOAT_INDEX,
}


def parse_presentation_factor(presentacion: str) -> float | None:
    """Return kg per presentation when it is explicit and safe to convert."""
    if not presentacion:
        return None

    normalized = presentacion.strip().lower()
    if normalized in {"kg", "kilogramo", "kilogramo."}:
        return 1.0

    match = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", normalized)
    if not match:
        return None

    factor = float(match.group(1).replace(",", "."))
    return factor if factor > 0 else None


def normalize_price(value: float | None, factor: float | None) -> float | None:
    if value is None or factor is None:
        return None
    return round(value / factor, 2)


def build_price_payload(record: dict) -> dict:
    presentacion = record["Presentación"]
    precio_min = float(record["Precio Mín"])
    precio_max = float(record["Precio Max"])
    precio_frec = float(record["Precio Frec"])
    factor = parse_presentation_factor(presentacion)

    return {
        # Campos existentes: se conservan como precios crudos por presentación.
        "presentacion": presentacion,
        "precio_min": precio_min,
        "precio_max": precio_max,
        "precio_frec": precio_frec,
        # Campos explícitos para evitar ambigüedad de unidad en el RAG.
        "presentacion_original": presentacion,
        "precio_min_original": precio_min,
        "precio_max_original": precio_max,
        "precio_frec_original": precio_frec,
        "precio_min_kg": normalize_price(precio_min, factor),
        "precio_max_kg": normalize_price(precio_max, factor),
        "precio_frec_kg": normalize_price(precio_frec, factor),
        "unidad_normalizada": "MXN/kg" if factor else "presentacion_original",
        "factor_conversion": factor,
    }


def build_record_hash(record: dict, producto_id: str) -> str:
    key = "|".join([
        producto_id,
        str(record.get("Fecha", "")),
        str(record.get("Origen", "")),
        str(record.get("Destino", "")),
        str(record.get("Presentación", "")),
        str(record.get("Precio Mín", "")),
        str(record.get("Precio Max", "")),
        str(record.get("Precio Frec", "")),
    ])
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def build_date_payload(fecha: str) -> dict:
    parts = (fecha or "").split("/")
    if len(parts) != 3:
        return {"anio": None, "mes": None}
    return {"anio": parts[2] or None, "mes": parts[1] or None}


def build_point_id(record_hash: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, record_hash))


def build_contenido(record: dict) -> str:
    """Construye el texto que se embeddea para búsqueda vectorial."""
    price_payload = build_price_payload(record)
    if price_payload["factor_conversion"]:
        unidad = (
            "Precio frecuente normalizado: "
            f"{price_payload['precio_frec_kg']} MXN/kg"
        )
    else:
        unidad = (
            "Precio frecuente en presentación original: "
            f"{price_payload['precio_frec_original']} por {record['Presentación']}"
        )

    return (
        f"Fecha: {record['Fecha']} | "
        f"Presentación: {record['Presentación']} | "
        f"Origen: {record['Origen']} | "
        f"Destino: {record['Destino']} | "
        f"Precio mínimo: {record['Precio Mín']} | "
        f"Precio máximo: {record['Precio Max']} | "
        f"Precio frecuente: {record['Precio Frec']} | "
        f"{unidad}"
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


def recreate_qdrant_collection(vector_size: int) -> None:
    existing = [c.name for c in qdrant.get_collections().collections]
    if config.QDRANT_COLLECTION in existing:
        qdrant.delete_collection(collection_name=config.QDRANT_COLLECTION)
        print(f"🗑️  Colección '{config.QDRANT_COLLECTION}' eliminada de Qdrant")
    qdrant.create_collection(
        collection_name=config.QDRANT_COLLECTION,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )
    print(f"✅ Colección '{config.QDRANT_COLLECTION}' recreada en Qdrant")


def ensure_qdrant_payload_indexes() -> None:
    """Crea índices de payload usados por los filtros estructurados del RAG."""
    collection = qdrant.get_collection(config.QDRANT_COLLECTION)
    existing_indexes = set((collection.payload_schema or {}).keys())

    created = 0
    skipped = 0
    for field_name, field_schema in PAYLOAD_INDEXES.items():
        if field_name in existing_indexes:
            skipped += 1
            continue
        try:
            qdrant.create_payload_index(
                collection_name=config.QDRANT_COLLECTION,
                field_name=field_name,
                field_schema=field_schema,
                wait=True,
            )
            created += 1
            print(f"   Índice Qdrant creado: {field_name}")
        except Exception as exc:
            message = str(exc).lower()
            if "already exists" in message or "already has" in message:
                skipped += 1
                continue
            raise

    print(
        "✅ Índices de payload Qdrant listos "
        f"(creados: {created}, existentes: {skipped})"
    )


def parse_precio(price_str: str) -> float:
    """Extrae el primer precio numérico del texto."""
    numeros = re.findall(r"[\d]+(?:[.,]\d+)?", price_str.replace(",", ""))
    return float(numeros[0]) if numeros else 0.0

def convertir_stagehand(data: list[dict]) -> list[dict]:
    """
    Convierte el JSON de Stagehand al formato que espera embed.py.
    """
    hoy = date.today().strftime("%d/%m/%Y")
    resultado = []
    for item in data:
        resultado.append({
            "Fecha":        hoy,
            "Origen": f"Minorista - {item.get('marketplace', '')}",
            "Destino": f"Minorista - {item.get('marketplace', '')}",
            "Presentación": "Kilogramo",
            "Precio Mín":   str(parse_precio(item.get("price", "0"))),
            "Precio Max":   str(parse_precio(item.get("price", "0"))),
            "Precio Frec":  str(parse_precio(item.get("price", "0"))),
            "Obs.": f"Precio de {item.get('productName', 'plátano Tabasco')} en tienda en línea {item.get('marketplace', '')}",
        })
    return resultado

def index_file(
    json_path: Path,
    producto_id: str = "732",
    recreate_qdrant: bool = False,
) -> None:
    """
    Indexa un archivo JSON en Qdrant (vectores) y Postgres (registros crudos).

    Args:
        json_path: Ruta al archivo generado por el scraper.
        producto_id: ID SNIIM del producto (732 = plátano tabasco).
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        if data and "productName" in data[0]:
            data = convertir_stagehand(data)


    total = len(data)
    print(f"📦 Total registros: {total} — archivo: {json_path.name}")

    vector_size = get_vector_size()
    if recreate_qdrant:
        recreate_qdrant_collection(vector_size)
    else:
        ensure_qdrant_collection(vector_size)
    ensure_qdrant_payload_indexes()

    pg = _pg_connect()
    cur = pg.cursor()

    processed = 0
    qdrant_upserts = 0
    pg_inserted = 0
    duplicates = 0
    errors = 0
    seen_hashes: set[str] = set()

    for i in range(0, total, BATCH_SIZE):
        raw_batch = data[i: i + BATCH_SIZE]
        batch = []
        for record in raw_batch:
            record_hash = build_record_hash(record, producto_id)
            if record_hash in seen_hashes:
                duplicates += 1
                continue
            seen_hashes.add(record_hash)
            batch.append((record, record_hash))

        processed += len(raw_batch)
        if not batch:
            print(f"  {min(i + BATCH_SIZE, total)}/{total} — lote duplicado omitido")
            continue

        records = [record for record, _ in batch]
        contenidos = [build_contenido(record) for record in records]

        try:
            vectors = embeddings.embed_documents(contenidos)

            # ── Qdrant: vectores + payload ─────────────
            points = [
                PointStruct(
                    id=build_point_id(record_hash),
                    vector=vector,
                    payload={
                        "producto_id":  producto_id,
                        "fecha":        record["Fecha"],
                        **build_date_payload(record["Fecha"]),
                        "origen":       record["Origen"],
                        "destino":      record["Destino"],
                        **build_price_payload(record),
                        "record_hash":  record_hash,
                        "obs":          record.get("Obs.", ""),
                        "contenido":    contenido,
                    },
                )
                for (record, record_hash), contenido, vector
                in zip(batch, contenidos, vectors)
            ]
            qdrant.upsert(collection_name=config.QDRANT_COLLECTION, points=points)
            qdrant_upserts += len(points)

            # ── Postgres: registros crudos ─────────────
            cur.executemany(
                """
                INSERT INTO producto
                    (producto_id, fecha, presentacion, origen, destino,
                     precio_min, precio_max, precio_frec, obs)
                SELECT %s, %s, %s, %s, %s, %s, %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM producto
                    WHERE producto_id = %s
                      AND fecha = %s
                      AND COALESCE(presentacion, '') = COALESCE(%s, '')
                      AND COALESCE(origen, '') = COALESCE(%s, '')
                      AND COALESCE(destino, '') = COALESCE(%s, '')
                      AND precio_min IS NOT DISTINCT FROM %s
                      AND precio_max IS NOT DISTINCT FROM %s
                      AND precio_frec IS NOT DISTINCT FROM %s
                )
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
                        producto_id,
                        r["Fecha"],
                        r["Presentación"],
                        r["Origen"],
                        r["Destino"],
                        float(r["Precio Mín"]),
                        float(r["Precio Max"]),
                        float(r["Precio Frec"]),
                    )
                    for r in records
                ],
            )
            if cur.rowcount and cur.rowcount > 0:
                pg_inserted += cur.rowcount
            pg.commit()

            progreso = min(i + BATCH_SIZE, total)
            print(f"  {progreso}/{total} ({progreso / total * 100:.1f}%)")

        except Exception as e:
            errors += 1
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
    pg_skipped = qdrant_upserts - pg_inserted
    print("✅ Ingesta completada")
    print(f"   Registros procesados: {processed}")
    print(f"   Qdrant upserts: {qdrant_upserts}")
    print(f"   Postgres insertados: {pg_inserted}")
    print(f"   Postgres omitidos por duplicado: {max(pg_skipped, 0)}")
    print(f"   Duplicados omitidos en archivo: {duplicates}")
    print(f"   Errores de lote: {errors}")
    print(f"   Total actual en Postgres: {inserted}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Indexa datos SNIIM en Qdrant y Postgres."
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=config.DATA_DIR / "results.json",
        help="Ruta del JSON generado por el scraper.",
    )
    parser.add_argument(
        "--producto-id",
        default="732",
        help="ID SNIIM del producto.",
    )
    parser.add_argument(
        "--recreate-qdrant",
        action="store_true",
        help="Elimina y recrea la colección Qdrant antes de indexar.",
    )
    args = parser.parse_args()
    index_file(
        args.json,
        producto_id=args.producto_id,
        recreate_qdrant=args.recreate_qdrant,
    )
