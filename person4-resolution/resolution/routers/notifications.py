"""Authenticated, ownership-scoped notification endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from ..db import engine
from ..repositories.notifications import list_notifications, mark_all_read, mark_read, unread_count
from ..schemas.notifications import MarkReadResult, NotificationPage, UnreadCount
from ..security import CurrentUser, get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _error(status_code: int, detail: str, code: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"detail": detail, "code": code})


@router.get("", response_model=NotificationPage)
def get_notifications(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                      unread: bool | None = Query(None), user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.connect() as connection:
            items, total = list_notifications(connection, user.id, page, page_size, unread)
        return {"items": items, "total": total, "page": page, "page_size": page_size}
    except Exception as exc:
        raise _error(503, "Notifications are unavailable", "NOTIFICATIONS_UNAVAILABLE") from exc


@router.get("/unread-count", response_model=UnreadCount)
def get_unread_count(user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.connect() as connection:
            return {"count": unread_count(connection, user.id)}
    except Exception as exc:
        raise _error(503, "Notifications are unavailable", "NOTIFICATIONS_UNAVAILABLE") from exc


@router.patch("/{notification_id}/read", response_model=MarkReadResult)
def read_notification(notification_id: int, user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            updated = mark_read(connection, user.id, notification_id)
            if not updated:
                exists = connection.execute(text("SELECT 1 FROM notifications WHERE id=:id AND user_id=:uid"),
                                            {"id": notification_id, "uid": user.id}).first()
                if exists is None:
                    raise _error(404, "Notification not found", "NOTIFICATION_NOT_FOUND")
        return {"updated": int(updated)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _error(503, "Notifications are unavailable", "NOTIFICATIONS_UNAVAILABLE") from exc


@router.patch("/read-all", response_model=MarkReadResult)
def read_all_notifications(user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.begin() as connection:
            updated = mark_all_read(connection, user.id)
        return {"updated": updated}
    except Exception as exc:
        raise _error(503, "Notifications are unavailable", "NOTIFICATIONS_UNAVAILABLE") from exc
