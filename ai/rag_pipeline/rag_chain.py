from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.chat_service.llm import generate_response, generate_response_stream
from collections.abc import AsyncGenerator

SYSTEM_PROMPT = """You are an AI assistant for a public institution helpdesk.
Your role is to help employees find information from internal documents.

Rules:
- Answer in the SAME LANGUAGE as the user's question (Romanian or English).
- Use ONLY the provided context to answer. Do not make up information.
- If the context does not contain enough information to answer, say so clearly.
- Cite the document sources when possible (mention the document title).
- Be concise, clear, and helpful.
- Use simple language that non-technical users can understand.
- If the question is unclear, ask for clarification.
"""


def _build_prompt(
    question: str,
    context_chunks: list[dict],
    chat_history: list[dict] | None = None,
) -> str:
    """Build the prompt with retrieved context and chat history."""
    # Build context section
    if context_chunks:
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            source = chunk.get("document_title", "Unknown")
            context_parts.append(
                f"[Source {i}: {source}]\n{chunk['content']}"
            )
        context_text = "\n\n---\n\n".join(context_parts)
    else:
        context_text = "No relevant documents were found."

    # Build chat history section
    history_text = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-6:]:  # Keep last 6 messages for context
            role = "User" if msg["role"] == "user" else "Assistant"
            history_parts.append(f"{role}: {msg['content']}")
        history_text = f"\nPrevious conversation:\n" + "\n".join(history_parts) + "\n"

    prompt = f"""Context from internal documents:
{context_text}
{history_text}
User question: {question}

Provide a helpful answer based on the context above. Cite document sources when relevant."""

    return prompt


def ask_question(
    question: str,
    chat_history: list[dict] | None = None,
    top_k: int = 5,
    threshold: float = 0.5,
) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant document chunks
    2. Build prompt with context
    3. Generate answer with llama3:8b
    4. Return answer with sources
    """
    # Step 1: Retrieve
    chunks = retrieve_relevant_chunks(question, top_k=top_k, threshold=threshold)

    # Step 2: Build prompt
    prompt = _build_prompt(question, chunks, chat_history)

    # Step 3: Generate
    answer = generate_response(prompt, system_prompt=SYSTEM_PROMPT)

    # Step 4: Prepare sources
    sources = []
    seen_docs = set()
    for chunk in chunks:
        doc_id = chunk["document_id"]
        if doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "document_id": doc_id,
                "document_title": chunk["document_title"],
                "similarity": round(chunk["similarity"], 3),
                "file_url": chunk.get("file_url", ""),
            })

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(chunks),
    }


async def ask_question_stream(
    question: str,
    chat_history: list[dict] | None = None,
    top_k: int = 5,
    threshold: float = 0.5,
) -> AsyncGenerator[dict, None]:
    """
    Streaming RAG pipeline - yields answer tokens one at a time.
    First yields sources, then streams answer chunks.
    """
    # Retrieve
    chunks = retrieve_relevant_chunks(question, top_k=top_k, threshold=threshold)

    # Prepare sources
    sources = []
    seen_docs = set()
    for chunk in chunks:
        doc_id = chunk["document_id"]
        if doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "document_id": doc_id,
                "document_title": chunk["document_title"],
                "similarity": round(chunk["similarity"], 3),
                "file_url": chunk.get("file_url", ""),
            })

    # Yield sources first
    yield {"type": "sources", "data": sources}

    # Build prompt and stream answer
    prompt = _build_prompt(question, chunks, chat_history)
    async for token in generate_response_stream(prompt, system_prompt=SYSTEM_PROMPT):
        yield {"type": "token", "data": token}

    yield {"type": "done", "data": ""}
