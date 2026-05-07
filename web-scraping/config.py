import os
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

class ProviderType(Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"

# ============ SETTINGS ============
PROVIDER = ProviderType(os.getenv("PROVIDER", "ollama"))

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")


# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "GPT‑4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# RAG
SEARCH_K = int(os.getenv("SEARCH_K", 16))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.2))

def is_ollama():
    return PROVIDER == ProviderType.OLLAMA

def is_openai():
    return PROVIDER == ProviderType.OPENAI