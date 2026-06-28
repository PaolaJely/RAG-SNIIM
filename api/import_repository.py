from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path
from typing import Any

import psycopg2.extras

import config


SCHEMA_PATH = Path(__file__).resolve().parent / "sql" / "002_imports.sql"
_schema_ready = False
_schema_lock = threading.Lock()


def _connect():
    return psycopg2.connect(config.POSTGRES_DSN)


def ensure_import_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    with _schema_lock:
        if _schema_ready:
            return
        connection = _connect()
        try:
            with connection.cursor() as cursor:
                cursor.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
            connection.commit()
            _schema_ready = True
        finally:
            connection.close()


def create_import_batch(
    content: bytes,
    preview: dict[str, Any],
    agent_used: bool = False,
    agent_output: dict[str, Any] | None = None,
) -> int:
    summary = preview["summary"]
    metadata = preview["metadata"]
    status = "needs_review" if summary["error_rows"] else "analyzed"
    digest = hashlib.sha256(content).hexdigest()

    connection = _connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO import_batch (
                    filename, file_sha256, source_sheet, source_format, status,
                    producer_name, municipality, currency, package_weight_kg,
                    detected_metadata, agent_used, agent_output,
                    total_rows, valid_rows, warning_rows, error_rows
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s::jsonb, %s, %s::jsonb, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    preview["filename"],
                    digest,
                    preview["sheet"],
                    preview["format"],
                    status,
                    metadata["producer_name"],
                    metadata.get("municipality"),
                    metadata.get("currency", "MXN"),
                    metadata.get("package_weight_kg"),
                    json.dumps(metadata, ensure_ascii=False),
                    agent_used,
                    json.dumps(agent_output, ensure_ascii=False) if agent_output else None,
                    summary["total_rows"],
                    summary["valid_rows"],
                    summary["warning_rows"],
                    summary["error_rows"],
                ),
            )
            batch_id = cursor.fetchone()[0]

            issues_by_row: dict[tuple[int, int | None], list[dict[str, Any]]] = {}
            for issue in preview["issues"]:
                key = (issue["row"], issue.get("source_year_block"))
                issues_by_row.setdefault(key, []).append(issue)

            values = []
            for row in preview.get("_all_rows", preview["rows"]):
                key = (row["source_row"], row.get("source_year_block"))
                values.append((
                    batch_id,
                    row["source_row"],
                    row.get("source_year_block"),
                    row.get("record_date"),
                    row.get("iso_week"),
                    row.get("month"),
                    row.get("product_name"),
                    row.get("quality"),
                    row.get("presentation"),
                    row.get("price"),
                    row.get("currency", "MXN"),
                    row["status"],
                    row["status"] != "error",
                    json.dumps(issues_by_row.get(key, []), ensure_ascii=False),
                    json.dumps(row, ensure_ascii=False),
                ))
            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO import_row_staging (
                    batch_id, source_row, source_year_block, record_date,
                    iso_week, month, product_name, quality, presentation,
                    price, currency, row_status, included, issues, raw_data
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s::jsonb, %s::jsonb
                )
                """,
                values,
                page_size=200,
            )
        connection.commit()
        return batch_id
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_import_batch(batch_id: int) -> dict[str, Any] | None:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM import_batch WHERE id = %s", (batch_id,))
            batch = cursor.fetchone()
            if not batch:
                return None
            cursor.execute(
                """
                SELECT id, source_row, source_year_block, record_date, iso_week,
                       month, product_name, quality, presentation, price,
                       currency, row_status, included, issues
                FROM import_row_staging
                WHERE batch_id = %s
                ORDER BY COALESCE(source_year_block, 0), source_row, id
                """,
                (batch_id,),
            )
            rows = [dict(row) for row in cursor.fetchall()]
            result = dict(batch)
            result["rows"] = rows
            return result
    finally:
        connection.close()


def list_import_batches(limit: int = 20) -> list[dict[str, Any]]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, filename, status, producer_name, municipality,
                       total_rows, valid_rows, warning_rows, error_rows,
                       agent_used, created_at, imported_at
                FROM import_batch
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def get_column_mapping(source_key: str) -> dict[str, str] | None:
    connection = _connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT mapping FROM import_column_mapping WHERE source_key = %s",
                (source_key,),
            )
            row = cursor.fetchone()
            return row[0] if row else None
    finally:
        connection.close()


def save_column_mapping(
    source_key: str,
    source_columns: list[str],
    mapping: dict[str, str],
    confidence: float | None,
) -> None:
    connection = _connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO import_column_mapping (
                    source_key, source_columns, mapping, confidence
                )
                VALUES (%s, %s::jsonb, %s::jsonb, %s)
                ON CONFLICT (source_key)
                DO UPDATE SET
                    source_columns = EXCLUDED.source_columns,
                    mapping = EXCLUDED.mapping,
                    confidence = EXCLUDED.confidence
                """,
                (
                    source_key,
                    json.dumps(source_columns, ensure_ascii=False),
                    json.dumps(mapping, ensure_ascii=False),
                    confidence,
                ),
            )
        connection.commit()
    finally:
        connection.close()


def approve_import_batch(batch_id: int, exclude_errors: bool = False) -> dict[str, Any]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(
                "SELECT * FROM import_batch WHERE id = %s FOR UPDATE",
                (batch_id,),
            )
            batch = cursor.fetchone()
            if not batch:
                raise LookupError("Lote no encontrado.")
            if batch["status"] == "imported":
                raise ValueError("El lote ya fue importado.")
            if batch["error_rows"] and not exclude_errors:
                raise ValueError(
                    "El lote contiene errores. Corrígelos o exclúyelos para continuar."
                )

            cursor.execute(
                """
                INSERT INTO local_producer (name, municipality)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                RETURNING id
                """,
                (batch["producer_name"], batch["municipality"]),
            )
            inserted_producer = cursor.fetchone()
            if inserted_producer:
                producer_id = inserted_producer["id"]
            else:
                cursor.execute(
                    """
                    SELECT id
                    FROM local_producer
                    WHERE LOWER(name) = LOWER(%s)
                      AND LOWER(COALESCE(municipality, '')) =
                          LOWER(COALESCE(%s, ''))
                    """,
                    (batch["producer_name"], batch["municipality"]),
                )
                producer_id = cursor.fetchone()["id"]

            cursor.execute(
                """
                INSERT INTO producer_price (
                    producer_id, record_date, product_name, quality,
                    presentation, package_weight_kg, price, currency,
                    source_batch_id, source_row, source_year_block
                )
                SELECT
                    %s, record_date, product_name, quality, presentation,
                    %s, price, currency, batch_id, source_row, source_year_block
                FROM import_row_staging
                WHERE batch_id = %s
                  AND included = TRUE
                  AND row_status <> 'error'
                  AND record_date IS NOT NULL
                  AND product_name IS NOT NULL
                  AND price > 0
                ON CONFLICT DO NOTHING
                """,
                (producer_id, batch["package_weight_kg"], batch_id),
            )
            imported_rows = cursor.rowcount

            cursor.execute(
                """
                UPDATE import_batch
                SET status = 'imported',
                    approved_at = NOW(),
                    imported_at = NOW()
                WHERE id = %s
                """,
                (batch_id,),
            )
        connection.commit()
        return {
            "batch_id": batch_id,
            "producer_id": producer_id,
            "imported_rows": imported_rows,
            "excluded_error_rows": batch["error_rows"] if exclude_errors else 0,
            "status": "imported",
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
