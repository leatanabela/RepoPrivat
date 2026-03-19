from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.chat_service.llm import generate_response, generate_response_stream
from collections.abc import AsyncGenerator

SYSTEM_PROMPT = """Ești asistentul AI al primăriei. Răspunzi DOAR pe baza documentelor furnizate, în limba română.

REGULI:
- Răspunde DIRECT la întrebare. NU folosi introduceri precum "Bună ziua!", "Răspunsul meu va fi:", "Întrebarea ta este clară". Mergi direct la subiect.
- Fii CONCIS. Maxim 2-3 paragrafe scurte. Nu repeta informația.
- Folosește limbaj simplu și clar.
- NU inventa. NU ghici. Doar ce scrie în documente.
- Dacă întrebarea NU e despre administrație publică, legislație sau proceduri ale primăriei (de ex: persoane publice, sport, politică, istorie, rețete, divertisment), răspunde DOAR cu: "Îmi pare rău, nu pot ajuta cu acest subiect. Sunt specializat doar pe proceduri administrative și legislație."
- Dacă documentele nu conțin răspunsul, spune scurt: "Nu am găsit informații despre asta în documentele disponibile."
- Pentru pași procedurali, folosește liste numerotate.
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
            source = chunk.get("document_title", "Document necunoscut")
            context_parts.append(
                f"[Sursa {i}: {source}]\n{chunk['content']}"
            )
        context_text = "\n\n---\n\n".join(context_parts)
    else:
        context_text = "Nu s-au găsit documente relevante pentru această întrebare."

    # Build chat history section
    history_text = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-4:]:  # Keep last 4 messages for context
            role = "Utilizator" if msg["role"] == "user" else "Asistent"
            history_parts.append(f"{role}: {msg['content']}")
        history_text = f"\nConversația anterioară:\n" + "\n".join(history_parts) + "\n"

    prompt = f"""DOCUMENTE:
{context_text}
{history_text}
ÎNTREBARE: {question}

Răspunde concis în română, strict din documente. Mergi direct la subiect."""

    return prompt


def ask_question(
    question: str,
    chat_history: list[dict] | None = None,
    top_k: int = 5,
    threshold: float = 0.2,
) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant document chunks
    2. Build prompt with context
    3. Generate answer with helpdesk-ro
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
    threshold: float = 0.2,
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

    # Yield sources and metadata first
    yield {"type": "sources", "data": sources}
    yield {"type": "metadata", "data": {"chunks_used": len(chunks)}}

    # Build prompt and stream answer
    prompt = _build_prompt(question, chunks, chat_history)
    async for token in generate_response_stream(prompt, system_prompt=SYSTEM_PROMPT):
        yield {"type": "token", "data": token}

    yield {"type": "done", "data": ""}
