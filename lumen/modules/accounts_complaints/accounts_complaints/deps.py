"""FastAPI dependencies: auth, roles, request info, rate limiting."""
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User
from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return request.client.host[:45] if request.client else None


def user_agent(request: Request) -> str | None:
    ua = request.headers.get("user-agent")
    return ua[:255] if ua else None


def _user_from_token(token: str, db: Session) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _user_from_token(creds.credentials, db)


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Public endpoints: anonymous is fine, but a bad token is still rejected."""
    if creds is None:
        return None
    return _user_from_token(creds.credentials, db)


def require_role(*roles: str) -> Callable[..., User]:
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker


require_admin = require_role("pasig_admin")
require_staff = require_role("official", "pasig_admin")


class RateLimiter:
    """Simple in-memory sliding window per IP. Per process only; fine for a single API instance."""

    def __init__(self, limit_per_minute: int | None = None, scope: str = "default"):
        self._limit = limit_per_minute
        self.scope = scope
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @property
    def limit(self) -> int:
        return self._limit if self._limit is not None else get_settings().PUBLIC_RATE_LIMIT_PER_MIN

    def hit(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        with self._lock:
            window = self._hits[key]
            while window and now - window[0] >= 60:
                window.popleft()
            if len(window) >= self.limit:
                return False
            window.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def __call__(self, request: Request) -> None:
        key = client_ip(request) or "unknown"
        if not self.hit(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please try again in a minute",
            )


create_complaint_limiter = RateLimiter(scope="create_complaint")
support_limiter = RateLimiter(scope="support")
dup_check_limiter = RateLimiter(limit_per_minute=30, scope="dup_check")
login_limiter = RateLimiter(limit_per_minute=10, scope="login")
