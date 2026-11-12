"""Complaint creation (required pin + duplicate prevention), filtering, support, status."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import (
    client_ip,
    create_complaint_limiter,
    dup_check_limiter,
    get_optional_user,
    require_staff,
    support_limiter,
)
from ..models import User
from ..schemas import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintStaffOut,
    ComplaintStatus,
    DuplicateCandidate,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    Page,
    StatusUpdate,
    SupportCreate,
)
from ..services import complaints as service

router = APIRouter(prefix="/complaints", tags=["complaints"])

DUPLICATE_409 = {
    409: {
        "description": "A matching open complaint exists nearby. `detail.candidates` lists them; "
        "call POST /complaints/{id}/support instead."
    }
}


def _out(complaint, user: User | None):
    schema = ComplaintStaffOut if user is not None else ComplaintOut
    return schema.model_validate(complaint)


@router.post(
    "/check-duplicates",
    response_model=DuplicateCheckResponse,
    dependencies=[Depends(dup_check_limiter)],
    summary="Preview: are there open reports of this category near this pin?",
)
def check_duplicates(body: DuplicateCheckRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    candidates = service.check_duplicates(
        db, category_id=body.category_id, lat=body.latitude, lng=body.longitude
    )
    return DuplicateCheckResponse(
        is_duplicate=bool(candidates),
        radius_m=settings.DUP_RADIUS_M,
        window_days=settings.DUP_WINDOW_DAYS,
        candidates=[DuplicateCandidate(**c) for c in candidates],
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ComplaintStaffOut | ComplaintOut,
    responses=DUPLICATE_409,
    dependencies=[Depends(create_complaint_limiter)],
    summary="File a complaint (public, or official with a token). Location pin is required.",
)
def create_complaint(
    body: ComplaintCreate,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    complaint = service.create_complaint(db, body, actor=user, ip_address=client_ip(request))
    return _out(complaint, user)


@router.get("", response_model=Page[ComplaintStaffOut], summary="List and filter complaints (staff)")
def list_complaints(
    category_id: list[int] | None = Query(default=None),
    status_: list[ComplaintStatus] | None = Query(default=None, alias="status"),
    barangay: str | None = Query(default=None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = Query(default=None, min_length=2, max_length=200, description="Full-text search"),
    min_lat: float | None = Query(default=None, ge=-90, le=90),
    min_lng: float | None = Query(default=None, ge=-180, le=180),
    max_lat: float | None = Query(default=None, ge=-90, le=90),
    max_lng: float | None = Query(default=None, ge=-180, le=180),
    near_lat: float | None = Query(default=None, ge=-90, le=90),
    near_lng: float | None = Query(default=None, ge=-180, le=180),
    radius_m: float | None = Query(default=None, gt=0, le=20000),
    mine: bool = Query(default=False, description="Only complaints I filed"),
    sort: Literal["created_at", "report_count", "updated_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    bbox = (min_lat, min_lng, max_lat, max_lng)
    if any(v is not None for v in bbox) and any(v is None for v in bbox):
        raise HTTPException(status_code=400, detail="Provide all of min_lat, min_lng, max_lat, max_lng.")
    near = (near_lat, near_lng, radius_m)
    if any(v is not None for v in near) and any(v is None for v in near):
        raise HTTPException(status_code=400, detail="Provide all of near_lat, near_lng, radius_m.")
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be on or before date_to.")

    filters = service.ComplaintFilters(
        category_id=category_id, status=status_, barangay=barangay,
        date_from=date_from, date_to=date_to, q=q,
        min_lat=min_lat, min_lng=min_lng, max_lat=max_lat, max_lng=max_lng,
        near_lat=near_lat, near_lng=near_lng, radius_m=radius_m,
        created_by_user_id=user.id if mine else None,
    )
    items, total = service.list_complaints(
        db, filters, sort=sort, order=order, page=page, page_size=page_size
    )
    return Page(
        items=[ComplaintStaffOut.model_validate(c) for c in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{complaint_id}", response_model=ComplaintStaffOut | ComplaintOut,
            summary="Complaint detail (reporter details only for staff)")
def get_complaint(
    complaint_id: int,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return _out(service.get_complaint(db, complaint_id), user)


@router.post(
    "/{complaint_id}/support",
    response_model=ComplaintStaffOut | ComplaintOut,
    dependencies=[Depends(support_limiter)],
    summary='"+1" an existing open complaint instead of filing a duplicate',
)
def support_complaint(
    complaint_id: int,
    body: SupportCreate,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    complaint = service.add_support(db, complaint_id, body, actor=user, ip_address=client_ip(request))
    return _out(complaint, user)


@router.patch("/{complaint_id}/status", response_model=ComplaintStaffOut, summary="Change status (staff)")
def update_status(
    complaint_id: int,
    body: StatusUpdate,
    request: Request,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    complaint = service.change_status(db, complaint_id, body, actor=user, ip_address=client_ip(request))
    return ComplaintStaffOut.model_validate(complaint)
