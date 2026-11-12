"""Complaint timeline endpoint with role and ownership visibility rules."""
from fastapi import APIRouter, Depends, HTTPException

from ..db import engine
from ..repositories.timeline import complaint_owner, timeline_items
from ..schemas.timeline import TimelineItem
from ..security import CurrentUser, get_current_user

router = APIRouter(tags=["timeline"])


@router.get("/complaints/{complaint_id}/timeline", response_model=list[TimelineItem])
def get_complaint_timeline(complaint_id: int, user: CurrentUser = Depends(get_current_user)):
    try:
        with engine.connect() as connection:
            owner_id = complaint_owner(connection, complaint_id)
            if owner_id is None:
                raise HTTPException(404, {"detail": "Complaint not found", "code": "COMPLAINT_NOT_FOUND"})
            public_only = user.role == "citizen"
            if public_only and user.id != owner_id:
                raise HTTPException(403, {"detail": "You may only view your own complaint timeline", "code": "FORBIDDEN_COMPLAINT"})
            return timeline_items(connection, complaint_id, public_only=public_only)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, {"detail": "Timeline is unavailable", "code": "TIMELINE_UNAVAILABLE"}) from exc
