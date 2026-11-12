"""Authentication seam. Replace the dev assumptions with Person 2's auth."""

from dataclasses import dataclass
from typing import Callable

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text

from .config import get_settings
from .db import engine
from .constants import USER_ROLES


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: int
    role: str
    department_id: int | None = None


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    x_dev_user_id: str | None = Header(default=None, alias="X-Dev-User-Id"),
    x_dev_role: str | None = Header(default=None, alias="X-Dev-Role"),
) -> CurrentUser:
    settings = get_settings()
    user_id: int | None = None
    role: str | None = None
    if credentials is not None:
        if not settings.jwt_secret:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="JWT secret is not configured")
        try:
            claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            user_id = int(claims["sub"])
            role = str(claims["role"])
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token") from exc
    elif settings.app_env == "dev":
        if x_dev_user_id is None or x_dev_role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        try:
            user_id = int(x_dev_user_id)
            role = x_dev_role
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid development identity") from exc
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    if user_id is None or role not in USER_ROLES:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user claims")
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT department_id FROM official_profiles WHERE user_id = :user_id"),
                {"user_id": user_id},
            ).first()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="User profile lookup unavailable") from exc
    return CurrentUser(id=user_id, role=role, department_id=result[0] if result else None)


def require_roles(*roles: str) -> Callable:
    allowed = frozenset(roles)
    if not allowed <= USER_ROLES:
        raise ValueError("Unknown role in authorization dependency")

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency

