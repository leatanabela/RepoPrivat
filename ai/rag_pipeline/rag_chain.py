from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.chat_service.llm import generate_response, generate_response_stream
from collections.abc import AsyncGenerator
import re

SYSTEM_PROMPT = """Ești asistentul AI al primăriei. Răspunzi DOAR pe baza documentelor furnizate, în limba română corectă cu diacritice (ă, â, î, ș, ț).

REGULI STRICTE:
- Răspunde DIRECT la întrebare, fără introduceri inutile.
- Folosește EXACT informațiile din documente. NU parafraza greșit, NU inventa detalii.
- Fii CONCIS: maxim 2-3 propoziții clare.
- Citează articolele și numerele exact cum apar în documente (ex: "conform art. 116 alin. (8)").
- Limba română CORECTĂ: "președintele" nu "presedintele", "ședință" nu "sedinta", "funcționari" nu "functionari".
- NU termina cu fraze inutile ca "Sper că te-am ajutat!" sau "Informațiile sunt utile!".
- Off-topic → "Îmi pare rău, nu pot ajuta cu acest subiect. Sunt specializat doar pe proceduri administrative și legislație."
- Nu găsești → "Nu am găsit informații despre asta în documentele disponibile."
- Pentru proceduri, folosește liste numerotate.
"""

# Greeting patterns
_GREETING_PATTERNS = re.compile(
    r'^\s*(bun[aă]|salut|hey|hello|hi|ce faci|cum e[sș]ti|noroc|servus|hei|neata|buna\s*(ziua|seara|dimineata)?)\s*[?!.,]*\s*$'
    r'|^\s*(salut|bun[aă]|hey|hi|hei)\s*[,!.]?\s*(ce faci|cum e[sș]ti|ce mai faci|cum merge)?\s*[?!.,]*\s*$',
    re.IGNORECASE
)

_GREETING_RESPONSE = (
    "Bună! 😊 Sunt asistentul virtual al primăriei. "
    "Te pot ajuta cu informații despre proceduri administrative, legislație, "
    "concesiuni, acte necesare și multe altele. "
    "Cu ce te pot ajuta?"
)

# Vague/general questions that need a helpful intro, not RAG
_VAGUE_PATTERNS = re.compile(
    r'^\s*(zi[- ]?mi ceva|spune[- ]?mi ceva|ce (stii|știi|poti|poți)|'
    r'cu ce (ma|mă) (poti|poți) ajuta|ajuta[- ]?ma|ajută[- ]?mă|'
    r'ce (faci|face?i)|ce (poti|poți) (sa |să )?(faci|face?i)|'
    r'ce (informatii|informații) (ai|aveti|aveți)|'
    r'despre ce (stii|știi)|ce (stii|știi) (sa |să )?(faci|face?i)|'
    r'prezinta[- ]?te|prezintă[- ]?te|cine esti|cine ești|'
    r'hai sa vorbim|hai să vorbim|vreau sa (stiu|știu)|'
    r'am nevoie de ajutor|am o (intrebare|întrebare)|'
    r'zi[- ]?mi|spune[- ]?mi)\s*'
    r'(legat de ce (stii|știi)|despre ce (stii|știi)|de ce (stii|știi))?\s*[?!.,]*\s*$',
    re.IGNORECASE
)

_VAGUE_RESPONSE = (
    "Sunt asistentul virtual al primăriei și te pot ajuta cu următoarele subiecte:\n\n"
    "📋 **Proceduri administrative** — concesionări, licitații, autorizări\n"
    "📜 **Legislație** — Codul Administrativ (OUG 57/2019), hotărâri de consiliu local\n"
    "🏛️ **Administrație publică** — atribuțiile primarului, consiliului local, funcționarilor publici\n"
    "💰 **Buget și taxe** — impozite locale, bugetul unităților administrativ-teritoriale\n"
    "🏗️ **Urbanism** — amenajarea teritoriului, certificat de urbanism\n"
    "📎 **Servicii publice** — servicii deconcentrate, obligații de serviciu public\n\n"
    "Pune-mi o întrebare concretă și te ajut! 😊"
)


def _is_greeting(text: str) -> bool:
    """Check if the message is a simple greeting."""
    return bool(_GREETING_PATTERNS.match(text.strip()))


def _is_vague(text: str) -> bool:
    """Check if the message is a vague/general question."""
    return bool(_VAGUE_PATTERNS.match(text.strip()))


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

    prompt = f"""DOCUMENTE RELEVANTE:
{context_text}
{history_text}
ÎNTREBARE: {question}

Instrucțiuni: Răspunde SCURT (2-3 propoziții), în română corectă cu diacritice, DOAR din documentele de mai sus. Citează articolele exact. NU inventa. NU adăuga "Nu am găsit" dacă ai documente relevante."""

    return prompt


def ask_question(
    question: str,
    chat_history: list[dict] | None = None,
    top_k: int = 3,
    threshold: float = 0.35,
) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant document chunks
    2. Build prompt with context
    3. Generate answer with helpdesk-ro
    4. Return answer with sources
    """
    # Handle greetings without hitting RAG
    if _is_greeting(question):
        return {
            "answer": _GREETING_RESPONSE,
            "sources": [],
            "chunks_used": 0,
        }

    # Handle vague/general questions
    if _is_vague(question):
        return {
            "answer": _VAGUE_RESPONSE,
            "sources": [],
            "chunks_used": 0,
        }

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
    top_k: int = 3,
    threshold: float = 0.35,
) -> AsyncGenerator[dict, None]:
    """
    Streaming RAG pipeline - yields answer tokens one at a time.
    First yields sources, then streams answer chunks.
    """
    # Handle greetings instantly
    if _is_greeting(question):
        yield {"type": "sources", "data": []}
        yield {"type": "metadata", "data": {"chunks_used": 0}}
        yield {"type": "token", "data": _GREETING_RESPONSE}
        yield {"type": "done", "data": ""}
        return

    # Handle vague/general questions instantly
    if _is_vague(question):
        yield {"type": "sources", "data": []}
        yield {"type": "metadata", "data": {"chunks_used": 0}}
        yield {"type": "token", "data": _VAGUE_RESPONSE}
        yield {"type": "done", "data": ""}
        return

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
