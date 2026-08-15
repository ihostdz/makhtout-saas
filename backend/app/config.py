from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://makhtout:makhtout_secret@localhost:5432/makhtout_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "makhtout"
    MINIO_SECRET_KEY: str = "makhtout_secret"
    MINIO_BUCKET: str = "documents"
    SECRET_KEY: str = "super_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Paiement
    CHARGILY_API_KEY: Optional[str] = None
    CHARGILY_SECRET: Optional[str] = None
    CHARGILY_BASE_URL: str = "https://pay.chargily.net/test/api/v2"

    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"

    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
