import re
import unicodedata
import json
from typing import Any

import psycopg2
import psycopg2.extras
from langchain_community.callbacks import get_openai_callback
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

import config
from query_filters import build_query_filters, strip_client_metadata


DEFAULT_PRODUCTO_ID = "732"
DEFAULT_LIMIT = 10

KG_FACTOR_SQL = """
CASE
    WHEN LOWER(COALESCE(presentacion, '')) IN ('kg', 'kilogramo', 'kilogramo.')
    THEN 1.0
    WHEN LOWER(COALESCE(presentacion, '')) ~ '([0-9]+([,.][0-9]+)?)\\s*kg'
    THEN REPLACE(
        SUBSTRING(LOWER(presentacion) FROM '([0-9]+([,.][0-9]+)?)\\s*kg'),
        ',',
        '.'
    )::float
    ELSE NULL
END
"""

PRODUCTO_NORMALIZADO_CTE = f"""
WITH producto_base AS (
    SELECT
        *,
        {KG_FACTOR_SQL} AS factor_conversion
    FROM producto
    WHERE producto_id = %s
),
producto_norm AS (
    SELECT
        *,
        precio_min AS precio_min_original,
        precio_max AS precio_max_original,
        precio_frec AS precio_frec_original,
        CASE
            WHEN factor_conversion IS NOT NULL
            THEN ROUND((precio_min / factor_conversion)::numeric, 2)::float
            ELSE precio_min
        END AS precio_min_consulta,
        CASE
            WHEN factor_conversion IS NOT NULL
            THEN ROUND((precio_max / factor_conversion)::numeric, 2)::float
            ELSE precio_max
        END AS precio_max_consulta,
        CASE
            WHEN factor_conversion IS NOT NULL
            THEN ROUND((precio_frec / factor_conversion)::numeric, 2)::float
            ELSE precio_frec
        END AS precio_frec_consulta,
        CASE
            WHEN factor_conversion IS NOT NULL
            THEN 'MXN/kg'
            ELSE 'presentacion_original'
        END AS unidad_consulta
    FROM producto_base
)
"""

llm = ChatOpenAI(
    model=config.OPENAI_LLM_MODEL,
    api_key=config.OPENAI_API_KEY,
    temperature=0.2,
)

_SQL_SYNTHESIS_TEMPLATE = """Eres un analista de precios SNIIM.

Responde usando unicamente los resultados SQL proporcionados.
No inventes precios, fechas, mercados, unidades ni tendencias.
No recalcules metricas: usa los valores ya calculados en el JSON.
Si los datos no son suficientes, indicalo claramente.
Explica el resultado en lenguaje claro para un usuario no tecnico.
No atribuyas causas externas como oferta, demanda, clima o logística si no aparecen en los resultados SQL.

Reglas para operaciones híbridas:
- En market_comparison, si la pregunta pide "mejor comportamiento", separa criterios:
  menor precio promedio = mejor para precio bajo;
  menor volatilidad = más estable;
  variacion_pct más negativa = mayor caída del precio.
  Si los criterios apuntan a mercados distintos, no declares un único ganador absoluto.
- En market_monthly_trend, explica únicamente si los precios suben, bajan o se mantienen según los promedios mensuales.

Cuando aplique, menciona:
- metrica calculada
- mercado o destino
- fecha o periodo
- unidad reportada: MXN/kg si unidad es MXN/kg; si unidad es mixta, aclara que mezcla registros convertibles y registros en presentacion original
- numero de registros usados

OPERACION SQL:
{operation}

PREGUNTA ORIGINAL:
{question}

RESULTADOS SQL EN JSON:
{sql_results}

RESPUESTA:"""

_sql_synthesis_prompt = PromptTemplate(
    template=_SQL_SYNTHESIS_TEMPLATE,
    input_variables=["operation", "question", "sql_results"],
)
_sql_synthesis_chain = _sql_synthesis_prompt | llm | StrOutputParser()


def _connect():
    return psycopg2.connect(config.POSTGRES_DSN)


def _normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"\s+", " ", without_accents).strip()


def _extract_year(question: str) -> str | None:
    question = strip_client_metadata(question)
    match = re.search(r"\b(20\d{2}|19\d{2})\b", question)
    return match.group(1) if match else None


