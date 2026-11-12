"""Complaint creation, "+1" support, status changes, and filtering."""
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.dialects.mysql import match
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Complaint, ComplaintCategory, ComplaintSupport, User
from ..schemas import ComplaintCreate, StatusUpdate, SupportCreate
from . import audit
from .duplicates import ACTIVE_STATUSES, category_lock, find_duplicates
from .location import haversine_m, to_wkt, validate_pin

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress", "resolved", "rejected"},
    "in_progress": {"resolved", "rejected"},
    "resolved": set(),
    "rejected": set(),
}


def _active_category(db: Session, category_id: int) -> ComplaintCategory:
    category = db.get(ComplaintCategory, category_id)
    if category is None or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unknown or inactive category.",
        )
    return category


def duplicate_conflict(candidates: list[dict]) -> HTTPException:
    settings = get_settings()
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": (
                "A similar report already exists near this location. "
                "Support the existing report instead of filing a new one."
            ),
            "radius_m": settings.DUP_RADIUS_M,
            "window_days": settings.DUP_WINDOW_DAYS,
            "candidates": [
                {**c, "created_at": c["created_at"].isoformat() if c.get("created_at") else None}
                for c in candidates
            ],
        },
    )


def create_complaint(
    db: Session, data: ComplaintCreate, *, actor: User | None, ip_address: str | None
) -> Complaint:
    lat, lng = validate_pin(data.latitude, data.longitude)
    _active_category(db, data.category_id)
    actor_id = actor.id if actor else None

    with category_lock(data.category_id):
        # End any transaction opened before the lock, so the duplicate query
        # reads a fresh snapshot that includes reports committed by the previous lock holder.
        db.commit()

        candidates = find_duplicates(db, category_id=data.category_id, lat=lat, lng=lng)
        if candidates:
            raise duplicate_conflict(candidates)

        complaint = Complaint(
            reference_no=f"TMP-{uuid.uuid4().hex[:16]}",
            category_id=data.category_id,
            title=data.title.strip(),
            description=data.description.strip(),
            status="open",
            latitude=lat,
            longitude=lng,
            location=to_wkt(lat, lng),
            address_text=data.address_text,
            barangay=data.barangay,
            photo_url=data.photo_url,
            reporter_name=data.reporter_name,
            reporter_contact=data.reporter_contact,
            created_by_user_id=actor_id,
            report_count=1,
        )
        try:
            db.add(complaint)
            db.flush()
            complaint.reference_no = f"PSG-{datetime.now(timezone.utc).year}-{complaint.id:06d}"
            db.flush()
            audit.record(
                db,
                actor_user_id=actor_id,
                entity_type="complaint",
                entity_id=complaint.id,
                action="create",
                after=audit.snapshot(complaint),
                ip_address=ip_address,
            )
            db.commit()
        except Exception:
            db.rollback()
            raise

    db.refresh(complaint)
    return complaint


def check_duplicates(db: Session, *, category_id: int, lat: float, lng: float) -> list[dict]:
    lat, lng = validate_pin(lat, lng)
    _active_category(db, category_id)
    return find_duplicates(db, category_id=category_id, lat=lat, lng=lng)


