# Person 4: Resolution workflow foundation

This isolated FastAPI component provides the resolution package scaffold, environment settings, a SQLAlchemy Core transaction helper, an authentication seam, and an additive MySQL migration. No complaint workflow handlers are included in this step.

## Requirements

- Python 3.11+
- MySQL 8 for the integration fixture

Create a virtual environment in this folder and install dependencies:

```powershell
cd person4-resolution
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env` for a local run. Start the standalone development app with `uvicorn resolution.dev_app:app --app-dir . --reload`.

## Tests

The smoke test imports the app and exercises its OpenAPI endpoint without requiring MySQL:

```powershell
python -m pytest
```

The `mysql_test_engine` fixture creates `pkonek_test`, applies `tests/fixtures/base_schema.sql`, and then applies `migrations/001_person4_resolution.sql`. It reads `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, and `MYSQL_PASSWORD` (defaults: `127.0.0.1`, `3306`, `root`, `root`). The database account needs permission to create the test database and tables. Run an integration test that requests this fixture to verify the migration against MySQL 8.

## Integration and ownership

Read [INTEGRATION.md](INTEGRATION.md) for mount and migration instructions and [BLOCKED.md](BLOCKED.md) for teammate-owned dependencies. All application timestamps are intended to use UTC with MySQL `DATETIME(3)`.

