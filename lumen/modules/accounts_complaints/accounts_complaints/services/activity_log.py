"""Account activity logging (logins, logouts, account changes)."""
from sqlalchemy.orm import Session

from ..models import AccountActivityLog

LOGIN_SUCCESS = "login_success"
LOGIN_FAILED = "login_failed"
LOGOUT = "logout"
ACCOUNT_CREATED = "account_created"
ROLE_CHANGED = "role_changed"
DEACTIVATED = "deactivated"
REACTIVATED = "reactivated"
PASSWORD_CHANGED = "password_changed"


def record(
    db: Session,
    action: str,
    *,
    user_id: int | None = None,
    email: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict | None = None,
) -> AccountActivityLog:
    """Adds a log row to the session. The caller commits (same transaction as the change)."""
    entry = AccountActivityLog(
        user_id=user_id,
        email=email[:255] if email else None,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )
    db.add(entry)
    return entry
