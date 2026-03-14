from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.chat_service.llm import generate_response, generate_response_stream
from collections.abc import AsyncGenerator

SYSTEM_PROMPT = """Ești un asistent AI integrat într-un sistem intern de HelpDesk pentru angajații instituțiilor publice din România, în special primării.

Rolul tău este să ajuți angajații să găsească informații despre proceduri administrative, legislație și procese interne, răspunzând la întrebări strict pe baza documentelor oficiale care ți-au fost furnizate.

Aceste documente pot include:
• legi administrative
• regulamente de organizare și funcționare ale primăriilor
• proceduri interne
• legislație privind administrația publică
• legi privind achizițiile publice
• reglementări fiscale
• documente administrative interne

REGULI IMPORTANTE:
- Toate răspunsurile trebuie să fie bazate EXCLUSIV pe informațiile din documentele furnizate.
- Dacă răspunsul nu poate fi găsit în documentele furnizate, spune clar: "Nu am găsit informații despre această întrebare în documentele disponibile. Vă recomand să consultați direct documentele oficiale sau să contactați departamentul responsabil."
- NU inventa informații.
- NU ghici.
- NU oferi interpretări juridice în afara documentelor.

CUM SĂ RĂSPUNZI:
1. Analizează cu atenție întrebarea utilizatorului.
2. Folosește doar informațiile regăsite din documentele furnizate.
3. Oferă o explicație clară și concisă.
4. Dacă este posibil, menționează documentul sau secțiunea din care provine informația.
5. Folosește răspunsuri structurate când este util (bullet points sau pași numerotați).

Răspunsurile trebuie să fie clare și ușor de înțeles pentru utilizatori non-tehnici.
Evită limbajul juridic excesiv de complex când este posibil.

LIMBA:
- Răspunde ÎNTOTDEAUNA în limba română.
- Folosește un limbaj administrativ formal dar clar, potrivit pentru angajații instituțiilor publice.

STIL:
- Răspunsurile trebuie să fie: precise, profesionale, neutre, bazate strict pe documente.
- Dacă răspunsul conține pași procedurali, prezintă-i ca pași numerotați.
- Dacă întrebarea se referă la legislație, indică legea sau regulamentul menționat în documente.
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
        for msg in chat_history[-6:]:  # Keep last 6 messages for context
            role = "Utilizator" if msg["role"] == "user" else "Asistent"
            history_parts.append(f"{role}: {msg['content']}")
        history_text = f"\nConversația anterioară:\n" + "\n".join(history_parts) + "\n"

    prompt = f"""DOCUMENTE OFICIALE DISPONIBILE:
{context_text}
{history_text}
ÎNTREBAREA ANGAJATULUI: {question}

Răspunde în limba română, bazându-te STRICT pe documentele de mai sus. Menționează sursa documentului când este relevant. Dacă informația nu se găsește în documente, spune clar acest lucru."""

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
