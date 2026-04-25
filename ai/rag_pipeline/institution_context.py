"""Hardcoded institution info (program, salariu, sărbători, concedii) per category.

These answers are baked into the code (no DB lookup, no document chunks, no RAG)
because they're stable category-level facts about the institution that should
ALWAYS produce the same correct answer instantly.

Public API (unchanged for backward compat):
- detect_institution_intent(question) -> str | None
- get_institution_answer(question)    -> str | None  (hardcoded direct answer)
- get_institution_context()           -> str         (formatted block for system prompt)
- invalidate_cache()                  -> None        (no-op kept for callers)
"""
from __future__ import annotations
import re

# ---------------------------------------------------------------------------
# Hardcoded answers per institutional category.
# Edit the strings below to update what the AI says — no DB migration needed.
# ---------------------------------------------------------------------------

_HARDCODED: dict[str, dict[str, str]] = {
    "program_lucru": {
        "title": "Program de lucru",
        "content": (
            "Programul de lucru al instituției este de luni până vineri, "
            "între orele 09:00 și 17:00, cu pauză de masă între 12:00 și 13:00. "
            "Sâmbăta și duminica instituția este închisă."
        ),
    },
    "salariu": {
        "title": "Ziua plății salariului",
        "content": (
            "Salariul se plătește lunar, pe data de 15 a fiecărei luni. "
            "Dacă data de 15 cade într-o zi nelucrătoare (weekend sau sărbătoare legală), "
            "plata se efectuează în ultima zi lucrătoare anterioară."
        ),
    },
    "sarbatoare": {
        "title": "Sărbători legale (zile libere)",
        "content": (
            "Conform Codului Muncii (art. 139), zilele de sărbătoare legală în care nu se lucrează sunt:\n"
            "• 1 și 2 ianuarie — Anul Nou\n"
            "• 24 ianuarie — Ziua Unirii Principatelor Române\n"
            "• Vinerea Mare, prima și a doua zi de Paște\n"
            "• 1 mai — Ziua Muncii\n"
            "• 1 iunie — Ziua Copilului\n"
            "• Prima și a doua zi de Rusalii\n"
            "• 15 august — Adormirea Maicii Domnului\n"
            "• 30 noiembrie — Sfântul Andrei\n"
            "• 1 decembrie — Ziua Națională a României\n"
            "• 25 și 26 decembrie — Crăciunul"
        ),
    },
    "concediu": {
        "title": "Concedii",
        "content": (
            "Tipurile de concediu de care beneficiază angajații instituției:\n"
            "• Concediu de odihnă: 21 zile lucrătoare/an pentru vechime sub 5 ani, "
            "respectiv 25 zile lucrătoare/an pentru vechime peste 5 ani.\n"
            "• Concediu medical: acordat pe baza certificatului eliberat de medicul curant.\n"
            "• Concediu de maternitate: 126 zile (63 zile prenatal + 63 zile postnatal).\n"
            "• Concediu pentru creșterea copilului: până la împlinirea vârstei de 2 ani.\n"
            "• Concedii fără plată: în condițiile prevăzute de Codul Muncii."
        ),
    },
}

_TYPE_LABELS = {
    "program_lucru": "PROGRAM DE LUCRU",
    "salariu": "ZIUA SALARIULUI",
    "sarbatoare": "SĂRBĂTORI / ZILE LIBERE",
    "concediu": "CONCEDII",
}


# ---------------------------------------------------------------------------
# Intent detection — regex per category.
# These match the user's question and return the matching category key.
# ---------------------------------------------------------------------------

