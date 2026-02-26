from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    database_url: str = "postgresql://postgres:postgres@localhost:5432/shipping_agent"
    app_name: str = "Shipping Risk Intelligence Service"
    app_env: str = "local"

    # LLM / OpenAI-compatible settings (sandlogic gateway)
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
