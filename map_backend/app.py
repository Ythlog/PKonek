"""Map markers and location-clustered hotspot API for complaint records."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Annotated, Literal

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parent.parent
LUMEN_ROOT = PROJECT_ROOT / "lumen"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=LUMEN_ROOT / ".env", extra="ignore")
    DATABASE_URL: str = ""
    DB_SSL_CA: str = ""
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    MAP_GRID_DEGREES: float = 0.005


settings = Settings()
if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured in lumen/.env")

connect_args: dict = {}
if settings.DB_SSL_CA:
    ca_path = Path(settings.DB_SSL_CA)
    if not ca_path.is_absolute():
        ca_path = (LUMEN_ROOT / ca_path).resolve()
    if not ca_path.is_file():
        raise RuntimeError(f"DB_SSL_CA file not found: {ca_path}")
    connect_args["ssl"] = {"ca": str(ca_path)}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
app = FastAPI(title="PKonek Complaint Map API", version="0.1.0")


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def require_staff(authorization: Annotated[str | None, Header()] = None, db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer ") or not settings.JWT_SECRET:
        raise HTTPException(status_code=401, detail="Staff bearer token required")
    try:
        claims = jwt.decode(authorization[7:].strip(), settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(claims["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.execute(text("SELECT role, is_active FROM users WHERE id=:id"), {"id": user_id}).mappings().first()
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Invalid or inactive user")
    if user["role"] not in ("official", "pasig_admin"):
        raise HTTPException(status_code=403, detail="Staff access is required")


def date_filters(date_from: date | None, date_to: date | None):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be on or before date_to")
    start = datetime.combine(date_from, time.min) if date_from else None
    end = datetime.combine(date_to + timedelta(days=1), time.min) if date_to else None
    return start, end


@app.get("/health")
def health():
    return {"status": "ok", "service": "complaint-map"}


@app.get("/map/markers")
def map_markers(
    category_id: int | None = Query(None, gt=0),
    status_filter: Literal["open", "in_progress", "resolved", "rejected"] | None = Query(None, alias="status"),
    barangay: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    min_lat: float | None = Query(None, ge=-90, le=90),
    min_lng: float | None = Query(None, ge=-180, le=180),
    max_lat: float | None = Query(None, ge=-90, le=90),
    max_lng: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    _staff=Depends(require_staff),
):
    box = (min_lat, min_lng, max_lat, max_lng)
    if any(v is not None for v in box) and any(v is None for v in box):
        raise HTTPException(status_code=422, detail="Provide all four map bounds")
    start, end = date_filters(date_from, date_to)
    predicates = ["1=1"]
    params: dict = {"limit": limit}
    for key, column in (("category_id", "category_id"), ("status", "status"), ("barangay", "barangay")):
        value = status_filter if key == "status" else locals()[key]
        if value is not None:
            predicates.append(f"{column} = :{key}")
            params[key] = value
    if start:
        predicates.append("created_at >= :date_from")
        params["date_from"] = start
    if end:
        predicates.append("created_at < :date_to")
        params["date_to"] = end
    if min_lat is not None:
        predicates.extend(("latitude BETWEEN :min_lat AND :max_lat", "longitude BETWEEN :min_lng AND :max_lng"))
        params.update(min_lat=min_lat, max_lat=max_lat, min_lng=min_lng, max_lng=max_lng)
    rows = db.execute(text(f"""
        SELECT id, reference_no, title, category_id, status, latitude, longitude,
               barangay, report_count, created_at
        FROM complaints WHERE {' AND '.join(predicates)}
        ORDER BY created_at DESC LIMIT :limit
    """), params).mappings().all()
    return {"items": [dict(row) for row in rows], "count": len(rows), "limit": limit}


@app.get("/map/hotspots")
def map_hotspots(
    category_id: int | None = Query(None, gt=0),
    status_filter: Literal["open", "in_progress", "resolved", "rejected"] | None = Query(None, alias="status"),
    barangay: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    min_reports: int = Query(3, ge=2, le=100),
    db: Session = Depends(get_db),
    _staff=Depends(require_staff),
):
    start, end = date_filters(date_from, date_to)
    grid = max(0.001, min(float(settings.MAP_GRID_DEGREES), 0.05))
    predicates = ["1=1"]
    params: dict = {"grid": grid, "min_reports": min_reports}
    for key, column in (("category_id", "category_id"), ("status", "status"), ("barangay", "barangay")):
        value = status_filter if key == "status" else locals()[key]
        if value is not None:
            predicates.append(f"{column} = :{key}")
            params[key] = value
    if start:
        predicates.append("created_at >= :date_from")
        params["date_from"] = start
    if end:
        predicates.append("created_at < :date_to")
        params["date_to"] = end
    rows = db.execute(text(f"""
        SELECT FLOOR(latitude / :grid) * :grid AS center_latitude,
               FLOOR(longitude / :grid) * :grid AS center_longitude,
               COUNT(*) AS complaint_count,
               GROUP_CONCAT(DISTINCT category_id ORDER BY category_id) AS category_ids,
               GROUP_CONCAT(DISTINCT barangay ORDER BY barangay SEPARATOR ', ') AS barangays
        FROM complaints WHERE {' AND '.join(predicates)}
        GROUP BY FLOOR(latitude / :grid), FLOOR(longitude / :grid)
        HAVING COUNT(*) >= :min_reports
        ORDER BY complaint_count DESC
        LIMIT 500
    """), params).mappings().all()
    return {
        "gridDegrees": grid,
        "minimumReports": min_reports,
        "items": [dict(row) for row in rows],
        "count": len(rows),
    }
