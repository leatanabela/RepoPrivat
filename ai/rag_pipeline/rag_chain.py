from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.rag_pipeline.institution_context import get_institution_context
from ai.chat_service.llm import generate_response, generate_response_stream
from ai.config import settings
from collections.abc import AsyncGenerator
import asyncio
import re

SYSTEM_PROMPT = """Ești asistentul AI al primăriei. Răspunzi DOAR pe baza documentelor furnizate, în limba română corectă cu diacritice (ă, â, î, ș, ț).

REGULI STRICTE:
- Răspunde EXACT la întrebarea pusă. NU răspunde la o altă întrebare doar pentru că ai găsit ceva în documente.
- Dacă documentele NU conțin răspunsul la întrebarea specifică, spune: "Nu am găsit informații despre [subiect] în documentele disponibile."
- NU forța un răspuns din documente care nu se potrivesc. E mai bine să spui „nu am găsit" decât să dai un răspuns incorect.
- Folosește EXACT informațiile din documente. NU parafraza greșit, NU inventa detalii.
- Fii CONCIS: maxim 2-3 propoziții clare.
- CITARE CORECTĂ: Pune articolul și numele documentului în paranteze, DIRECT. Exemple:
  ✓ "(art. 116 alin. 8 din Statutul personalului)"
  ✓ "(art. 71 din Legea executare pedepse)"
  ✓ "(art. 478 din OUG 57/2019)"
  ✗ NICIODATĂ NU scrie: "(Sursa 1)", "(Sursa 2)", "(ART. 71, Sursa 3)"
- NU folosi niciodată cuvântul "Sursa" urmat de cifră. Folosește DIRECT numele documentului din eticheta [Document: "..."].
- Limba română CORECTĂ cu diacritice.
- NU termina cu fraze inutile ca "Sper că te-am ajutat!".
- Off-topic → "Îmi pare rău, nu pot ajuta cu acest subiect. Sunt specializat doar pe proceduri administrative și legislație."
- Pentru proceduri, folosește liste numerotate.
- Dacă utilizatorul scrie greșit (typos), interpretează ce a vrut să spună și răspunde normal.

ÎNTREBĂRI VAGI sau AMBIGUE:
- Dacă întrebarea e prea scurtă sau ambiguă (ex: "concediu", "buletin", "ajutor", "ce fac?"), NU inventa răspuns. Cere clarificare.
- Pentru întrebări cu răspunsuri diferite pe categorii, întreabă care categorie se aplică. Exemplu:
  * "Cate zile de concediu am?" → "Pentru a-ți da răspunsul exact, te rog să specifici: ești funcționar public, polițist de penitenciare, cadru didactic sau alt tip de personal?"
  * "Care e programul?" → "Te rog să specifici: programul de lucru pentru angajați, programul cu publicul, sau programul unei ședințe?"
- Dacă documentele conțin informații contradictorii (ex: 21 zile vs 32 zile concediu), menționează TOATE variantele cu sursele lor, nu alege una singură.

DETECTEAZĂ INTENȚIA utilizatorului înainte să răspunzi:
1. **ÎNTREBARE INFORMATIVĂ** (ex: "care sunt drepturile...", "ce documente...", "cum se face..."):
   → Caută în documente și răspunde concis cu citări.
2. **PLÂNGERE/PROBLEMĂ** (ex: "am o problemă cu...", "nu merge...", "cererea a fost respinsă..."):
   → Oferă informații relevante DACA exista, apoi sugerează: "Pentru rezolvarea acestei probleme specifice, vă recomand să creați un tichet."
3. **PROCEDURĂ/PAȘI** (ex: "cum să fac...", "unde depun...", "ce pași trebuie..."):
   → Răspunde cu LISTĂ NUMEROTATĂ (1, 2, 3...) de pași concreți din documente.
4. **DEFINIȚIE/EXPLICAȚIE** (ex: "ce înseamnă...", "ce este..."):
   → Explică pe scurt, folosind definiția exactă din document.
5. **COMPARAȚIE** (ex: "care e diferența dintre X și Y?"):
   → Structurează cu bullet points separat pentru fiecare variantă.
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
    # Build context section - each chunk labeled with its document title directly
    if context_chunks:
        context_parts = []
        for chunk in context_chunks:
            source = chunk.get("document_title", "Document necunoscut")
            context_parts.append(
                f"[Document: \"{source}\"]\n{chunk['content']}"
            )
        context_text = "\n\n---\n\n".join(context_parts)
    else:
        context_text = "Nu s-au găsit documente relevante pentru această întrebare."

    # Institution-specific info (program, salariu, sărbători, concedii) — admin-managed
    # This is injected as PRIORITY context because it's official, current, and authoritative.
    institution_context = get_institution_context()
    institution_section = ""
    if institution_context:
        institution_section = f"""INFORMAȚII OFICIALE INSTITUȚIE (date introduse de administrator — sursă autoritară):
{institution_context}

