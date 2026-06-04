import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

# ── Paths ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# ── Qdrant ─────────────────────────────────────────────
QDRANT_HOST       = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT       = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "sniim")

# ── Postgres ───────────────────────────────────────────
POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB       = os.getenv("POSTGRES_DB", "sniim")
POSTGRES_USER     = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

POSTGRES_DSN = (
    f"host={POSTGRES_HOST} port={POSTGRES_PORT} "
    f"dbname={POSTGRES_DB} user={POSTGRES_USER} "
    f"password={POSTGRES_PASSWORD}"
)

# ── OpenAI ─────────────────────────────────────────────
OPENAI_API_KEY         = os.getenv("OPENAI_API_KEY", "")
OPENAI_LLM_MODEL       = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# ── RAG ────────────────────────────────────────────────
SEARCH_K             = int(os.getenv("SEARCH_K", "16"))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.2"))
