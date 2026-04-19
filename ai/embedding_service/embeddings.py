from functools import lru_cache
import ollama
from ai.config import settings


def _embed_uncached(text: str) -> tuple[float, ...]:
    """Internal: generate embedding as tuple (hashable for lru_cache)."""
    response = ollama.embed(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    embeddings = response.get("embeddings")
    if not embeddings:
        raise ValueError(f"No embeddings returned from model {settings.EMBEDDING_MODEL}")
    return tuple(embeddings[0])


@lru_cache(maxsize=512)
def _cached_embed(text: str) -> tuple[float, ...]:
    """LRU-cached embedding. Cache key is text string."""
    return _embed_uncached(text)


def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding vector using bge-m3 via Ollama (LRU cached)."""
    # Normalize whitespace so "  text  " and "text" hit same cache key
    cache_key = text.strip()
    return list(_cached_embed(cache_key))


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts using bge-m3 via Ollama."""
    response = ollama.embed(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )
    embeddings = response.get("embeddings")
    if not embeddings:
        raise ValueError(f"No embeddings returned from model {settings.EMBEDDING_MODEL}")
    return embeddings
