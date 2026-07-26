from typing import List, Tuple, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.callbacks import get_openai_callback
import config
from embeddings_factory import embeddings
from compressor import formatear_contexto_toon
from query_filters import QueryFilters, build_query_filters
from qdrant_client_factory import get_qdrant_client

# ==================== INICIALIZACIÓN ====================
qdrant = get_qdrant_client()

llm = ChatOpenAI(
    model=config.OPENAI_LLM_MODEL,
    api_key=config.OPENAI_API_KEY,
    temperature=0.7,
)

# ==================== RETRIEVAL ====================
def retriever(
    query: str,
    k: int = None,
    producto_id: Optional[str] = None,
) -> Tuple[str, List[Dict]]:
    """Busca los k documentos más similares en Qdrant.

    Args:
        query: Pregunta del usuario.
        k: Número máximo de documentos a recuperar.
        producto_id: Filtrar por producto SNIIM específico (opcional).
    """
    if k is None:
        k = config.SEARCH_K

    print(f"\n🔍 Buscando {k} documentos similares en Qdrant...")

    query_embedding = embeddings.embed_query(query)

    filter_info = build_query_filters(query, producto_id=producto_id)
    search_filter = filter_info.qdrant_filter
    if search_filter:
        print(
            "🔎 Filtros estructurados:",
            {
                "fecha": filter_info.fecha_text,
                "destino": filter_info.destino_terms,
                "origen": filter_info.origen_terms,
                "presentacion": filter_info.presentacion_text,
            },
        )

    try:
        if filter_info.comparative:
            candidate_limit = min(max(k * 20, 100), 120)
        elif search_filter:
            candidate_limit = min(k * 6, 80)
        else:
            candidate_limit = min(k * 2, 20)
        respuesta_qdrant = qdrant.query_points(
            collection_name=config.QDRANT_COLLECTION,
            query=query_embedding,
            limit=candidate_limit,
            query_filter=search_filter,
            with_payload=True,
        )

        documentos = [
            {**r.payload, "similarity": r.score}
            for r in respuesta_qdrant.points
            if search_filter or r.score >= config.SIMILARITY_THRESHOLD
        ]

        if not documentos:
            return "", []

        documentos = diversificar_documentos(documentos, k, filter_info)
        return formatear_contexto_toon(documentos), documentos

    except Exception as e:
        print(f"❌ Error en búsqueda vectorial: {e}")
        return "", []


def diversificar_documentos(
    docs: List[Dict],
    k: int,
    filter_info: Optional[QueryFilters] = None,
) -> List[Dict]:
    """Prioriza pares únicos origen/destino para evitar redundancia en el contexto."""
    if filter_info and filter_info.comparative and filter_info.destino_terms:
        return diversificar_por_terminos(docs, k, filter_info.destino_terms)

    seleccionados: List[Dict] = []
    pares_vistos: set = set()

    for doc in docs:
        if filter_info and filter_info.temporal:
            par = (doc.get("destino", ""), doc.get("fecha", ""))
        else:
            par = (doc.get("origen", ""), doc.get("destino", ""))
        if par not in pares_vistos:
            seleccionados.append(doc)
            pares_vistos.add(par)
            if len(seleccionados) >= k:
                return seleccionados

    for doc in docs:
        if doc not in seleccionados:
            seleccionados.append(doc)
            if len(seleccionados) >= k:
                return seleccionados

    return seleccionados[:k]


def diversificar_por_terminos(docs: List[Dict], k: int, terms: List[str]) -> List[Dict]:
    seleccionados: List[Dict] = []
    usados: set[int] = set()
    normalized_terms = [term.lower() for term in terms]

    for term in normalized_terms:
        for index, doc in enumerate(docs):
            if index in usados:
                continue
            destino = (doc.get("destino") or "").lower()
            if term.lower() in destino:
                seleccionados.append(doc)
                usados.add(index)
                break

    for index, doc in enumerate(docs):
        if len(seleccionados) >= k:
            return seleccionados
        if index not in usados:
            seleccionados.append(doc)
            usados.add(index)

    return seleccionados[:k]


