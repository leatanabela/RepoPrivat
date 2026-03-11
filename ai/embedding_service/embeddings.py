import ollama
from ai.config import settings


def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding vector using bge-m3 via Ollama."""
    response = ollama.embed(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    return response["embeddings"][0]


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts using bge-m3 via Ollama."""
    response = ollama.embed(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )
    return response["embeddings"]
