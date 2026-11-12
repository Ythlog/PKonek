"""SQLAlchemy Core engine and transaction helpers."""

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine

from .config import get_settings


def make_engine(database_url: str | None = None) -> Engine:
    url = database_url or get_settings().database_url
    return create_engine(url, pool_pre_ping=True, future=True)


engine = make_engine()


@contextmanager
def transaction(connection_engine: Engine = engine) -> Iterator[Connection]:
    """Yield a connection in a transaction, committing or rolling back."""
    with connection_engine.connect() as connection:
        trans = connection.begin()
        try:
            yield connection
        except BaseException:
            trans.rollback()
            raise
        else:
            trans.commit()

