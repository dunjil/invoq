"""Application configuration."""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """App settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/invoq"

    # Anthropic (Claude)
    anthropic_api_key: str = ""

    # App
    cors_origins: str = "http://localhost:3000"
    temp_file_dir: str = "/tmp/invoq"
    secret_key: str = "change-me-to-a-random-secret"

    # Stripe
    stripe_secret_key: str = ""
    stripe_price_id: str = ""  # Pro subscription price ID
    stripe_webhook_secret: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Ensure temp dir exists
os.makedirs(settings.temp_file_dir, exist_ok=True)
