"""Login, logout, and current user. Every attempt is written to account_activity_logs."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import client_ip, get_current_user, login_limiter, user_agent
from ..models import User
from ..schemas import CitizenRegistration, LoginRequest, TokenResponse, UserOut
from ..security import create_access_token, hash_password, verify_dummy, verify_password
from ..services import activity_log

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_citizen(body: CitizenRegistration, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role="citizen",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(login_limiter)])
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    ip, ua = client_ip(request), user_agent(request)
    # Emails are stored lowercase and the column collation is case-insensitive.
    user = db.scalar(select(User).where(User.email == email))

    if user is None:
        verify_dummy(body.password)
        ok, reason = False, "unknown_email"
    elif not verify_password(body.password, user.password_hash):
        ok, reason = False, "wrong_password"
    elif not user.is_active:
        ok, reason = False, "inactive_account"
    else:
        ok, reason = True, None

    if not ok:
        activity_log.record(
            db,
            activity_log.LOGIN_FAILED,
            user_id=user.id if user else None,
            email=email,
            ip_address=ip,
            user_agent=ua,
            details={"reason": reason},
        )
        db.commit()
        # Same message for every failure so emails can't be probed.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user.last_login_at = func.now()
    activity_log.record(
        db, activity_log.LOGIN_SUCCESS, user_id=user.id, email=user.email, ip_address=ip, user_agent=ua
    )
    db.commit()

    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        role=user.role,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """JWTs are stateless; the client discards the token. This records the logout."""
    activity_log.record(
        db,
        activity_log.LOGOUT,
        user_id=user.id,
        email=user.email,
        ip_address=client_ip(request),
        user_agent=user_agent(request),
    )
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.refresh(user)
    return user
