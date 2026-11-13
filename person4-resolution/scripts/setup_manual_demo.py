"""Create a local `pkonek_manual` database with sample data for hand-testing in /docs.

Covers only:
  - officials updating complaint status and adding progress notes
  - citizens seeing complaint updates
  - basic counts of open and resolved complaints

Safe to re-run: it drops and recreates `pkonek_manual` only. It never touches `pkonek`
or any other database. Defaults match XAMPP (root, empty password); override with
MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD.

Usage (from person4-resolution/):
    .\\.venv\\Scripts\\python.exe scripts\\setup_manual_demo.py
"""
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

DB_NAME = "pkonek_manual"
ROOT = Path(__file__).resolve().parent.parent

# Demo identities (use these as X-Dev-User-Id / X-Dev-Role in /docs).
CITIZEN_JUAN, CITIZEN_MARIA = 1, 2
OFFICIAL_ANA, OFFICIAL_BEN = 3, 4
ADMIN = 5
DEPT_ENGINEERING, DEPT_SANITATION = 1, 2


def _statements(sql: str):
    """Split the controlled schema files the same way tests/conftest.py does."""
    for statement in sql.split(";"):
        body = "\n".join(line for line in statement.strip().splitlines() if not line.lstrip().startswith("--"))
        normalized = " ".join(body.split()).upper()
        if normalized and not normalized.startswith(("CREATE DATABASE", "USE ")):
            yield body


def main() -> None:
    server = URL.create(
        "mysql+pymysql",
        username=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
    )
    admin = create_engine(server, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {DB_NAME}"))
        conn.execute(text(f"CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    admin.dispose()

    database = server.set(database=DB_NAME)
    engine = create_engine(database)
    with engine.begin() as conn:
        for path in (ROOT / "tests" / "fixtures" / "base_schema.sql", ROOT / "migrations" / "001_person4_resolution.sql"):
            for statement in _statements(path.read_text(encoding="utf-8")):
                conn.execute(text(statement))

        conn.execute(text("INSERT INTO departments(id,name) VALUES (1,'Engineering Office'),(2,'Sanitation Office')"))
        conn.execute(text("""
          INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES
          (1,1,'juan@demo.invalid','x','Juan','Dela Cruz'),
          (2,1,'maria@demo.invalid','x','Maria','Santos'),
          (3,2,'ana@demo.invalid','x','Ana','Reyes'),
          (4,2,'ben@demo.invalid','x','Ben','Lopez'),
          (5,3,'admin@demo.invalid','x','Pasig','Admin')"""))
        conn.execute(text("INSERT INTO official_profiles(user_id,department_id) VALUES (3,1),(4,2)"))

        # Category ids come from base_schema.sql: 1 Roads and Sidewalks, 2 Waste and Sanitation.
        # Status ids: 1 submitted, 3 in_progress, 5 resolved.
        conn.execute(text("""
          INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,assigned_official_id,
                                 title,description,latitude,longitude,ai_severity) VALUES
          (1,1,1,1,1,3,'Pothole on Caruncho Ave','Large pothole near the market.',14.5764,121.0851,'high'),
          (2,2,1,3,1,3,'Broken sidewalk on Shaw Blvd','Cracked slabs are a tripping hazard.',14.5812,121.0623,'medium'),
          (3,1,1,5,1,3,'Missing manhole cover','Open manhole on a side street.',14.5701,121.0790,'critical'),
          (4,2,2,1,2,4,'Uncollected garbage in Kapitolyo','Garbage not collected for 3 days.',14.5730,121.0610,'medium'),
          (5,1,2,5,2,4,'Overflowing bin at the park','Public bin overflowing.',14.5755,121.0700,'low')"""))
        conn.execute(text("""
          INSERT INTO complaint_status_history(complaint_id,old_status_id,new_status_id,changed_by,change_source,note) VALUES
          (1,NULL,1,1,'citizen','Complaint submitted'),
          (2,NULL,1,2,'citizen','Complaint submitted'),
          (3,NULL,1,1,'citizen','Complaint submitted'),
          (4,NULL,1,2,'citizen','Complaint submitted'),
          (5,NULL,1,1,'citizen','Complaint submitted')"""))
        # An "after" photo row so complaint 1 can be marked done (resolved_pending_verification).
        conn.execute(text("""
          INSERT INTO complaint_media(id,complaint_id,uploaded_by,media_type,storage_url,mime_type)
          VALUES (1,1,3,'after','https://example.invalid/after-pothole.jpg','image/jpeg')"""))
    engine.dispose()

    password = os.getenv("MYSQL_PASSWORD", "")
    env_path = ROOT / ".env.demo"
    env_path.write_text(
        f"DATABASE_URL={database.render_as_string(hide_password=False)}\n"
        f"APP_ENV=dev\nAPI_PREFIX=/api\n",
        encoding="utf-8",
    )
    print(f"Created database '{DB_NAME}' with demo data.")
    print(f"Wrote {env_path.name} (MySQL user '{server.username}', password {'set' if password else 'empty'}).")
    print("Start the app:  .\\.venv\\Scripts\\python.exe -m uvicorn resolution.dev_app:app --app-dir . --env-file .env.demo")
    print("Then open:      http://127.0.0.1:8000/docs   (see scripts/MANUAL_DEMO.md)")


if __name__ == "__main__":
    main()
