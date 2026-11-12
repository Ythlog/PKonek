# Lumen module: Accounts and Complaint Records

Standalone FastAPI module for:
- account activity logs and audit tracking
- complaint creation, categories, and filtering
- required location pinning (must be inside Pasig)
- duplicate prevention using pin hotspots (`ST_Distance_Sphere`)

It is **not connected to `apps/api` yet**. It uses the same venv and the same `lumen/.env`.

## 1. Set up the database on Aiven

1. Download the CA certificate from the Aiven console (Service > Overview > CA certificate)
   and save it as `lumen/certs/aiven-ca.pem` (the `certs/` folder is git-ignored).
2. Run `schema.sql` (it creates the 6 tables and seeds the categories, and is safe to rerun):
   - **MySQL Workbench / DBeaver:** connect with SSL using the CA file, open `schema.sql`, execute.
   - **mysql CLI** (from `lumen/`):
     ```
     mysql --host=HOST --port=PORT --user=avnadmin -p --ssl-ca=./certs/aiven-ca.pem defaultdb < modules/accounts_complaints/schema.sql
     ```
3. Create the first Pasig admin (from this folder; the password is prompted):
   ```
   ..\..\apps\api\.venv\Scripts\python.exe -m accounts_complaints.create_admin --email admin@pasig.gov.ph --name "Pasig Admin"
   ```

Tables: `users`, `account_activity_logs`, `audit_logs`, `complaint_categories`, `complaints`, `complaint_supports`.

## 2. Environment (`lumen/.env`)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | | `mysql+pymysql://avnadmin:PASS@HOST:PORT/defaultdb` |
| `DB_SSL_CA` | | `./certs/aiven-ca.pem` (relative to `lumen/`) |
| `JWT_SECRET` | `change-me` | Use 32+ random characters outside local dev |
| `JWT_EXPIRE_MINUTES` | `60` | |
| `DUP_RADIUS_M` | `50` | Duplicate hotspot radius in meters |
| `DUP_WINDOW_DAYS` | `7` | Only reports newer than this count as duplicates |
| `PASIG_MIN_LAT` / `PASIG_MAX_LAT` | `14.53` / `14.62` | Allowed pin area |
| `PASIG_MIN_LNG` / `PASIG_MAX_LNG` | `121.05` / `121.11` | |
| `PUBLIC_RATE_LIMIT_PER_MIN` | `10` | Per IP, public complaint/support posts |

## 3. Run it standalone

From `lumen/modules/accounts_complaints`:
```
..\..\apps\api\.venv\Scripts\python.exe -m uvicorn accounts_complaints.standalone_main:app --reload --port 8001
```
Open http://127.0.0.1:8001/docs. `GET /health/db` confirms the Aiven connection.

## 4. Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Get JWT; logs `login_success` / `login_failed` |
| POST | `/auth/logout` | staff | Logs `logout` (client discards token) |
| GET | `/auth/me` | staff | Current account |
| GET/POST | `/users` | admin | List / create officials and admins |
| GET/PATCH | `/users/{id}` | admin | View / change role, barangay, active, password |
| GET | `/logs/activity` | admin | Activity logs (user, email, action, date range) |
| GET | `/logs/audit` | admin | Audit trail (actor, entity, action, date range) |
| GET | `/categories` | public | Active categories (`include_inactive=true` for staff) |
| POST/PATCH | `/categories[/{id}]` | admin | Create / edit / deactivate |
| POST | `/complaints/check-duplicates` | public | Preview duplicates before submitting |
| POST | `/complaints` | public or staff | File complaint; **409** if duplicate |
| GET | `/complaints` | staff | Filter + paginate (see below) |
| GET | `/complaints/{id}` | public | Detail; reporter info only for staff |
| POST | `/complaints/{id}/support` | public | "+1" an open complaint |
| PATCH | `/complaints/{id}/status` | staff | `open -> in_progress / resolved / rejected`, `in_progress -> resolved / rejected` |

`GET /complaints` filters: `category_id` (repeatable), `status` (repeatable), `barangay`,
`date_from`, `date_to`, `q` (full-text), map box `min_lat,min_lng,max_lat,max_lng` (Leaflet bounds),
`near_lat,near_lng,radius_m`, `mine`, `sort=created_at|report_count|updated_at`, `order`, `page`, `page_size` (max 100).

## 5. Duplicate rule

A new complaint is rejected with **409** when an existing complaint has:
same category, status `open` or `in_progress`, created within `DUP_WINDOW_DAYS`,
and a pin within `DUP_RADIUS_M` meters. The 409 body:
```json
{"detail": {"message": "...", "radius_m": 50, "window_days": 7,
  "candidates": [{"id": 12, "reference_no": "PSG-2026-000012", "distance_m": 18.4, "report_count": 3, ...}]}}
```
The frontend should offer "Support this report" (`POST /complaints/{id}/support`), which raises `report_count`.
A MySQL named lock per category (`GET_LOCK`) stops two simultaneous reports from both getting through.

Points are always written as `ST_GeomFromText('POINT(lng lat)', 4326, 'axis-order=long-lat')`.

## 6. Tests

```
..\..\apps\api\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
..\..\apps\api\.venv\Scripts\python.exe -m pytest -q
```
Database tests are skipped unless `TEST_DATABASE_URL` points to a **separate test database**
with `schema.sql` applied (they create and delete rows).

## 7. Connecting to apps/api later

1. Make the package importable from `apps/api`, either:
   `.venv\Scripts\python.exe -m pip install -e ..\..\modules\accounts_complaints` (from `apps/api`),
   or add `lumen/modules/accounts_complaints` to `PYTHONPATH`.
2. In `apps/api/app/main.py`:
   ```python
   from accounts_complaints import router as accounts_complaints_router
   app.include_router(accounts_complaints_router)
   ```