# ==================== GENERATION ====================
_TEMPLATE = """Eres un experto en precios de plátanos en Tabasco, México.
Tu objetivo es analizar datos de precios, orígenes y destinos de manera clara y precisa.

Los registros están en formato TOON: campos declarados una vez en la cabecera, valores separados por "|" en filas subsiguientes.

ESTRUCTURA DE LOS DATOS:
- Origen: estado o región donde se produce el plátano
- Destino: mercado o ciudad donde se vende
- Los campos precio_min, precio_max y precio_frec son precios en la presentación original del registro
- Si existen precio_min_kg, precio_max_kg y precio_frec_kg con unidad_normalizada = MXN/kg, usa esos campos como precio principal y menciona MXN/kg
- Si unidad_normalizada es presentacion_original, o los campos normalizados están vacíos, menciona los precios en la presentación original y no afirmes que son MXN/kg
- Fechas en formato DD/MM/YYYY (día/mes/año)
- Presentación: formato del producto (ej: caja, racimo, etc)

REGISTROS DISPONIBLES:
{contexto}

PREGUNTA DEL USUARIO:
{query}

INSTRUCCIONES CRÍTICAS:
1. Responde ÚNICAMENTE con información de los registros proporcionados
2. NUNCA inventes datos que no aparezcan en los registros
3. Extrae y cita: fechas específicas, precios exactos, orígenes, destinos
4. Formatea fechas de forma legible: "12 de enero de 2025"
5. Cuando unidad_normalizada = MXN/kg, responde con precio_frec_kg y rango precio_min_kg-precio_max_kg como valores principales; puedes mencionar el precio original como referencia
6. Si hay múltiples registros, proporciona valor más alto, más bajo y promedio si es relevante
7. Ordena datos cronológicamente cuando sea aplicable
8. Si los datos son limitados pero relevantes, úsalos e indica: "Con los datos disponibles..."
9. Si la información NO está en los registros, responde: "No tengo datos disponibles para [específico]"
10. Sé conciso pero informativo: máximo 3 párrafos
11. Usa viñetas para datos comparativos
12. Siempre cierra con una conclusión clara

RESPUESTA:"""

_prompt = PromptTemplate(template=_TEMPLATE, input_variables=["contexto", "query"])
_chain  = _prompt | llm | StrOutputParser()


def generator(query: str, contexto: str) -> str:
    """Genera la respuesta del LLM dado el contexto recuperado."""
    return _chain.invoke({"contexto": contexto, "query": query})


# ==================== PIPELINE RAG COMPLETO ====================
def rag_query(
    pregunta: str,
    verbose: bool = True,
    producto_id: Optional[str] = None,
) -> Dict:
    """Pipeline RAG completo con token tracking.

    Args:
        pregunta: Pregunta del usuario en lenguaje natural.
        verbose: Imprime resumen de tokens y documentos en consola.
        producto_id: Filtrar por producto SNIIM (None = todos).

    Returns:
        Diccionario con pregunta, contexto, documentos, respuesta y tokens.
    """
    if verbose:
        print(f"\n{'='*70}")
        print(f"PREGUNTA: {pregunta}")
        print(f"{'='*70}")

    contexto, documentos = retriever(pregunta, producto_id=producto_id)

    if not contexto:
        respuesta = "No encontré información relevante. Intenta con términos más específicos."
        if verbose:
            print(f"\n{'='*70}\n💬 RESPUESTA:\n{respuesta}\n{'='*70}\n")
        return {
            "pregunta":   pregunta,
            "contexto":   "",
            "documentos": [],
            "respuesta":  respuesta,
            "tokens":     None,
        }

    with get_openai_callback() as cb:
        respuesta = generator(pregunta, contexto)

    token_info: Dict = {
        "tokens_prompt":     cb.prompt_tokens,
        "tokens_completion": cb.completion_tokens,
        "tokens_total":      cb.total_tokens,
        "costo_usd":         round(cb.total_cost, 6),
    }

    if verbose:
        print(f"\n{'='*70}")
        print(f"💬 RESPUESTA:\n{respuesta}")
        print(f"\n📊 Documentos utilizados: {len(documentos)}")
        print(
            f"🔢 Tokens — prompt: {token_info['tokens_prompt']} | "
            f"completion: {token_info['tokens_completion']} | "
            f"total: {token_info['tokens_total']} | "
            f"costo: ${token_info['costo_usd']}"
        )
        print(f"{'='*70}\n")

    return {
        "pregunta":   pregunta,
        "contexto":   contexto,
        "documentos": documentos,
        "respuesta":  respuesta,
        "tokens":     token_info,
    }


# ==================== MODO INTERACTIVO ====================
if __name__ == "__main__":
    print(f"\n{'='*70}")
    print("🍌 RAG - SISTEMA DE PRECIOS DE PLÁTANOS SNIIM")
    print(f"{'='*70}")
    print(f"📌 Embeddings: OpenAI ({config.OPENAI_EMBEDDING_MODEL})")
    print(f"📌 LLM: OpenAI ({config.OPENAI_LLM_MODEL})")
    print(f"📌 Qdrant: {config.QDRANT_HOST}:{config.QDRANT_PORT}/{config.QDRANT_COLLECTION}")
    print(f"📌 Top-{config.SEARCH_K} docs | Umbral: {config.SIMILARITY_THRESHOLD}")
    print(f"\n💡 Escribe 'salir' para terminar")
    print(f"{'='*70}\n")

    while True:
        try:
            pregunta = input("Tu pregunta: ").strip()

            if pregunta.lower() in {"salir", "exit", "quit"}:
                print("\n👋 ¡Hasta luego!\n")
                break

            if not pregunta:
                print("Por favor escribe una pregunta.\n")
                continue

            rag_query(pregunta, verbose=True)

        except KeyboardInterrupt:
            print("\n\nInterrupción del usuario.\n")
            break
        except Exception as e:
            print(f"\nError: {e}\n")
