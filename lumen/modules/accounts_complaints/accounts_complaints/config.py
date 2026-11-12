"""Settings for the accounts/complaints module.

Reads the shared ``lumen/.env`` (same variable names as ``apps/api``) plus a few
module-specific values that all have defaults.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# lumen/modules/accounts_complaints/accounts_complaints/config.py -> lumen/
LUMEN_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=LUMEN_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Shared with apps/api
    DATABASE_URL: str = ""
    DB_SSL_CA: str = ""
    JWT_SECRET: str = "change-me"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    # Duplicate detection
    DUP_RADIUS_M: float = 50.0
    DUP_WINDOW_DAYS: int = 7
    DUP_LOCK_TIMEOUT_S: int = 5

    # Pasig City bounding box (required pin must fall inside)
    PASIG_MIN_LAT: float = 14.53
    PASIG_MAX_LAT: float = 14.62
    PASIG_MIN_LNG: float = 121.05
    PASIG_MAX_LNG: float = 121.11

    # Public endpoint rate limit (per IP)
    PUBLIC_RATE_LIMIT_PER_MIN: int = 10

    def ssl_ca_path(self) -> Path | None:
        """Resolve DB_SSL_CA; relative paths are relative to the lumen/ folder."""
        if not self.DB_SSL_CA:
            return None
        path = Path(self.DB_SSL_CA)
        if not path.is_absolute():
            path = (LUMEN_ROOT / path).resolve()
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
