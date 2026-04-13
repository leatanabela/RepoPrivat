from supabase import create_client
from ai.config import settings
from ai.embedding_service.embeddings import generate_embedding


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def retrieve_relevant_chunks(
    query: str,
    top_k: int | None = None,
    threshold: float | None = None,
) -> list[dict]:
    """
    Retrieve document chunks relevant to a query using vector similarity.

    1. Generate embedding for the query using bge-m3
    2. Call Supabase match_documents RPC function
    3. Return ranked results with content and metadata
    """
    top_k = top_k or settings.RETRIEVAL_TOP_K
    threshold = threshold or settings.RETRIEVAL_THRESHOLD

    # Generate query embedding
    query_embedding = generate_embedding(query)

    # Call the match_documents function in Supabase
    supabase = get_supabase()
    result = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_threshold": threshold,
            "match_count": top_k,
        },
    ).execute()

    if not result.data:
        return []

    return [
        {
            "content": chunk["content"],
            "document_title": chunk["document_title"],
            "document_id": chunk["document_id"],
            "chunk_index": chunk["chunk_index"],
            "similarity": chunk["similarity"],
            "file_url": chunk["document_file_url"],
        }
        for chunk in result.data
    ]
