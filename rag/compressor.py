# === COMPRESSOR — Serialización TOON para reducir tokens de contexto ===

CAMPOS_TOON = [
    "fecha",
    "origen",
    "destino",
    "presentacion",
    "precio_min",
    "precio_max",
    "precio_frec",
    "presentacion_original",
    "precio_min_original",
    "precio_max_original",
    "precio_frec_original",
    "precio_min_kg",
    "precio_max_kg",
    "precio_frec_kg",
    "unidad_normalizada",
    "factor_conversion",
    "obs",
]

_SEP_CAMPO = "|"
_SEP_REGISTRO = "\n"


def formatear_contexto_toon(documentos: list[dict]) -> str:
    """Serializa documentos en formato TOON (cabecera + filas).

    Reduce ~40-60 % de tokens frente al formato verboso de registros
    individuales porque los nombres de campo se declaran una sola vez.

    Formato generado:
        fecha|origen|destino|presentacion|precio_min|precio_max|precio_frec|...|obs
        15/01/2025|Tabasco|Villahermosa, Tab.|Caja de 20 kg.|180|200|190|...|
        ...
    """
    if not documentos:
        return ""

    cabecera = _SEP_CAMPO.join(CAMPOS_TOON)

    filas = []
    for doc in documentos:
        valores = [str(doc.get(campo, "")) for campo in CAMPOS_TOON]
        filas.append(_SEP_CAMPO.join(valores))

    return cabecera + _SEP_REGISTRO + _SEP_REGISTRO.join(filas)
