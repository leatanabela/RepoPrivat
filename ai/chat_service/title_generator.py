"""Generate short, descriptive titles for chat conversations using the LLM.

Used for the chat history sidebar — replaces truncated first message with
a 3-5 word summary like "Programul de Paste" or "Concediu medical".
"""
import asyncio
import logging
import re
from ai.chat_service.llm import generate_response
from ai.supabase_client import get_supabase

logger = logging.getLogger(__name__)

TITLE_SYSTEM_PROMPT = """Ești un generator de titluri-sumar scurte pentru conversații.
Primești o întrebare/mesaj de la utilizator și răspunzi DOAR cu un titlu-sumar
care surprinde subiectul principal al întrebării, în română corectă cu diacritice.

REGULI STRICTE:
- 3-7 cuvinte (preferabil 4-6)
- Capturează cuvintele-cheie esențiale ale întrebării
- Fără ghilimele, fără punct/semn de exclamare la final
- Fără prefixe ca "Întrebare despre", "Discuție despre", "Cum"
- Capitalizează prima literă; restul în litere mici (decât numele proprii)
- Sună natural — ca un titlu de articol sau capitol

EXEMPLE:
Mesaj: "Cum pot solicita un certificat de urbanism?"
Titlu: Solicitare certificat de urbanism

Mesaj: "Care este programul în perioada de Paște?"
Titlu: Program în perioada Paștelui

Mesaj: "Vreau să știu câte zile de concediu medical am voie"
Titlu: Zile de concediu medical

Mesaj: "Când se dă salariul în această lună?"
Titlu: Data plății salariului

Mesaj: "Cum fac un tichet pentru imprimanta stricată?"
Titlu: Tichet imprimantă defectă

Mesaj: "Care sunt drepturile deținuților în penitenciar?"
Titlu: Drepturile deținuților din penitenciar

Mesaj: "Cum se face promovarea în grad profesional?"
Titlu: Promovare în grad profesional

Mesaj: "Vreau să fac o reclamație despre certificatul de urbanism respins"
Titlu: Reclamație certificat urbanism respins

Mesaj: "Ce documente sunt necesare pentru autorizația de construire?"
Titlu: Documente autorizație de construire

Mesaj: "Care sunt sancțiunile disciplinare pentru funcționari?"
Titlu: Sancțiuni disciplinare funcționari

Mesaj: "Cum se acordă concediul de odihnă?"
Titlu: Acordare concediu de odihnă
"""


def _clean_title(raw: str) -> str:
    """Strip quotes, prefixes, trailing punctuation, ensure max 5 words."""
    title = raw.strip()
    # Remove surrounding quotes
    title = re.sub(r'^["\'`„""]+|["\'`„""]+$', '', title)
    # Remove "Titlu:" prefix if model adds it
    title = re.sub(r'^(titlu|title)\s*:\s*', '', title, flags=re.IGNORECASE)
    # Remove trailing punctuation
    title = re.sub(r'[.!?]+$', '', title).strip()
    # Cap to 7 words (allows for a more descriptive summary while staying compact)
    words = title.split()
    if len(words) > 7:
        title = ' '.join(words[:7])
    # Capitalize first letter if not already
    if title and title[0].islower():
        title = title[0].upper() + title[1:]
    return title


async def generate_title(question: str) -> str:
    """Generate a short title for a conversation based on the first user message.

    Returns a short Romanian title (max 5 words). Falls back to truncated question
    if AI generation fails.
    """
    # Truncated fallback if anything fails
    fallback = question.strip()
    if len(fallback) > 35:
        truncated = fallback[:35]
        last_space = truncated.rfind(' ')
        fallback = (truncated[:last_space] if last_space > 12 else truncated) + '...'
    if fallback:
        fallback = fallback[0].upper() + fallback[1:]

    try:
        raw = await generate_response(
            prompt=f"Mesaj: \"{question.strip()}\"\nTitlu:",
            system_prompt=TITLE_SYSTEM_PROMPT,
        )
        cleaned = _clean_title(raw)
        if not cleaned or len(cleaned) < 3:
            return fallback
        return cleaned
    except Exception as e:
        logger.warning(f"[generate_title] LLM failed, using fallback: {e}")
        return fallback


async def generate_and_save_title(session_id: str, question: str) -> dict:
    """Generate a title and save it directly to chat_sessions table.

    Returns: { "title": str, "session_id": str, "saved": bool }
    """
    title = await generate_title(question)

    try:
        sb = get_supabase()
        # Only update if title is still default (avoid overwriting user-set titles)
        # We update unconditionally because this is called only on first message.
        sb.table("chat_sessions").update({"title": title}).eq("id", session_id).execute()
        return {"title": title, "session_id": session_id, "saved": True}
    except Exception as e:
        logger.error(f"[generate_and_save_title] Save failed: {e}")
        return {"title": title, "session_id": session_id, "saved": False}
