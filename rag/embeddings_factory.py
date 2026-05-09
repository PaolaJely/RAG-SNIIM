from abc import ABC, abstractmethod
from typing import List
import config


class EmbeddingsProvider(ABC):
    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass


class OllamaEmbeddings(EmbeddingsProvider):
    def __init__(self):
        from langchain_ollama import OllamaEmbeddings as LCOllamaEmbeddings
        self.embedder = LCOllamaEmbeddings(
            model=config.OLLAMA_EMBEDDING_MODEL,
            base_url=config.OLLAMA_BASE_URL,
        )

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embedder.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.embedder.embed_query(text)


class OpenAIEmbeddings(EmbeddingsProvider):
    def __init__(self):
        from langchain_openai import OpenAIEmbeddings as LCOpenAIEmbeddings
        self.embedder = LCOpenAIEmbeddings(
            model=config.OPENAI_EMBEDDING_MODEL,
            api_key=config.OPENAI_API_KEY,
        )

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embedder.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.embedder.embed_query(text)


def get_embeddings() -> EmbeddingsProvider:
    if config.is_ollama():
        print(f"🔌 Usando embeddings: OLLAMA ({config.OLLAMA_EMBEDDING_MODEL})")
        return OllamaEmbeddings()
    elif config.is_openai():
        print(f"🔌 Usando embeddings: OPENAI ({config.OPENAI_EMBEDDING_MODEL})")
        return OpenAIEmbeddings()
    raise ValueError(f"Provider no soportado: {config.PROVIDER}")


embeddings = get_embeddings()
