# === COMPRESSOR — Serialización TOON para reducir tokens de contexto ===

CAMPOS_TOON = [
    "fecha",
    "origen",
    "destino",
    "presentacion",
    "precio_min",
    "precio_max",
    "precio_frec",
    "obs",
]

_SEP_CAMPO = "|"
_SEP_REGISTRO = "\n"


def formatear_contexto_toon(documentos: list[dict]) -> str:
    """Serializa documentos en formato TOON (cabecera + filas).

    Reduce ~40-60 % de tokens frente al formato verboso de registros
    individuales porque los nombres de campo se declaran una sola vez.

    Formato generado:
        fecha|origen|destino|presentacion|precio_min|precio_max|precio_frec|obs
        15/01/2025|Tabasco|Villahermosa, Tab.|Caja|8.5|10.0|9.0|
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
