"""Singleton Supabase client to avoid re-creating on every request."""
from functools import lru_cache
from supabase import Client, create_client

from ai.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Get the singleton Supabase client instance."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
