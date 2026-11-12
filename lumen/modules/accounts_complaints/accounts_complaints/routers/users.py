"""Account management (Pasig admin only). Changes are audited and activity-logged."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import client_ip, require_admin, user_agent
from ..models import User
from ..schemas import Page, Role, UserCreate, UserOut, UserUpdate
from ..security import hash_password
from ..services import activity_log, audit

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=Page[UserOut])
def list_users(
    role: Role | None = None,
    is_active: bool | None = None,
    q: str | None = Query(default=None, max_length=100, description="Search name or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    conditions = []
    if role:
        conditions.append(User.role == role)
    if is_active is not None:
        conditions.append(User.is_active == is_active)
    if q:
        like = f"%{q}%"
        conditions.append(User.full_name.like(like) | User.email.like(like))
    total = db.scalar(select(func.count()).select_from(User).where(*conditions)) or 0
    items = db.scalars(
        select(User).where(*conditions).order_by(User.id).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    ip = client_ip(request)
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role=body.role,
        barangay=body.barangay,
        is_active=True,
    )
    db.add(user)
    db.flush()
    audit.record(
        db, actor_user_id=admin.id, entity_type="user", entity_id=user.id,
        action="create", after=audit.snapshot(user), ip_address=ip,
    )
    activity_log.record(
        db, activity_log.ACCOUNT_CREATED, user_id=user.id, email=user.email, ip_address=ip,
        user_agent=user_agent(request), details={"by_user_id": admin.id, "role": user.role},
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id, with_for_update=True)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    changes = body.model_dump(exclude_unset=True)
    # Only barangay may be cleared with null; ignore nulls for required columns.
    changes = {k: v for k, v in changes.items() if v is not None or k == "barangay"}
    if user.id == admin.id and (changes.get("is_active") is False or changes.get("role", "pasig_admin") != "pasig_admin"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot demote or deactivate yourself")

    ip, ua = client_ip(request), user_agent(request)
    before = audit.snapshot(user)
    old_role, old_active = user.role, user.is_active

    password = changes.pop("password", None)
    for field, value in changes.items():
        setattr(user, field, value)
    if password:
        user.password_hash = hash_password(password)
    db.flush()

    after = audit.snapshot(user)
    before_diff, after_diff = audit.diff(before, after)
    if password:
        after_diff["password"] = "changed"  # never store the hash
    if before_diff or after_diff:
        audit.record(
            db, actor_user_id=admin.id, entity_type="user", entity_id=user.id,
            action="update", before=before_diff, after=after_diff, ip_address=ip,
        )

    common = {"user_id": user.id, "email": user.email, "ip_address": ip, "user_agent": ua}
    if user.role != old_role:
        activity_log.record(db, activity_log.ROLE_CHANGED, **common,
                            details={"from": old_role, "to": user.role, "by_user_id": admin.id})
    if user.is_active != old_active:
        action = activity_log.REACTIVATED if user.is_active else activity_log.DEACTIVATED
        activity_log.record(db, action, **common, details={"by_user_id": admin.id})
    if password:
        activity_log.record(db, activity_log.PASSWORD_CHANGED, **common, details={"by_user_id": admin.id})

    db.commit()
    db.refresh(user)
    return user
