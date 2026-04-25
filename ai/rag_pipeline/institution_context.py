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
