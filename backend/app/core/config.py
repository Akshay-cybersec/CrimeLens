from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CrimeLens Digital Forensic Intelligence"
    environment: Literal["local", "dev", "staging", "prod"] = "local"
    debug: bool = False

    api_prefix: str = "/api/v1"

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "crimelens"

    redis_url: str = "redis://localhost:6379/0"
    redis_enabled: bool = True

    jwt_secret_key: str = Field(default="change-me", min_length=16)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    deepinfra_api_key: str = ""
    deepinfra_base_url: str = "https://api.deepinfra.com/v1/openai"
    deepinfra_llm_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct"
    deepinfra_embedding_model: str = "BAAI/bge-large-en-v1.5"
    deepinfra_temperature: float = 0.1

    vector_backend: Literal["chromadb_cloud"] = "chromadb_cloud"
    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = ""
    chroma_collection_events: str = "case_events"
    chroma_collection_cases: str = "case_summaries"
    embedding_dimensions: int = 1024

    max_upload_size_mb: int = 50
    rate_limit_per_minute: int = 120
    insight_cache_ttl_seconds: int = 600
    insight_regenerate_cooldown_seconds: int = 60
    behavior_cache_ttl_seconds: int = 600

    super_admin_email: str = "superadmin@crimelens.local"
    super_admin_password: str = "change-super-admin-password"
    super_admin_full_name: str = "Super Admin"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
