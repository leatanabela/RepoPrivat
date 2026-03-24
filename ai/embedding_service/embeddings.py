import ollama
from ai.config import settings


def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding vector using bge-m3 via Ollama."""
    response = ollama.embed(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    embeddings = response.get("embeddings")
    if not embeddings:
        raise ValueError(f"No embeddings returned from model {settings.EMBEDDING_MODEL}")
    return embeddings[0]


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
