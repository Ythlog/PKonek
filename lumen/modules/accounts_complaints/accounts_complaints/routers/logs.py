"""Read-only views of activity logs and the audit trail (Pasig admin only)."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..models import AccountActivityLog, AuditLog, User
from ..schemas import ActivityLogOut, AuditLogOut, Page

router = APIRouter(prefix="/logs", tags=["logs"], dependencies=[Depends(require_admin)])


def _date_range(column, date_from: date | None, date_to: date | None) -> list:
    conditions = []
    if date_from:
        conditions.append(column >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        conditions.append(column < datetime.combine(date_to, datetime.min.time()) + timedelta(days=1))
    return conditions


def _page(db: Session, model, conditions: list, page: int, page_size: int):
    total = db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    items = db.scalars(
        select(model).where(*conditions)
        .order_by(model.created_at.desc(), model.id.desc())
        .offset((page - 1) * page_size).limit(page_size)
    ).all()
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/activity", response_model=Page[ActivityLogOut])
def activity_logs(
    user_id: int | None = None,
    email: str | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    c = _date_range(AccountActivityLog.created_at, date_from, date_to)
    if user_id is not None:
        c.append(AccountActivityLog.user_id == user_id)
    if email:
        c.append(AccountActivityLog.email == email.strip().lower())
    if action:
        c.append(AccountActivityLog.action == action)
    return _page(db, AccountActivityLog, c, page, page_size)


@router.get("/audit", response_model=Page[AuditLogOut])
def audit_logs(
    actor_user_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    c = _date_range(AuditLog.created_at, date_from, date_to)
    if actor_user_id is not None:
        c.append(AuditLog.actor_user_id == actor_user_id)
    if entity_type:
        c.append(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        c.append(AuditLog.entity_id == entity_id)
    if action:
        c.append(AuditLog.action == action)
    return _page(db, AuditLog, c, page, page_size)
