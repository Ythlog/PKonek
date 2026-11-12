"""Duplicate report detection using pin hotspots (ST_Distance_Sphere)."""
from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..db import get_engine
from .location import bounding_box, to_wkt

ACTIVE_STATUSES = ("open", "in_progress")

_DUPLICATE_SQL = text(
    """
    SELECT id, reference_no, title, status, report_count, created_at,
           ST_Distance_Sphere(location, ST_GeomFromText(:wkt, 4326, 'axis-order=long-lat')) AS distance_m
    FROM complaints
    WHERE category_id = :category_id
      AND status IN ('open', 'in_progress')
      AND created_at >= NOW() - INTERVAL :days DAY
      AND latitude  BETWEEN :min_lat AND :max_lat
      AND longitude BETWEEN :min_lng AND :max_lng
    HAVING distance_m <= :radius_m
    ORDER BY distance_m
    LIMIT :limit
    """
)


def find_duplicates(
    db: Session,
    *,
    category_id: int,
    lat: float,
    lng: float,
    settings: Settings | None = None,
    limit: int = 5,
) -> list[dict]:
    settings = settings or get_settings()
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, settings.DUP_RADIUS_M)
    rows = db.execute(
        _DUPLICATE_SQL,
        {
            "wkt": to_wkt(lat, lng),
            "category_id": category_id,
            "days": settings.DUP_WINDOW_DAYS,
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lng": min_lng,
            "max_lng": max_lng,
            "radius_m": settings.DUP_RADIUS_M,
            "limit": limit,
        },
    ).mappings()
    return [
        {
            "id": r["id"],
            "reference_no": r["reference_no"],
            "title": r["title"],
            "status": r["status"],
            "report_count": r["report_count"],
            "created_at": r["created_at"],
            "distance_m": round(float(r["distance_m"]), 1),
        }
        for r in rows
    ]


@contextmanager
def category_lock(category_id: int, settings: Settings | None = None) -> Iterator[None]:
    """MySQL named lock so two near-simultaneous reports can't both pass the check.

    Held on its own connection and released only after the caller has committed,
    so the next request in line always sees the newly inserted complaint.
    """
    settings = settings or get_settings()
    name = f"lumen:dup:{category_id}"
    with get_engine().connect() as conn:
        got = conn.execute(
            text("SELECT GET_LOCK(:name, :timeout)"),
            {"name": name, "timeout": settings.DUP_LOCK_TIMEOUT_S},
        ).scalar()
        if got != 1:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The server is busy processing reports here. Please try again.",
            )
        try:
            yield
        finally:
            conn.execute(text("SELECT RELEASE_LOCK(:name)"), {"name": name})