def _fetch_all(query: str, params: list[Any]) -> list[dict]:
    conn = _connect()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        return [_json_ready(dict(row)) for row in cur.fetchall()]
    finally:
        conn.close()


def _fetch_one(query: str, params: list[Any]) -> dict | None:
    rows = _fetch_all(query, params)
    return rows[0] if rows else None


def _json_ready(value):
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_ready(item) for item in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, float):
        return round(value, 2)
    return value


def _where_year(year: str | None) -> tuple[str, list[Any]]:
    if not year:
        return "", []
    return "AND substring(fecha from 7 for 4) = %s", [year]


def _like_pattern(term: str) -> str:
    escaped = (
        term
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    return f"%{escaped}%"


def _where_destino_terms(terms: list[str]) -> tuple[str, list[Any]]:
    if not terms:
        return "", []
    clauses = ["destino ILIKE %s ESCAPE '\\'" for _ in terms]
    return f"AND ({' OR '.join(clauses)})", [_like_pattern(term) for term in terms]


_MARKET_MATCH_STOPWORDS = {
    "cual",
    "cuanto",
    "cuanta",
    "cuantos",
    "cuantas",
    "precio",
    "precios",
    "mercado",
    "mercados",
    "central",
    "abasto",
    "abastos",
    "producto",
    "platano",
    "tabasco",
    "para",
    "desde",
    "donde",
    "tienes",
    "tener",
    "actual",
    "promedio",
    "frecuente",
    "minimo",
    "maximo",
    "registrado",
    "registros",
}


def _normalize_match_text(text: str) -> str:
    normalized = _normalize_text(text or "")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _match_tokens(text: str) -> set[str]:
    return {
        token
        for token in _normalize_match_text(text).split()
        if len(token) >= 4 and token not in _MARKET_MATCH_STOPWORDS
    }


def infer_market_terms_from_question(
    question: str,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    limit: int = 3,
) -> list[str]:
    """Detecta mercados/destinos reales de Postgres cuando no hay alias manual.

    Esto cubre consultas como "precio en Chetumal" o
    "precio del Mercado de Abasto Estrella", donde el alias no aparece en
    query_filters.py pero el destino sí existe en la tabla producto.
    """
    question_norm = _normalize_match_text(question)
    question_tokens = _match_tokens(question)
    if not question_norm or not question_tokens:
        return []

    rows = _fetch_all(
        """
        SELECT DISTINCT
            destino,
            TRIM(split_part(destino, ':', 1)) AS mercado
        FROM producto
        WHERE producto_id = %s
          AND destino IS NOT NULL
        """,
        [producto_id],
    )

    candidates: list[tuple[int, str]] = []
    for row in rows:
        destino = row.get("destino") or ""
        mercado = row.get("mercado") or ""
        destino_norm = _normalize_match_text(destino)
        mercado_norm = _normalize_match_text(mercado)
        destino_tokens = _match_tokens(destino)
        mercado_tokens = _match_tokens(mercado)

        score = 0
        term = destino
        if mercado_norm and mercado_norm in question_norm:
            score += 80
            term = mercado
        if destino_norm and destino_norm in question_norm:
            score += 120
            term = destino

        destino_overlap = question_tokens & destino_tokens
        mercado_overlap = question_tokens & mercado_tokens
        score += len(destino_overlap) * 20
        score += len(mercado_overlap) * 30

        if len(destino_overlap) == 1:
            token = next(iter(destino_overlap))
            if len(token) >= 6:
                score += 20
                term = token

        if score >= 20:
            candidates.append((score, term))

    selected: list[str] = []
    for _, term in sorted(candidates, key=lambda item: item[0], reverse=True):
        if term and term not in selected:
            selected.append(term)
        if len(selected) >= limit:
            break
    return selected


def get_average_price(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    market_terms: list[str] | None = None,
) -> dict:
    year_filter, year_params = _where_year(year)
    market_filter, market_params = _where_destino_terms(market_terms or [])
    row = _fetch_one(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            COUNT(*) AS registros,
            TO_CHAR(MIN(TO_DATE(fecha, 'DD/MM/YYYY')), 'DD/MM/YYYY') AS fecha_min,
            TO_CHAR(MAX(TO_DATE(fecha, 'DD/MM/YYYY')), 'DD/MM/YYYY') AS fecha_max,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE precio_frec_consulta IS NOT NULL
          {year_filter}
          {market_filter}
        """,
        [producto_id, *year_params, *market_params],
    )
    return row or {}


def get_max_price(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    market_terms: list[str] | None = None,
) -> dict:
    year_filter, year_params = _where_year(year)
    market_filter, market_params = _where_destino_terms(market_terms or [])
    row = _fetch_one(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            fecha,
            presentacion,
            origen,
            destino,
            precio_min_consulta AS precio_min,
            precio_max_consulta AS precio_max,
            precio_frec_consulta AS precio_frec,
            precio_min_original,
            precio_max_original,
            precio_frec_original,
            unidad_consulta AS unidad,
            factor_conversion,
            obs
        FROM producto_norm
        WHERE precio_max_consulta IS NOT NULL
          {year_filter}
          {market_filter}
        ORDER BY precio_max_consulta DESC, TO_DATE(fecha, 'DD/MM/YYYY') DESC
        LIMIT 1
        """,
        [producto_id, *year_params, *market_params],
    )
    return row or {}


def get_min_price(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    market_terms: list[str] | None = None,
) -> dict:
    year_filter, year_params = _where_year(year)
    market_filter, market_params = _where_destino_terms(market_terms or [])
    row = _fetch_one(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            fecha,
            presentacion,
            origen,
            destino,
            precio_min_consulta AS precio_min,
            precio_max_consulta AS precio_max,
            precio_frec_consulta AS precio_frec,
            precio_min_original,
            precio_max_original,
            precio_frec_original,
            unidad_consulta AS unidad,
            factor_conversion,
            obs
        FROM producto_norm
        WHERE precio_min_consulta IS NOT NULL
          {year_filter}
          {market_filter}
        ORDER BY precio_min_consulta ASC, TO_DATE(fecha, 'DD/MM/YYYY') DESC
        LIMIT 1
        """,
        [producto_id, *year_params, *market_params],
    )
    return row or {}


def get_market_ranking(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    limit: int = DEFAULT_LIMIT,
    market_terms: list[str] | None = None,
    direction: str = "desc",
) -> list[dict]:
    year_filter, year_params = _where_year(year)
    market_filter, market_params = _where_destino_terms(market_terms or [])
    safe_limit = max(1, min(limit, 50))
    order_direction = "ASC" if direction == "asc" else "DESC"
    return _fetch_all(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            TRIM(split_part(destino, ':', 1)) AS mercado,
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            ROUND(MIN(precio_min_consulta)::numeric, 2)::float AS precio_min,
            ROUND(MAX(precio_max_consulta)::numeric, 2)::float AS precio_max,
            COUNT(*) AS registros,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE destino IS NOT NULL
          AND precio_frec_consulta IS NOT NULL
          {year_filter}
          {market_filter}
        GROUP BY mercado
        ORDER BY precio_promedio {order_direction}
        LIMIT %s
        """,
        [producto_id, *year_params, *market_params, safe_limit],
    )


def get_market_list(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    limit: int = 50,
) -> list[dict]:
    year_filter, year_params = _where_year(year)
    safe_limit = max(1, min(limit, 100))
    return _fetch_all(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            TRIM(split_part(destino, ':', 1)) AS mercado,
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            COUNT(*) AS registros,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE destino IS NOT NULL
          AND precio_frec_consulta IS NOT NULL
          {year_filter}
        GROUP BY mercado
        ORDER BY mercado ASC
        LIMIT %s
        """,
        [producto_id, *year_params, safe_limit],
    )


def get_dataset_overview(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
) -> dict:
    year_filter, year_params = _where_year(year)
    row = _fetch_one(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            COUNT(*) AS registros,
            COUNT(DISTINCT TRIM(split_part(destino, ':', 1))) AS mercados,
            COUNT(DISTINCT destino) AS destinos,
            COUNT(DISTINCT origen) AS origenes,
            COUNT(DISTINCT presentacion) AS presentaciones,
            TO_CHAR(MIN(TO_DATE(fecha, 'DD/MM/YYYY')), 'DD/MM/YYYY') AS fecha_min,
            TO_CHAR(MAX(TO_DATE(fecha, 'DD/MM/YYYY')), 'DD/MM/YYYY') AS fecha_max,
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            ROUND(MIN(precio_min_consulta)::numeric, 2)::float AS precio_min,
            ROUND(MAX(precio_max_consulta)::numeric, 2)::float AS precio_max,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE precio_frec_consulta IS NOT NULL
          {year_filter}
        """,
        [producto_id, *year_params],
    )
    return row or {}


def get_market_explanation_context(
    market_term: str | None = None,
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    expensive: bool = True,
) -> list[dict]:
    year_filter, year_params = _where_year(year)
    target_cte = ""
    target_select = ""
    params: list[Any] = [producto_id, *year_params]

    if market_term:
        target_cte = """
        , target AS (
            SELECT mercado
            FROM ranked
            WHERE mercado ILIKE %s ESCAPE '\\'
            ORDER BY ranking ASC
            LIMIT 1
        )
        """
        target_select = "WHERE mercado = (SELECT mercado FROM target)"
        params.append(_like_pattern(market_term))
    else:
        target_select = "WHERE ranking = 1"

    order_direction = "DESC" if expensive else "ASC"
    return _fetch_all(
        f"""
        {PRODUCTO_NORMALIZADO_CTE},
        market_stats AS (
            SELECT
                TRIM(split_part(destino, ':', 1)) AS mercado,
                ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
                ROUND(MIN(precio_min_consulta)::numeric, 2)::float AS precio_min,
                ROUND(MAX(precio_max_consulta)::numeric, 2)::float AS precio_max,
                ROUND(STDDEV_POP(precio_frec_consulta)::numeric, 2)::float AS volatilidad,
                COUNT(*) AS registros,
                CASE
                    WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                    THEN 'MXN/kg'
                    ELSE 'mixta'
                END AS unidad
            FROM producto_norm
            WHERE destino IS NOT NULL
              AND precio_frec_consulta IS NOT NULL
              {year_filter}
            GROUP BY mercado
        ),
        ranked AS (
            SELECT
                *,
                RANK() OVER (ORDER BY precio_promedio {order_direction}) AS ranking,
                COUNT(*) OVER () AS total_mercados,
                ROUND(AVG(precio_promedio) OVER ()::numeric, 2)::float AS promedio_mercados
            FROM market_stats
        )
        {target_cte}
        SELECT *
        FROM ranked
        {target_select}
        """,
        params,
    )


def get_monthly_trend(
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
    market_terms: list[str] | None = None,
) -> list[dict]:
    year_filter, year_params = _where_year(year)
    market_filter, market_params = _where_destino_terms(market_terms or [])
    return _fetch_all(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            substring(fecha from 7 for 4) AS anio,
            substring(fecha from 4 for 2) AS mes,
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            ROUND(MIN(precio_min_consulta)::numeric, 2)::float AS precio_min,
            ROUND(MAX(precio_max_consulta)::numeric, 2)::float AS precio_max,
            COUNT(*) AS registros,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE precio_frec_consulta IS NOT NULL
          {year_filter}
          {market_filter}
        GROUP BY anio, mes
        ORDER BY anio, mes
        """,
        [producto_id, *year_params, *market_params],
    )


def compare_markets(
    market_terms: list[str],
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
) -> list[dict]:
    if len(market_terms) < 2:
        return []

    year_filter, year_params = _where_year(year)
    rows = []
    for term in market_terms:
        market_rows = _fetch_all(
            f"""
            {PRODUCTO_NORMALIZADO_CTE},
            base AS (
                SELECT
                    %s AS mercado_consultado,
                    fecha,
                    TO_DATE(fecha, 'DD/MM/YYYY') AS fecha_dt,
                    precio_min_consulta AS precio_min,
                    precio_max_consulta AS precio_max,
                    precio_frec_consulta AS precio_frec,
                    unidad_consulta
                FROM producto_norm
                WHERE destino ILIKE %s ESCAPE '\\'
                  AND precio_frec_consulta IS NOT NULL
                  {year_filter}
            ),
            ordered AS (
                SELECT
                    *,
                    FIRST_VALUE(precio_frec) OVER (
                        ORDER BY fecha_dt
                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                    ) AS primer_precio,
                    FIRST_VALUE(precio_frec) OVER (
                        ORDER BY fecha_dt DESC
                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                    ) AS ultimo_precio,
                    FIRST_VALUE(fecha) OVER (
                        ORDER BY fecha_dt
                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                    ) AS primera_fecha,
                    FIRST_VALUE(fecha) OVER (
                        ORDER BY fecha_dt DESC
                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                    ) AS ultima_fecha
                FROM base
            )
            SELECT
                mercado_consultado,
                ROUND(AVG(precio_frec)::numeric, 2)::float AS precio_promedio,
                ROUND(MIN(precio_min)::numeric, 2)::float AS precio_min,
                ROUND(MAX(precio_max)::numeric, 2)::float AS precio_max,
                ROUND(STDDEV_POP(precio_frec)::numeric, 2)::float AS volatilidad,
                MAX(primer_precio)::float AS primer_precio,
                MAX(ultimo_precio)::float AS ultimo_precio,
                MAX(primera_fecha) AS primera_fecha,
                MAX(ultima_fecha) AS ultima_fecha,
                CASE
                    WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                    THEN 'MXN/kg'
                    ELSE 'mixta'
                END AS unidad,
                ROUND(
                    CASE
                        WHEN MAX(primer_precio) IS NULL OR MAX(primer_precio) = 0
                        THEN NULL
                        ELSE ((MAX(ultimo_precio) - MAX(primer_precio)) / MAX(primer_precio) * 100)::numeric
                    END,
                    2
                )::float AS variacion_pct,
                COUNT(*) AS registros
            FROM ordered
            GROUP BY mercado_consultado
            """,
            [producto_id, term, _like_pattern(term), *year_params],
        )
        rows.extend(market_rows)

    return rows


def get_market_monthly_trend(
    market_term: str,
    year: str | None = None,
    producto_id: str = DEFAULT_PRODUCTO_ID,
) -> list[dict]:
    year_filter, year_params = _where_year(year)
    return _fetch_all(
        f"""
        {PRODUCTO_NORMALIZADO_CTE}
        SELECT
            %s AS mercado_consultado,
            substring(fecha from 7 for 4) AS anio,
            substring(fecha from 4 for 2) AS mes,
            ROUND(AVG(precio_frec_consulta)::numeric, 2)::float AS precio_promedio,
            ROUND(MIN(precio_min_consulta)::numeric, 2)::float AS precio_min,
            ROUND(MAX(precio_max_consulta)::numeric, 2)::float AS precio_max,
            COUNT(*) AS registros,
            CASE
                WHEN COUNT(*) FILTER (WHERE unidad_consulta <> 'MXN/kg') = 0
                THEN 'MXN/kg'
                ELSE 'mixta'
            END AS unidad
        FROM producto_norm
        WHERE destino ILIKE %s ESCAPE '\\'
          AND precio_frec_consulta IS NOT NULL
          {year_filter}
        GROUP BY anio, mes
        ORDER BY anio, mes
        """,
        [producto_id, market_term, _like_pattern(market_term), *year_params],
    )


def _select_operation(question: str) -> str:
    normalized = _normalize_text(question)
    asks_count = any(token in normalized for token in ["cuanto", "cuanta", "cuantos", "cuantas", "conteo", "total de"])
    if asks_count and "mercado" in normalized:
        return "count_markets"
    if asks_count and any(token in normalized for token in ["registro", "registros", "observacion", "observaciones", "datos"]):
        return "count_records"
    if any(token in normalized for token in ["que mercados", "cuales mercados", "lista de mercados", "mercados tienes"]):
        return "market_list"
    if any(token in normalized for token in ["resumen general", "datos tienes", "datos disponibles", "cobertura", "periodo cubierto"]):
        return "dataset_overview"
    if "ranking" in normalized:
        return "market_ranking"
    if "mercado" in normalized and any(
        token in normalized
        for token in ["mas caro", "mayor precio", "precio mas alto"]
    ):
        return "most_expensive_market"
    if "mercado" in normalized and any(
        token in normalized
        for token in ["mas barato", "mas barata", "menor precio", "precio mas bajo"]
    ):
        return "cheapest_market"
    if "tendencia" in normalized or "evolucion" in normalized:
        return "monthly_trend"
    if "maximo" in normalized or "precio mas alto" in normalized:
        return "max_price"
    if "minimo" in normalized or "precio mas bajo" in normalized:
        return "min_price"
    if "promedio" in normalized:
        return "average_price"
    return "average_price"


def _format_answer(operation: str, rows: list[dict], year: str | None) -> str:
    period = f" en {year}" if year else ""
    if not rows:
        return f"No hay datos suficientes en Postgres para responder la consulta{period}."

    if operation == "average_price":
        row = rows[0]
        unit = _unit_label(row)
        return (
            f"El precio frecuente promedio{period} fue "
            f"${row['precio_promedio']} {unit} con base en {row['registros']} registros."
        )

    if operation == "max_price":
        row = rows[0]
        unit = _unit_label(row)
        return (
            f"El precio maximo mas alto{period} fue ${row['precio_max']} {unit} en "
            f"{row['destino']} el {row['fecha']}. Precio frecuente: "
            f"${row['precio_frec']} {unit}."
        )

    if operation == "min_price":
        row = rows[0]
        unit = _unit_label(row)
        return (
            f"El precio minimo registrado{period} fue ${row['precio_min']} {unit} en "
            f"{row['destino']} el {row['fecha']}. Precio frecuente: "
            f"${row['precio_frec']} {unit}."
        )

    if operation == "market_ranking":
        lines = [
            f"{idx}. {row['mercado']}: ${row['precio_promedio']} {_unit_label(row)} promedio ({row['registros']} registros)"
            for idx, row in enumerate(rows[:5], start=1)
        ]
        return f"Ranking de mercados por precio promedio{period}:\n" + "\n".join(lines)

    if operation == "count_markets":
        row = rows[0]
        return (
            f"Tengo {row['mercados']} mercados{period}, agrupados a partir de "
            f"{row['destinos']} destinos completos y {row['registros']} registros."
        )

    if operation == "count_records":
        row = rows[0]
        return (
            f"Tengo {row['registros']} registros de precios{period}, cubriendo "
            f"{row['mercados']} mercados, {row['origenes']} origenes y "
            f"{row['presentaciones']} presentaciones."
        )

    if operation == "market_list":
        names = ", ".join(row["mercado"] for row in rows)
        return f"Los mercados disponibles{period} son: {names}."

    if operation == "dataset_overview":
        row = rows[0]
        return (
            f"El conjunto de datos{period} contiene {row['registros']} registros "
            f"entre {row['fecha_min']} y {row['fecha_max']}. Cubre "
            f"{row['mercados']} mercados, {row['origenes']} origenes y "
            f"{row['presentaciones']} presentaciones. El precio frecuente promedio "
            f"es ${row['precio_promedio']} {_unit_label(row)}, con rango observado "
            f"de ${row['precio_min']} a ${row['precio_max']}."
        )

    if operation == "most_expensive_market":
        row = rows[0]
        return (
            f"El mercado con precio promedio mas alto{period} fue {row['mercado']}: "
            f"${row['precio_promedio']} {_unit_label(row)} promedio, con rango "
            f"${row['precio_min']}-${row['precio_max']} y {row['registros']} registros."
        )

    if operation == "cheapest_market":
        row = rows[0]
        return (
            f"El mercado con precio promedio mas bajo{period} fue {row['mercado']}: "
            f"${row['precio_promedio']} {_unit_label(row)} promedio, con rango "
            f"${row['precio_min']}-${row['precio_max']} y {row['registros']} registros."
        )

    if operation == "monthly_trend":
        lines = [
            f"{row['anio']}-{row['mes']}: ${row['precio_promedio']} {_unit_label(row)} promedio ({row['registros']} registros)"
            for row in rows[:12]
        ]
        return f"Tendencia mensual{period}:\n" + "\n".join(lines)

    return "Consulta analitica ejecutada en Postgres."


def _unit_label(row: dict) -> str:
    unidad = row.get("unidad")
    if unidad == "MXN/kg":
        return "MXN/kg"
    if unidad == "mixta":
        return "(unidad mixta: MXN/kg cuando se pudo convertir y presentación original en los demás casos)"
    if unidad == "presentacion_original":
        return "por presentación original"
    return ""


def _synthesize_sql_answer(
    question: str,
    operation: str,
    rows: list[dict],
    fallback_answer: str,
) -> tuple[str, dict | None]:
    if not rows:
        return fallback_answer, None

    sql_results = json.dumps(rows, ensure_ascii=False, indent=2)
    try:
        with get_openai_callback() as cb:
            answer = _sql_synthesis_chain.invoke(
                {
                    "operation": operation,
                    "question": question,
                    "sql_results": sql_results,
                }
            )
        token_info = {
            "tokens_prompt": cb.prompt_tokens,
            "tokens_completion": cb.completion_tokens,
            "tokens_total": cb.total_tokens,
            "costo_usd": round(cb.total_cost, 6),
        }
        return answer, token_info
    except Exception as exc:
        print(f"Error sintetizando respuesta SQL con LLM: {exc}")
        return fallback_answer, None


def answer_analytic_question(
    question: str,
    producto_id: str = DEFAULT_PRODUCTO_ID,
) -> dict:
    year = _extract_year(question)
    operation = _select_operation(question)
    filters = build_query_filters(question, producto_id=producto_id)
    market_terms = filters.destino_terms or filters.origen_terms
    if not market_terms:
        market_terms = infer_market_terms_from_question(question, producto_id=producto_id)

    if operation == "average_price":
        result = get_average_price(
            year=year,
            producto_id=producto_id,
            market_terms=market_terms,
        )
        rows = [result] if result and result.get("registros") else []
    elif operation == "max_price":
        result = get_max_price(
            year=year,
            producto_id=producto_id,
            market_terms=market_terms,
        )
        rows = [result] if result else []
    elif operation == "min_price":
        result = get_min_price(
            year=year,
            producto_id=producto_id,
            market_terms=market_terms,
        )
        rows = [result] if result else []
    elif operation == "market_ranking":
        rows = get_market_ranking(
            year=year,
            producto_id=producto_id,
            market_terms=market_terms,
        )
    elif operation in {"count_markets", "count_records", "dataset_overview"}:
        result = get_dataset_overview(
            year=year,
            producto_id=producto_id,
        )
        rows = [result] if result and result.get("registros") else []
    elif operation == "market_list":
        rows = get_market_list(
            year=year,
            producto_id=producto_id,
        )
    elif operation == "most_expensive_market":
        rows = get_market_ranking(
            year=year,
            producto_id=producto_id,
            limit=1,
            market_terms=market_terms,
            direction="desc",
        )
    elif operation == "cheapest_market":
        rows = get_market_ranking(
            year=year,
            producto_id=producto_id,
            limit=1,
            market_terms=market_terms,
            direction="asc",
        )
    elif operation == "monthly_trend":
        rows = get_monthly_trend(
            year=year,
            producto_id=producto_id,
            market_terms=market_terms,
        )
    else:
        rows = []

    fallback_answer = _format_answer(operation, rows, year)
    if operation in {
        "most_expensive_market",
        "cheapest_market",
        "count_markets",
        "count_records",
        "dataset_overview",
        "market_list",
    }:
        answer, token_info = fallback_answer, None
    else:
        answer, token_info = _synthesize_sql_answer(
            question=question,
            operation=operation,
            rows=rows,
            fallback_answer=fallback_answer,
        )

    return {
        "respuesta": answer,
        "documentos": [
            {
                "source": "postgres",
                "type": "sql_result",
                "operation": operation,
                "year": year,
                "markets": market_terms,
                "rows": rows,
            }
        ],
        "tokens": token_info,
    }


def _select_hybrid_operation(question: str, market_terms: list[str]) -> str:
    normalized = _normalize_text(question)
    if any(token in normalized for token in ["por que", "porque", "a que se debe"]):
        return "market_explanation"
    if len(market_terms) >= 2 or any(
        token in normalized
        for token in ["compara", "comparar", "comparacion", "versus", " vs "]
    ):
        return "market_comparison"
    return "market_monthly_trend"


def _format_hybrid_answer(operation: str, rows: list[dict], market_terms: list[str]) -> str:
    if not rows:
        return "No hay datos suficientes en Postgres para responder la consulta híbrida."

    if operation == "market_explanation":
        row = rows[0]
        unit = _unit_label(row)
        difference = None
        if row.get("promedio_mercados") not in (None, 0):
            difference = round(row["precio_promedio"] - row["promedio_mercados"], 2)
        direction = "por arriba" if difference is not None and difference >= 0 else "por debajo"
        comparison = (
            f", {abs(difference)} {unit} {direction} del promedio entre mercados "
            f"(${row['promedio_mercados']} {unit})"
            if difference is not None
            else ""
        )
        return (
            f"Con los datos disponibles, {row['mercado']} ocupa el lugar "
            f"{row['ranking']} de {row['total_mercados']} por precio promedio. "
            f"Su promedio es ${row['precio_promedio']} {unit}{comparison}. "
            f"El rango observado va de ${row['precio_min']} a ${row['precio_max']} "
            f"y se calculó con {row['registros']} registros. "
            "No puedo atribuir la causa a oferta, demanda, clima o logística porque "
            "esas variables no están en los datos consultados."
        )

    if operation == "market_comparison":
        ordered = sorted(
            rows,
            key=lambda row: (
                row.get("precio_promedio") is None,
                row.get("precio_promedio") or 0,
                row.get("volatilidad") or 0,
            ),
        )
        best = ordered[0]
        lines = [
            (
                f"{row['mercado_consultado']}: promedio ${row['precio_promedio']}, "
                f"{_unit_label(row)}, variación {row['variacion_pct']}%, volatilidad {row['volatilidad']}, "
                f"{row['registros']} registros"
            )
            for row in rows
        ]
        return (
            "Comparación por mercado:\n"
            + "\n".join(lines)
            + f"\nMejor comportamiento bajo menor precio promedio: {best['mercado_consultado']}."
        )

    if operation == "market_monthly_trend":
        market = market_terms[0] if market_terms else rows[0].get("mercado_consultado")
        lines = [
            (
                f"{row['anio']}-{row['mes']}: promedio ${row['precio_promedio']} "
                f"{_unit_label(row)} ({row['registros']} registros)"
            )
            for row in rows[:12]
        ]
        return f"Tendencia mensual de {market}:\n" + "\n".join(lines)

    return "Consulta híbrida ejecutada en Postgres."


def answer_hybrid_question(
    question: str,
    producto_id: str = DEFAULT_PRODUCTO_ID,
) -> dict:
    filters = build_query_filters(question, producto_id=producto_id)
    year = _extract_year(question)
    market_terms = filters.destino_terms or filters.origen_terms
    if not market_terms:
        market_terms = infer_market_terms_from_question(question, producto_id=producto_id)
    operation = _select_hybrid_operation(question, market_terms)

    if operation == "market_explanation":
        normalized = _normalize_text(question)
        rows = get_market_explanation_context(
            market_term=market_terms[0] if market_terms else None,
            year=year,
            producto_id=producto_id,
            expensive=not any(token in normalized for token in ["barato", "barata", "menor precio"]),
        )
    elif operation == "market_comparison":
        rows = compare_markets(
            market_terms=market_terms,
            year=year,
            producto_id=producto_id,
        )
    elif market_terms:
        rows = get_market_monthly_trend(
            market_term=market_terms[0],
            year=year,
            producto_id=producto_id,
        )
    else:
        rows = get_monthly_trend(year=year, producto_id=producto_id)

    fallback_answer = _format_hybrid_answer(operation, rows, market_terms)
    if operation == "market_explanation":
        answer, token_info = fallback_answer, None
    else:
        answer, token_info = _synthesize_sql_answer(
            question=question,
            operation=operation,
            rows=rows,
            fallback_answer=fallback_answer,
        )

    return {
        "respuesta": answer,
        "documentos": [
            {
                "source": "postgres",
                "type": "hybrid_sql_result",
                "operation": operation,
                "year": year,
                "markets": market_terms,
                "rows": rows,
            }
        ],
        "tokens": token_info,
    }
