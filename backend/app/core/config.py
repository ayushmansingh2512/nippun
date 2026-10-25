import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "A24 Multi-Agent Healthcare Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database (Neon PostgreSQL exclusively)
    DATABASE_URL: str = "postgresql://neondb_owner:npg_pe1M3bJkGoHd@ep-sparkling-sound-b48yohvp-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    
    # Cloudflare Proxy for Gemini Key Rotation
    CLOUDFLARE_GEMINI_PROXY_URL: str = "http://127.0.0.1:8787"
    INTERNAL_PROXY_SECRET: str = "a24-healthcare-internal-key-secret-2026"
    GEMINI_DIRECT_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Google OAuth / Workspace
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GMAIL_SENDER_EMAIL: str = "concierge@a24med.ai"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env",
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
