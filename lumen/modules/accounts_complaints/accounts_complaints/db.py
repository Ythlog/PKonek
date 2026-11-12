"""SQLAlchemy engine and session for Aiven MySQL (SSL required)."""
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set (expected in lumen/.env).")

    connect_args: dict = {}
    ca_path = settings.ssl_ca_path()
    if ca_path is not None:
        if not ca_path.is_file():
            raise RuntimeError(
                f"DB_SSL_CA points to {ca_path}, which does not exist. "
                "Download the CA certificate from the Aiven console (Service > Overview > CA certificate)."
            )
        connect_args["ssl"] = {"ca": str(ca_path)}

    return create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    session = get_sessionmaker()()
    try:
        yield session
    finally:
        session.close()
