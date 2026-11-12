"""MySQL integration fixture; requires a local MySQL 8 server and credentials."""

import os
import socket
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL


ROOT = Path(__file__).parent


@pytest.fixture(scope="session")
def mysql_test_engine():
    """Create pkonek_test from the checked-in base snapshot and Person 4 migration."""
    admin_url = URL.create(
        "mysql+pymysql",
        username=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "root"),
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
    )
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    try:
        with socket.create_connection((host, port), timeout=1):
            pass
    except OSError:
        pytest.skip(f"MySQL is not reachable at {host}:{port}")
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 2})
    with admin.connect() as connection:
        connection.execute(text("CREATE DATABASE IF NOT EXISTS pkonek_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    database_url = admin_url.set(database="pkonek_test")
    engine = create_engine(database_url, pool_pre_ping=True)
    with engine.connect() as connection:
        # MySQL accepts one statement per execute; split this controlled snapshot by semicolon.
        for statement in (ROOT / "fixtures" / "base_schema.sql").read_text(encoding="utf-8").split(";"):
            sql = statement.strip()
            uncommented = "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))
            normalized = " ".join(uncommented.split()).upper()
            if normalized and not normalized.startswith(("CREATE DATABASE", "USE PKONEK")):
                connection.execute(text(uncommented))
        migration = (ROOT.parent / "migrations" / "001_person4_resolution.sql").read_text(encoding="utf-8")
        for statement in migration.split(";"):
            if statement.strip():
                connection.execute(text(statement.strip()))
    yield engine
    engine.dispose()
    admin.dispose()
