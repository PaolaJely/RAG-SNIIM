import os
from enum import Enum
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


class ProviderType(Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"


# ============ SETTINGS ============
PROVIDER = ProviderType(os.getenv("PROVIDER", "ollama"))

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

# Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
OLLAMA_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL", "llama3.2")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# RAG
SEARCH_K = int(os.getenv("SEARCH_K", 16))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.2))

# Paths
DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def is_ollama() -> bool:
    return PROVIDER == ProviderType.OLLAMA


def is_openai() -> bool:
    return PROVIDER == ProviderType.OPENAI