def add_support(
    db: Session, complaint_id: int, data: SupportCreate, *, actor: User | None, ip_address: str | None
) -> Complaint:
    settings = get_settings()
    lat, lng = validate_pin(data.latitude, data.longitude)

    try:
        complaint = db.get(Complaint, complaint_id, with_for_update=True)
        if complaint is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
        if complaint.status not in ACTIVE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This complaint is already closed. File a new report instead.",
            )
        distance = haversine_m(lat, lng, float(complaint.latitude), float(complaint.longitude))
        if distance > settings.DUP_RADIUS_M:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Your pin is {distance:.0f} m away; supports must be within {settings.DUP_RADIUS_M:.0f} m.",
            )
        if data.reporter_contact:
            already = db.scalar(
                select(func.count())
                .select_from(ComplaintSupport)
                .where(
                    ComplaintSupport.complaint_id == complaint_id,
                    ComplaintSupport.reporter_contact == data.reporter_contact,
                )
            )
            if already or complaint.reporter_contact == data.reporter_contact:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You have already reported or supported this complaint.",
                )

        before_count = complaint.report_count
        db.add(
            ComplaintSupport(
                complaint_id=complaint_id,
                reporter_contact=data.reporter_contact,
                note=data.note,
                latitude=lat,
                longitude=lng,
                ip_address=ip_address,
            )
        )
        complaint.report_count = Complaint.report_count + 1  # atomic SQL increment
        db.flush()
        db.refresh(complaint)
        audit.record(
            db,
            actor_user_id=actor.id if actor else None,
            entity_type="complaint",
            entity_id=complaint_id,
            action="support",
            before={"report_count": before_count},
            after={"report_count": complaint.report_count, "distance_m": round(distance, 1)},
            ip_address=ip_address,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return complaint


def get_complaint(db: Session, complaint_id: int) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    return complaint


def change_status(
    db: Session, complaint_id: int, data: StatusUpdate, *, actor: User, ip_address: str | None
) -> Complaint:
    try:
        complaint = db.get(Complaint, complaint_id, with_for_update=True)
        if complaint is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
        current = complaint.status
        if data.status not in ALLOWED_TRANSITIONS[current]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot change status from '{current}' to '{data.status}'.",
            )
        complaint.status = data.status
        if data.status == "resolved":
            complaint.resolved_at = func.now()
        db.flush()
        db.refresh(complaint)
        audit.record(
            db,
            actor_user_id=actor.id,
            entity_type="complaint",
            entity_id=complaint_id,
            action="status_change",
            before={"status": current},
            after={
                "status": complaint.status,
                "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
                "note": data.note,
            },
            ip_address=ip_address,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return complaint


@dataclass
class ComplaintFilters:
    category_id: list[int] | None = None
    status: list[str] | None = None
    barangay: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    q: str | None = None
    min_lat: float | None = None
    min_lng: float | None = None
    max_lat: float | None = None
    max_lng: float | None = None
    near_lat: float | None = None
    near_lng: float | None = None
    radius_m: float | None = None
    created_by_user_id: int | None = None


SORT_COLUMNS = {
    "created_at": Complaint.created_at,
    "report_count": Complaint.report_count,
    "updated_at": Complaint.updated_at,
}


def _apply_filters(stmt: Select, f: ComplaintFilters) -> Select:
    if f.category_id:
        stmt = stmt.where(Complaint.category_id.in_(f.category_id))
    if f.status:
        stmt = stmt.where(Complaint.status.in_(f.status))
    if f.barangay:
        stmt = stmt.where(Complaint.barangay == f.barangay)
    if f.date_from:
        stmt = stmt.where(Complaint.created_at >= datetime.combine(f.date_from, datetime.min.time()))
    if f.date_to:
        end = datetime.combine(f.date_to, datetime.min.time()) + timedelta(days=1)
        stmt = stmt.where(Complaint.created_at < end)
    if f.q:
        stmt = stmt.where(match(Complaint.title, Complaint.description, against=f.q))
    if None not in (f.min_lat, f.min_lng, f.max_lat, f.max_lng):
        stmt = stmt.where(
            Complaint.latitude.between(f.min_lat, f.max_lat),
            Complaint.longitude.between(f.min_lng, f.max_lng),
        )
    if f.near_lat is not None and f.near_lng is not None and f.radius_m:
        point = func.ST_GeomFromText(to_wkt(f.near_lat, f.near_lng), 4326, "axis-order=long-lat")
        stmt = stmt.where(func.ST_Distance_Sphere(Complaint.location, point) <= f.radius_m)
    if f.created_by_user_id is not None:
        stmt = stmt.where(Complaint.created_by_user_id == f.created_by_user_id)
    return stmt


def list_complaints(
    db: Session,
    filters: ComplaintFilters,
    *,
    sort: str = "created_at",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Complaint], int]:
    count_stmt = _apply_filters(select(func.count()).select_from(Complaint), filters)
    total = db.scalar(count_stmt) or 0

    column = SORT_COLUMNS.get(sort, Complaint.created_at)
    ordering = column.asc() if order == "asc" else column.desc()
    stmt = (
        _apply_filters(select(Complaint), filters)
        .order_by(ordering, Complaint.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(stmt)), total
