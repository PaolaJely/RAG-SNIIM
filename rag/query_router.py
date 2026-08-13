import re
import unicodedata


ANALYTIC_PATTERNS = [
    "cuanto",
    "cuanta",
    "cuantos",
    "cuantas",
    "conteo",
    "total de",
    "resumen general",
    "datos tienes",
    "que mercados",
    "cuales mercados",
    "precio de",
    "precio del",
    "precio en",
    "precio para",
    "cuanto cuesta",
    "cuesta",
    "a como",
    "promedio",
    "maximo",
    "minimo",
    "precio mas alto",
    "precio mas bajo",
    "mas caro",
    "mas barata",
    "mas barato",
    "menor precio",
    "mayor precio",
    "ranking",
    "tendencia",
    "evolucion",
    "variacion",
    "volatilidad",
    "comportamiento mensual",
    "comportamiento anual",
]

HYBRID_PATTERNS = [
    "por que",
    "porque",
    "a que se debe",
    "compara",
    "comparar",
    "comparacion",
    "analiza",
    "analizar",
    "explica la tendencia",
    "cual tuvo mejor comportamiento",
]

VECTOR_PATTERNS = [
    "que informacion hay",
    "que registros existen",
    "explicame los datos disponibles",
]


def _normalize_text(text: str) -> str:
    """Lowercase text and strip accents for stable keyword matching."""
    normalized = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"\s+", " ", without_accents).strip()


def _find_pattern(question: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        if pattern in question:
            return pattern
    return None


def classify_query_intent(question: str) -> dict:
    normalized = _normalize_text(question)

    if not normalized:
        return {
            "intent": "vectorial_rag",
            "reason": "La pregunta está vacía o no contiene términos analizables.",
            "confidence": 0.5,
        }

    hybrid_match = _find_pattern(normalized, HYBRID_PATTERNS)
    analytic_match = _find_pattern(normalized, ANALYTIC_PATTERNS)
    vector_match = _find_pattern(normalized, VECTOR_PATTERNS)

    if hybrid_match and (analytic_match or "comportamiento" in normalized):
        return {
            "intent": "hibrida",
            "reason": f"La pregunta combina comparación o explicación con análisis: '{hybrid_match}'.",
            "confidence": 0.85,
        }

    if hybrid_match:
        return {
            "intent": "hibrida",
            "reason": f"La pregunta solicita comparación o análisis: '{hybrid_match}'.",
            "confidence": 0.8,
        }

    if analytic_match:
        return {
            "intent": "analitica_sql",
            "reason": f"La pregunta solicita un cálculo o métrica: '{analytic_match}'.",
            "confidence": 0.85,
        }

    if vector_match:
        return {
            "intent": "vectorial_rag",
            "reason": f"La pregunta solicita búsqueda general de registros: '{vector_match}'.",
            "confidence": 0.85,
        }

    return {
        "intent": "vectorial_rag",
        "reason": "No se detectaron términos analíticos; se usa búsqueda vectorial general.",
        "confidence": 0.65,
    }
