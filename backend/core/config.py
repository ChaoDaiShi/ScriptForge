"""
Configuration settings.
Loads environment variables and provides application settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    # FastAPI settings
    app_name: str = "ScriptForge API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000

    # CORS settings
    frontend_origin: str = "http://localhost:5173"

    # Database settings
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    # AI API settings
    ai_api_key: Optional[str] = None
    ai_api_base: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()
