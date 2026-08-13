import re
import unicodedata
from dataclasses import dataclass, field

from qdrant_client.models import FieldCondition, Filter, MatchText, MatchValue


MONTHS = {
    "enero": "01",
    "febrero": "02",
    "marzo": "03",
    "abril": "04",
    "mayo": "05",
    "junio": "06",
    "julio": "07",
    "agosto": "08",
    "septiembre": "09",
    "setiembre": "09",
    "octubre": "10",
    "noviembre": "11",
    "diciembre": "12",
}

DESTINATION_ALIASES = {
    "aguascalientes": "Aguascalientes",
    "chihuahua": "Chihuahua",
    "coahuila": "Coahuila",
    "durango": "Durango",
    "hidalgo": "Hidalgo",
    "pachuca": "Pachuca",
    "jalisco": "Jalisco",
    "guadalajara": "Guadalajara",
    "mexico": "México",
    "edomex": "México",
    "estado de mexico": "México",
    "cdmx": "DF",
    "ciudad de mexico": "DF",
    "df": "DF",
    "michoacan": "Michoacán",
    "morelia": "Morelia",
    "morelos": "Morelos",
    "nuevo leon": "Nuevo León",
    "monterrey": "Nuevo León",
    "puebla": "Puebla",
    "queretaro": "Querétaro",
    "quintana roo": "Quintana Roo",
    "san luis potosi": "San Luis Potosí",
    "sonora": "Sonora",
    "hermosillo": "Hermosillo",
    "tabasco": "Tabasco",
    "villahermosa": "Villahermosa",
    "tamaulipas": "Tamaulipas",
    "tampico": "Tampico",
    "veracruz": "Veracruz",
    "baja california": "Baja California",
    "tijuana": "Tijuana",
}


def strip_client_metadata(text: str) -> str:
    """Remove UI-only metadata appended to chat questions."""
    return re.sub(
        r"\s*\(fecha actual:\s*\d{1,2}/\d{1,2}/\d{4}\)\s*$",
        "",
        text or "",
        flags=re.IGNORECASE,
    ).strip()


@dataclass
class QueryFilters:
    qdrant_filter: Filter | None
    destino_terms: list[str] = field(default_factory=list)
    origen_terms: list[str] = field(default_factory=list)
    fecha_text: str | None = None
    anio: str | None = None
    mes: str | None = None
    presentacion_text: str | None = None
    temporal: bool = False
    comparative: bool = False


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"\s+", " ", without_accents).strip()


def _extract_date_filter(question: str) -> tuple[str | None, str | None, str | None, bool]:
    question = strip_client_metadata(question)
    normalized = normalize_text(question)
    exact_date = re.search(r"\b(\d{2}/\d{2}/\d{4})\b", question)
    if exact_date:
        return exact_date.group(1), None, None, True

    year_match = re.search(r"\b(20\d{2}|19\d{2})\b", normalized)
    year = year_match.group(1) if year_match else None
    month = None
    for month_name, month_number in MONTHS.items():
        if month_name in normalized:
            month = month_number
            break

    numeric_month = re.search(r"\bmes\s+(\d{1,2})\b", normalized)
    if numeric_month:
        month_value = int(numeric_month.group(1))
        if 1 <= month_value <= 12:
            month = f"{month_value:02d}"

    if year:
        return None, year, month, True
    if month:
        return None, None, month, True
    return None, None, None, False


def _extract_presentation_filter(question: str) -> str | None:
    question = strip_client_metadata(question)
    normalized = normalize_text(question)
    kg_match = re.search(r"(caja|arpilla|costal|rollo|manojo)\s+de\s+(\d+)\s*kg", normalized)
    if kg_match:
        container = kg_match.group(1).capitalize()
        weight = kg_match.group(2)
        return f"{container} de {weight} kg"
    if "kilogramo" in normalized or re.search(r"\bkg\b", normalized):
        return "Kilogramo"
    return None


def _extract_market_terms(question: str) -> tuple[list[str], list[str]]:
    question = strip_client_metadata(question)
    normalized = normalize_text(question)
    destino_terms: list[str] = []
    origen_terms: list[str] = []
    origin_context = any(
        token in normalized
        for token in ["origen", "desde", "producido", "produce", "productor"]
    )

    for alias, term in DESTINATION_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", normalized):
            target = origen_terms if origin_context else destino_terms
            if term not in target:
                target.append(term)

    return destino_terms, origen_terms


def build_query_filters(question: str, producto_id: str | None = None) -> QueryFilters:
    must: list[FieldCondition] = []
    should: list[FieldCondition] = []

    if producto_id:
        must.append(FieldCondition(key="producto_id", match=MatchValue(value=producto_id)))

    fecha_text, anio, mes, temporal = _extract_date_filter(question)
    if fecha_text:
        must.append(FieldCondition(key="fecha", match=MatchText(text=fecha_text)))
    if anio:
        must.append(FieldCondition(key="anio", match=MatchValue(value=anio)))
    if mes:
        must.append(FieldCondition(key="mes", match=MatchValue(value=mes)))

    presentacion_text = _extract_presentation_filter(question)
    if presentacion_text:
        must.append(
            FieldCondition(key="presentacion", match=MatchText(text=presentacion_text))
        )

    destino_terms, origen_terms = _extract_market_terms(question)
    for term in destino_terms:
        should.append(FieldCondition(key="destino", match=MatchText(text=term)))
    for term in origen_terms:
        should.append(FieldCondition(key="origen", match=MatchText(text=term)))

    comparative = len(destino_terms) + len(origen_terms) > 1 or any(
        token in normalize_text(question)
        for token in ["compara", "comparar", "comparacion", "versus", " vs "]
    )

    qdrant_filter = Filter(must=must or None, should=should or None)
    if not must and not should:
        qdrant_filter = None

    return QueryFilters(
        qdrant_filter=qdrant_filter,
        destino_terms=destino_terms,
        origen_terms=origen_terms,
        fecha_text=fecha_text,
        anio=anio,
        mes=mes,
        presentacion_text=presentacion_text,
        temporal=temporal,
        comparative=comparative,
    )
