"""Cliente Qdrant: local (host/port) o Qdrant Cloud (url + api_key)."""
from qdrant_client import QdrantClient

import config


def get_qdrant_client() -> QdrantClient:
    """Devuelve cliente Qdrant según variables de entorno."""
    if config.QDRANT_URL and config.QDRANT_API_KEY:
        return QdrantClient(url=config.QDRANT_URL, api_key=config.QDRANT_API_KEY)
    return QdrantClient(host=config.QDRANT_HOST, port=config.QDRANT_PORT)
