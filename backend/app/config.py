from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "FarmsJose API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://farmsjose:farmsjose@localhost:5432/farmsjose"

    SECRET_KEY: str = "dev-secret-key-do-not-use-in-production-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    COOKIE_SECURE: bool = False

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM_NAME: str = "FarmsJose"

    ADMIN_EMAIL: str = "admin@farmsjose.com"
    ADMIN_PASSWORD: str = "admin123"

    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100

    PORT: int = 8001

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
