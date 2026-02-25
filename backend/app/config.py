from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    weather_api_key: str = ""
    weather_days_forecast: int = 3
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    host: str = "0.0.0.0"
    port: int = 8000


settings = Settings()
