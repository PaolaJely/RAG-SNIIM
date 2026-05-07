from typing import List, Tuple, Dict
from supabase import create_client
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import config
from embeddings_factory import embeddings

# ==================== INICIALIZACIÓN ====================
supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

llm = ChatOpenAI(
    model=config.OPENAI_LLM_MODEL,
    api_key=config.OPENAI_API_KEY,
    temperature=0.7
)

# ==================== RETRIEVAL ====================
def retriever(query: str, k: int = None) -> Tuple[str, List[Dict]]:
    """
    Recupera documentos relevantes usando búsqueda vectorial mejorada
    
    Args:
        query: pregunta del usuario
        k: número de resultados (default: config.SEARCH_K)
    
    Returns:
        (contexto_formateado, lista_de_documentos)
    """
    if k is None:
        k = config.SEARCH_K
    
    print(f"\n🔍 Buscando {k} documentos similares...")
    
    query_embedding = embeddings.embed_query(query)
    
    try:
        resultado = supabase.rpc(
            "buscar_producto",
            {
                "query_embedding": query_embedding,
                # Se busca hasta 2x para luego diversificar y filtrar por similitud
                "match_count": min(k * 2, 20),
            }
        ).execute()
        
        documentos = resultado.data
        
        if not documentos:
            return "", []
        
        documentos = [d for d in documentos if d['similarity'] >= config.SIMILARITY_THRESHOLD]
        
        if not documentos:
            return "", []
        
        documentos = diversificar_documentos(documentos, k)
        
        contexto = formatear_contexto(documentos)
        return contexto, documentos
    
    except Exception as e:
        print(f"Error en búsqueda vectorial: {e}")
        return "", []


def diversificar_documentos(docs: List[Dict], k: int) -> List[Dict]:
    """
    Diversifica documentos por origen/destino
    para evitar duplicación de pares similares
    """
    seleccionados = []
    pares_vistos = set()
    
    # Primero, documentos únicos por origen-destino
    for doc in docs:
        par = (doc.get('origen', ''), doc.get('destino', ''))
        if par not in pares_vistos:
            seleccionados.append(doc)
            pares_vistos.add(par)
            if len(seleccionados) >= k:
                return seleccionados
    
    # Si hace falta, agregar más sin restricción
    for doc in docs:
        if doc not in seleccionados:
            seleccionados.append(doc)
            if len(seleccionados) >= k:
                return seleccionados
    
    return seleccionados[:k]


def formatear_contexto(documentos: List[Dict]) -> str:
    contexto_partes = []
    
    for i, doc in enumerate(documentos, 1):
        parte = f"""
REGISTRO {i}:
├─ Fecha: {doc.get('fecha', 'N/A')}
├─ Origen: {doc.get('origen', 'N/A')}
├─ Destino: {doc.get('destino', 'N/A')}
├─ Presentación: {doc.get('presentacion', 'N/A')}
├─ Precio Mínimo: ${doc.get('precio_min', 'N/A')}/kg
├─ Precio Máximo: ${doc.get('precio_max', 'N/A')}/kg
├─ Precio Frecuente: ${doc.get('precio_frec', 'N/A')}/kg
├─ Observaciones: {doc.get('obs', 'N/A')}
└─ Similitud: {doc.get('similarity', 0):.1%}
"""
        contexto_partes.append(parte)
    
    return "\n".join(contexto_partes)

# ==================== GENERATION ====================
def generator(query: str, contexto: str) -> str:
    """
    Genera respuesta usando el contexto recuperado
    """
    
    template = """Eres un experto en precios de plátanos en Tabasco, México.
Tu objetivo es analizar datos de precios, orígenes y destinos de manera clara y precisa.

ESTRUCTURA DE LOS DATOS:
- Origen: estado o región donde se produce el plátano
- Destino: mercado o ciudad donde se vende
- Precios en pesos mexicanos (MXN) por kilogramo
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
5. Cuando menciones precios, siempre incluye: "Precio frecuente: $XX/kg (Rango: $XX-$XX/kg)"
6. Si hay múltiples registros, proporciona:
   - Valor más alto y más bajo
   - Promedio si es relevante
   - Tendencia si se observa
7. Ordena datos cronológicamente cuando sea aplicable
8. Si los datos son limitados pero relevantes, úsalos igual pero indica: "Con los datos disponibles..."
9. Si la información NO está en los registros, responde: "No tengo datos disponibles para [específico]"
10. Sé conciso pero informativo: máximo 3 párrafos
11. Usa viñetas o guiones para datos comparativos
12. Siempre cierra con una conclusión clara

RESPUESTA:"""
    
    prompt = PromptTemplate(
        template=template,
        input_variables=["contexto", "query"]
    )
    
    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"contexto": contexto, "query": query})


# ==================== PIPELINE RAG COMPLETO ====================
def rag_query(pregunta: str, verbose: bool = True) -> Dict:
    """
    Pipeline RAG completo: Retrieval → Augmentation → Generation
    
    Args:
        pregunta: pregunta del usuario
        verbose: mostrar pasos intermedios
    
    Returns:
        dict con pregunta, contexto, documentos y respuesta
    """
    if verbose:
        print(f"\n{'='*70}")
        print(f"PREGUNTA: {pregunta}")
        print(f"{'='*70}")
    
    # 1. RETRIEVAL
    contexto, documentos = retriever(pregunta)
    
    if not contexto:
        respuesta = "No encontré información relevante sobre tu pregunta. Intenta con términos más específicos."
        if verbose:
            print(f"\n{'='*70}")
            print(f"💬 RESPUESTA:\n{respuesta}")
            print(f"{'='*70}\n")
        
        return {
            "pregunta": pregunta,
            "contexto": "",
            "documentos": [],
            "respuesta": respuesta
        }
    
    # 2. GENERATION
    respuesta = generator(pregunta, contexto)
    
    if verbose:
        print(f"\n{'='*70}")
        print(f"💬 RESPUESTA:\n{respuesta}")
        print(f"\n📊 Documentos utilizados: {len(documentos)}")
        print(f"{'='*70}\n")
    
    return {
        "pregunta": pregunta,
        "contexto": contexto,
        "documentos": documentos,
        "respuesta": respuesta
    }

# ==================== MODO INTERACTIVO ====================
if __name__ == "__main__":
    print(f"\n{'='*70}")
    print(f"🍌 RAG SISTEMA DE PRECIOS DE PLÁTANOS")
    print(f"{'='*70}")
    print(f"📌 Provider embeddings: {config.PROVIDER.value.upper()}")
    print(f"📌 LLM: OpenAI ({config.OPENAI_LLM_MODEL})")
    print(f"📌 Búsqueda top {config.SEARCH_K} documentos")
    print(f"📌 Umbral similitud: {config.SIMILARITY_THRESHOLD}")
    print(f"\n💡 Escribe 'salir' para terminar")
    print(f"{'='*70}\n")
    
    while True:
        try:
            pregunta = input("Tu pregunta: ").strip()
            
            if pregunta.lower() in ['salir', 'exit', 'quit']:
                print(f"\n{'='*70}")
                print("👋 ¡Hasta luego!")
                print(f"{'='*70}\n")
                break
            
            if not pregunta:
                print("Por favor escribe una pregunta\n")
                continue
            
            rag_query(pregunta, verbose=True)
            
        except KeyboardInterrupt:
            print(f"\n\n{'='*70}")
            print("Interrupción del usuario")
            print(f"{'='*70}\n")
            break
        except Exception as e:
            print(f"\nError: {e}\n")