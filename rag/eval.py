# === RAGAS — Evaluación offline del pipeline RAG ===
# Ejecutar desde la carpeta rag/: python eval.py
# Requiere: pip install ragas datasets
# Nota: RAGAS usa OpenAI como juez interno — OPENAI_API_KEY debe estar configurada.
# Métricas: faithfulness y answer_relevancy (no requieren columna reference).
# Se usan las métricas legacy de ragas.metrics porque son las únicas compatibles
# con ragas.evaluate(). Las métricas de ragas.metrics.collections usan una jerarquía
# de clases distinta (BaseMetric) incompatible con evaluate().

from __future__ import annotations

import warnings

# Las métricas legacy de ragas.metrics emiten DeprecationWarning al importarse,
# pero son la única vía compatible con evaluate() en ragas 0.4.x.
with warnings.catch_warnings():
    warnings.simplefilter("ignore", DeprecationWarning)
    from ragas.metrics import answer_relevancy, faithfulness

from datasets import Dataset
from langchain_openai import OpenAIEmbeddings as LCOpenAIEmbeddings
from ragas import evaluate

from config import OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL
from rag import rag_query  # carga config.py → load_dotenv() → OPENAI_API_KEY disponible

# answer_relevancy (legacy) necesita embeddings con embed_query — usar LangChain directamente.
# evaluate() detecta LangchainEmbeddings y los envuelve con LangchainEmbeddingsWrapper.
_lc_embeddings = LCOpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL, api_key=OPENAI_API_KEY)

PREGUNTAS_EVAL: list[str] = [
    "¿Cuánto costó el plátano en Jalisco en octubre de 2025?",
    "¿Qué origen ofrece los precios más bajos en Tamaulipas?",
    "¿Cómo variaron los precios en Sonora entre enero y diciembre de 2025?",
    "¿Cuál fue el precio frecuente en Coahuila en agosto de 2025?",
    "¿Qué presentación tiene mayor variación de precio en Veracruz?",
]


def construir_dataset() -> Dataset:
    """Ejecuta el pipeline RAG para cada pregunta de evaluación y construye el Dataset."""
    muestras: list[dict] = []

    for i, pregunta in enumerate(PREGUNTAS_EVAL, 1):
        print(f"[{i}/{len(PREGUNTAS_EVAL)}] Evaluando: {pregunta}")
        try:
            result = rag_query(pregunta, verbose=False)
            muestras.append(
                {
                    "question": pregunta,
                    "answer": result["respuesta"],
                    # RAGAS espera una lista de strings de contexto
                    "contexts": [result["contexto"]] if result["contexto"] else [""],
                }
            )
        except Exception as e:
            print(f"  ⚠ Error al procesar pregunta: {e}")
            muestras.append(
                {
                    "question": pregunta,
                    "answer": "",
                    "contexts": [""],
                }
            )

    return Dataset.from_list(muestras)


def evaluar() -> dict:
    """Evalúa el pipeline RAG con las métricas faithfulness y answer_relevancy.

    evaluate() auto-configura el LLM/embeddings desde OPENAI_API_KEY (cargada via .env).

    Returns:
        Diccionario con los scores por métrica.
    """
    print("\n" + "=" * 60)
    print("RAGAS — Evaluación del pipeline RAG SNIIM")
    print("=" * 60)

    dataset = construir_dataset()

    print("\n⏳ Ejecutando evaluación con RAGAS (puede tardar unos minutos)...\n")
    resultado = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy],
        embeddings=_lc_embeddings,
    )

    print("\n" + "=" * 60)
    print("RESULTADOS")
    print("=" * 60)
    print(resultado)
    return resultado


if __name__ == "__main__":
    evaluar()