"""

    # Build chat history section
    history_text = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-4:]:  # Keep last 4 messages for context
            role = "Utilizator" if msg["role"] == "user" else "Asistent"
            history_parts.append(f"{role}: {msg['content']}")
        history_text = f"\nConversația anterioară:\n" + "\n".join(history_parts) + "\n"

    prompt = f"""{institution_section}DOCUMENTE RELEVANTE:
{context_text}
{history_text}
ÎNTREBARE: {question}

Instrucțiuni:
1. Răspunde EXACT la întrebarea pusă. Dacă utilizatorul întreabă despre „vacanță de Paște", NU răspunde despre concediu de creștere copil.
2. PRIORITATE: dacă întrebarea e despre programul instituției, ziua salariului, sărbători, concedii sau orice info administrativă internă, folosește SECȚIUNEA „INFORMAȚII OFICIALE INSTITUȚIE" — aceea e sursă autoritară.
3. Dacă întrebarea e despre legislație sau proceduri, folosește documentele relevante.
4. Dacă documentele NU au NICIO legătură cu întrebarea și nici „INFORMAȚII OFICIALE INSTITUȚIE" nu acoperă subiectul, spune: „Nu am găsit informații despre [subiect] în documentele disponibile. Puteți crea un tichet pentru asistență."
5. Dacă utilizatorul descrie o PROBLEMĂ sau PLÂNGERE (certificat respins, cerere fără răspuns, etc.), oferă informații relevante din documente ȘI sugerează crearea unui tichet.
6. CITARE: pentru info din documente, citează în paranteze DIRECT articolul/alineatul ȘI numele documentului. Pentru info din „INFORMAȚII OFICIALE INSTITUȚIE", nu e nevoie de citare formală.
   Format corect documente: "(art. 71 alin. 2 din Legea executare pedepse)"
   Format INCORECT: "(Sursa 1)", "(Sursa 3)"
7. Răspunde SCURT (2-3 propoziții), în română corectă cu diacritice.
8. NU inventa informații care nu sunt în documente sau în secțiunea „INFORMAȚII OFICIALE INSTITUȚIE"."""

    return prompt


async def ask_question(
    question: str,
    chat_history: list[dict] | None = None,
    top_k: int | None = None,
    threshold: float | None = None,
) -> dict:
    """
    Full RAG pipeline (async - doesn't block event loop):
    1. Retrieve relevant document chunks
    2. Build prompt with context
    3. Generate answer with helpdesk-ro
    4. Return answer with sources
    """
    top_k = top_k if top_k is not None else settings.RETRIEVAL_TOP_K
    threshold = threshold if threshold is not None else settings.RETRIEVAL_THRESHOLD

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

    # Step 1: Retrieve (sync Supabase call in thread)
    chunks = await asyncio.to_thread(retrieve_relevant_chunks, question, top_k, threshold)

    # Step 2: Build prompt
    prompt = _build_prompt(question, chunks, chat_history)

    # Step 3: Generate (async, non-blocking)
    answer = await generate_response(prompt, system_prompt=SYSTEM_PROMPT)

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
    top_k: int | None = None,
    threshold: float | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Streaming RAG pipeline - yields answer tokens one at a time.
    First yields sources, then streams answer chunks.
    """
    top_k = top_k if top_k is not None else settings.RETRIEVAL_TOP_K
    threshold = threshold if threshold is not None else settings.RETRIEVAL_THRESHOLD

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

    # Retrieve (sync Supabase call in thread)
    chunks = await asyncio.to_thread(retrieve_relevant_chunks, question, top_k, threshold)

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
