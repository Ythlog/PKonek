"""Environment-based application settings."""

from functools import lru_cache
import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str = "mysql+pymysql://root:root@127.0.0.1:3306/pkonek"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    app_env: str = "dev"
    api_prefix: str = "/api"
    sla_job_interval_minutes: int = 5
    sla_warning_ratio: float = 0.75
    escalation_l2_grace_ratio: float = 0.5
    reopen_sla_ratio: float = 0.5
    reopen_sla_min_hours: int = 4
    verification_timeout_days: int = 7


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", Settings.database_url),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        app_env=os.getenv("APP_ENV", "dev"),
        api_prefix=os.getenv("API_PREFIX", "/api"),
        sla_job_interval_minutes=int(os.getenv("SLA_JOB_INTERVAL_MINUTES", "5")),
        sla_warning_ratio=float(os.getenv("SLA_WARNING_RATIO", "0.75")),
        escalation_l2_grace_ratio=float(os.getenv("ESCALATION_L2_GRACE_RATIO", "0.5")),
        reopen_sla_ratio=float(os.getenv("REOPEN_SLA_RATIO", "0.5")),
        reopen_sla_min_hours=int(os.getenv("REOPEN_SLA_MIN_HOURS", "4")),
        verification_timeout_days=int(os.getenv("VERIFICATION_TIMEOUT_DAYS", "7")),
    )

