from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "helpdesk-ro"
    EMBEDDING_MODEL: str = "bge-m3"
    EMBEDDING_DIMENSION: int = 1024
    CHUNK_SIZE: int = 300
    CHUNK_OVERLAP: int = 75
    RETRIEVAL_TOP_K: int = 6
    RETRIEVAL_THRESHOLD: float = 0.35

    class Config:
        env_file = [".env", "ai/.env"]


settings = Settings()
