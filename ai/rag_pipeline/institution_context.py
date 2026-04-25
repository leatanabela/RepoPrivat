"""Fetch institution info (program, salariu, sărbători, concedii) to inject into AI prompt.

This is a lightweight, cached helper that pulls from the institution_info Supabase table
and formats it as additional context for the LLM. No embeddings, no RAG complexity —
just direct text injection so the AI always knows the latest institution rules.
"""
from typing import Any
import time
from ai.supabase_client import get_supabase

# Cache for 60 seconds to avoid hitting DB on every chat message
_CACHE: dict[str, Any] = {"data": None, "timestamp": 0}
_CACHE_TTL_SECONDS = 60

_TYPE_LABELS = {
    "program_lucru": "PROGRAM DE LUCRU",
    "salariu": "ZIUA SALARIULUI",
    "sarbatoare": "SĂRBĂTORI / ZILE LIBERE",
    "concediu": "CONCEDII",
    "altele": "ALTE INFORMAȚII",
}


def _format_item(item: dict) -> str:
    """Format a single institution_info row as readable text for the LLM."""
    lines = [f"• {item['title']}: {item['content']}"]
    if item.get("date_from") or item.get("date_to"):
        date_parts = []
        if item.get("date_from"):
            date_parts.append(f"de la {item['date_from']}")
        if item.get("date_to"):
            date_parts.append(f"până la {item['date_to']}")
        lines.append(f"  ({' '.join(date_parts)})")
    return "\n".join(lines)


def get_institution_context() -> str:
    """Returns formatted institution info as a string ready to inject in system prompt.

    Returns empty string if no info exists or on error (fails safely).
    Cached for 60 seconds.
    """
    now = time.time()
    if _CACHE["data"] is not None and (now - _CACHE["timestamp"]) < _CACHE_TTL_SECONDS:
        return _CACHE["data"]

    try:
        sb = get_supabase()
        result = sb.table("institution_info").select(
            "type, title, content, date_from, date_to"
        ).order("type", desc=False).execute()
        rows = result.data or []
    except Exception as e:
        # Fail safe — never break the AI if DB is unavailable
        print(f"[institution_context] Error fetching: {e}")
        _CACHE["data"] = ""
        _CACHE["timestamp"] = now
        return ""

    if not rows:
        _CACHE["data"] = ""
        _CACHE["timestamp"] = now
        return ""

    # Group by type
    by_type: dict[str, list[dict]] = {}
    for row in rows:
        by_type.setdefault(row["type"], []).append(row)

    # Build formatted text
    sections = []
    for type_key, label in _TYPE_LABELS.items():
        items = by_type.get(type_key, [])
        if not items:
            continue
        formatted = "\n".join(_format_item(it) for it in items)
        sections.append(f"### {label}\n{formatted}")

    context = "\n\n".join(sections)
    _CACHE["data"] = context
    _CACHE["timestamp"] = now
    return context


def invalidate_cache() -> None:
    """Force refresh of cache (call after admin changes)."""
    _CACHE["data"] = None
    _CACHE["timestamp"] = 0


# Detection patterns for institutional questions
import re

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
        # The temporal context can be before or after "salariu*"
        # Excludes: "ce salariu am", "cat e salariul" (asks for amount, not date)
        r"(?:"
        # Temporal phrase before "salariu"
        r"\b(?:zi(?:ua)?(?:\s+de)?|c[aâ]nd|data|plata|[iî]n\s+ce\s+(?:zi|dat[aă])|"
        r"care\s+dat[aă]|ce\s+dat[aă]|primesc|primim|cade|vine|achit[aă])\s+"
        r"(?:[a-zăâîșțA-ZĂÂÎȘȚ]+\s+)*?"  # any words in between
        r"salar(?:iu|iul|iului|iile|iilor|i)?\b"
        r"|"
        # OR: "salariu" followed by temporal context
        r"\bsalar(?:iu|iul|iului|iile|i)\s+"
        r"(?:[iî]n\s+fiecare\s+lun[aă]|lunar|"
        r"c[aâ]nd|cade|vine)\b"
        r"|"
        # Standalone keyword phrases that strongly imply temporal
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
    """Returns the institution_info type if the question matches one,
    or None if it's not an institutional question."""
    q = question.lower().strip()
    for type_key, pattern in _QUERY_PATTERNS.items():
        if pattern.search(q):
            return type_key
    return None


def get_institution_answer(question: str) -> str | None:
    """If question matches an institutional topic, return a direct answer
    from institution_info table. Returns None if no match or no data.

    This bypasses the LLM entirely for guaranteed accurate responses.
    """
    intent = detect_institution_intent(question)
    if not intent:
        return None

    try:
        sb = get_supabase()
        result = sb.table("institution_info").select(
            "type, title, content, date_from, date_to"
        ).eq("type", intent).execute()
        rows = result.data or []
    except Exception as e:
        print(f"[institution_context] Error fetching answer: {e}")
        return None

    if not rows:
        return None

    # Format answer
    label = _TYPE_LABELS.get(intent, intent)
    if len(rows) == 1:
        item = rows[0]
        date_info = ""
        if item.get("date_from") or item.get("date_to"):
            parts = []
            if item.get("date_from"):
                parts.append(f"de la {item['date_from']}")
            if item.get("date_to"):
                parts.append(f"până la {item['date_to']}")
            date_info = f" ({' '.join(parts)})"
        return f"**{item['title']}**\n\n{item['content']}{date_info}"

    # Multiple items
    lines = [f"**{label}:**\n"]
    for item in rows:
        line = f"• **{item['title']}**: {item['content']}"
        if item.get("date_from") or item.get("date_to"):
            parts = []
            if item.get("date_from"):
                parts.append(f"de la {item['date_from']}")
            if item.get("date_to"):
                parts.append(f"până la {item['date_to']}")
            line += f" ({' '.join(parts)})"
        lines.append(line)
    return "\n".join(lines)