_QUERY_PATTERNS = {
    "program_lucru": re.compile(
        r"\b(program(?:ul)?(?:\s+de)?\s+(?:lucru|munc[aă]|institu[tț]ie)|"
        r"orar(?:ul)?(?:\s+de)?(?:\s+lucru|de\s+munc[aă])?|"
        r"la\s+ce\s+or[aă]\s+(?:se\s+(?:deschide|închide|inchide)|începe|termin[aă]|terminați|inchideți|deschideți)|"
        r"c[aâ]nd\s+(?:se\s+(?:deschide|închide|inchide)|începe|termin[aă])|"
        r"(?:în\s+)?ce\s+(?:zile|interval|or[ae]r?)\s+lucr[aă]ți|"
        r"pauz[aă](?:\s+de\s+masa)?|"
        r"or(?:ar|e)\s+(?:de\s+)?(?:public|primire))\b",
        re.IGNORECASE,
    ),
    "salariu": re.compile(
        # Only match temporal questions about WHEN salary is paid, NOT about amount.
        # Strategy: require BOTH a temporal keyword AND "salariu*"
        # Excludes: "ce salariu am", "cat e salariul" (asks for amount, not date)
        r"(?:"
        # Temporal phrase before "salariu"
        r"\b(?:zi(?:ua)?(?:\s+de)?|c[aâ]nd|data|plata|[iî]n\s+ce\s+(?:zi|dat[aă])|"
        r"care\s+dat[aă]|ce\s+dat[aă]|primesc|primim|cade|vine|achit[aă])\s+"
        r"(?:[a-zăâîșțA-ZĂÂÎȘȚ]+\s+)*?"
        r"salar(?:iu|iul|iului|iile|iilor|i)?\b"
        r"|"
        # OR: "salariu" followed by temporal context
        r"\bsalar(?:iu|iul|iului|iile|i)\s+"
        r"(?:[iî]n\s+fiecare\s+lun[aă]|lunar|c[aâ]nd|cade|vine)\b"
        r"|"
        r"\bzi(?:ua)?\s+salar(?:iu|iul|iului|i)\b"
        r")",
        re.IGNORECASE,
    ),
    "sarbatoare": re.compile(
        r"\b(s[aă]rb[aă]tor(?:i|e)|"
        r"zile?\s+liber[ae]?|"
        r"vacan[tț][aă]?|"
        r"(?:zi|zile|s[aă]pt[aă]m[aâ]n[aă])\s+nelucr[aă]toa?re|"
        r"pa[sș]te(?:le)?|cr[aă]ciun(?:ul)?|anul\s+nou|"
        r"1\s+(?:mai|iunie|decembrie))\b",
        re.IGNORECASE,
    ),
    "concediu": re.compile(
        r"\b(concedi[uiul]+|"
        r"odihn[aă]?|"
        r"(?:zile|c[aâ]te\s+zile)\s+(?:de\s+)?(?:concediu|odihn[aă]|liber[ae])|"
        r"perioad[aă]\s+(?:de\s+)?concediu)\b",
        re.IGNORECASE,
    ),
}


def detect_institution_intent(question: str) -> str | None:
    """Returns the institution category if the question matches one, else None."""
    q = question.lower().strip()
    for type_key, pattern in _QUERY_PATTERNS.items():
        if pattern.search(q):
            return type_key
    return None


# ---------------------------------------------------------------------------
# Direct answer (fast-path, bypasses LLM).
# ---------------------------------------------------------------------------

def get_institution_answer(question: str) -> str | None:
    """If the question is institutional, return the hardcoded answer for that category.
    Returns None if no match — callers should fall through to RAG/LLM in that case.
    """
    intent = detect_institution_intent(question)
    if not intent:
        return None
    item = _HARDCODED.get(intent)
    if not item:
        return None
    return f"**{item['title']}**\n\n{item['content']}"


# ---------------------------------------------------------------------------
# Context block for system prompt injection — gives the LLM all institutional
# facts so it can answer naturally even when the fast-path doesn't fire.
# ---------------------------------------------------------------------------

def get_institution_context() -> str:
    """Returns all hardcoded institution info as a single formatted string,
    ready to inject into the LLM system prompt.
    """
    sections = []
    for type_key, label in _TYPE_LABELS.items():
        item = _HARDCODED.get(type_key)
        if not item:
            continue
        sections.append(f"### {label}\n• {item['title']}: {item['content']}")
    return "\n\n".join(sections)


def invalidate_cache() -> None:
    """No-op kept for backward compatibility (no DB cache anymore)."""
    return None
