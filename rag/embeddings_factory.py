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
    print(f"🔌 Usando embeddings: OPENAI ({config.OPENAI_EMBEDDING_MODEL})")
    return OpenAIEmbeddings()


embeddings = get_embeddings()
