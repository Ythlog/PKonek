"""Complaint categories. Public list; Pasig admin creates/edits (audited)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import client_ip, get_optional_user, require_admin
from ..models import ComplaintCategory, User
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate
from ..services import audit

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    include_inactive: bool = False,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    stmt = select(ComplaintCategory).order_by(ComplaintCategory.name)
    # Only staff may see inactive categories.
    if not (include_inactive and user is not None):
        stmt = stmt.where(ComplaintCategory.is_active.is_(True))
    return db.scalars(stmt).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate, request: Request,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    if db.scalar(select(ComplaintCategory.id).where(ComplaintCategory.code == body.code)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category code already exists")
    category = ComplaintCategory(code=body.code, name=body.name.strip(), description=body.description, is_active=True)
    db.add(category)
    db.flush()
    audit.record(
        db, actor_user_id=admin.id, entity_type="category", entity_id=category.id,
        action="create", after=audit.snapshot(category), ip_address=client_ip(request),
    )
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, body: CategoryUpdate, request: Request,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    category = db.get(ComplaintCategory, category_id, with_for_update=True)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    before = audit.snapshot(category)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.flush()
    before_diff, after_diff = audit.diff(before, audit.snapshot(category))
    if after_diff:
        audit.record(
            db, actor_user_id=admin.id, entity_type="category", entity_id=category.id,
            action="update", before=before_diff, after=after_diff, ip_address=client_ip(request),
        )
    db.commit()
    db.refresh(category)
    return category
